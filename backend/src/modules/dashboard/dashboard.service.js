const prisma = require("../../config/database");
const { Prisma } = require("@prisma/client");

/**
 * Lấy thống kê tổng quan cho Dashboard Admin.
 *
 * Trả về cấu trúc lồng nhau để dễ mở rộng:
 *   - users:        { total, byRole: { STUDENT, TEACHER, ADMIN } }
 *   - notifications:{ total }
 *   - files:        { total }
 *   - auditLogs:    { total }
 *
 * Khi sau này thêm model (Course/Class/Lead) chỉ cần thêm 1 phép count()
 * và 1 key trong object trả về — KHÔNG phá response cũ.
 *
 * Dùng Promise.all để chạy 7 truy vấn song song thay vì tuần tự.
 */
async function getOverview() {
  const [
    totalUsers,
    totalStudents,
    totalTeachers,
    totalAdmins,
    totalNotifications,
    totalFiles,
    totalAuditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.notification.count(),
    prisma.uploadFile.count(),
    prisma.auditLog.count(),
  ]);

  return {
    users: {
      total: totalUsers,
      byRole: {
        STUDENT: totalStudents,
        TEACHER: totalTeachers,
        ADMIN: totalAdmins,
      },
    },
    notifications: { total: totalNotifications },
    files: { total: totalFiles },
    auditLogs: { total: totalAuditLogs },
  };
}

/**
 * Thống kê time-series theo tháng cho Dashboard Admin.
 *
 * Trả về 3 mảng đếm cho 3 model (User/UploadFile/Notification), trong cùng
 * khoảng `months` tháng gần nhất. Mảng luôn đủ `months` phần tử — tháng không
 * có dữ liệu điền 0, không bỏ qua.
 *
 * - Users: bảng "User" (PascalCase — User model không có @@map).
 * - Files: bảng "upload_files" (snake_case từ @@map).
 * - Notifications: bảng "notifications" (snake_case từ @@map).
 *
 * Soft-delete: filter `"deletedAt" IS NULL` giống cách prisma client extended
 * auto-filter trên 3 model. Trả về đúng "user/file/notification chưa xoá".
 *
 * @param {Object} [opts]
 * @param {number} [opts.months=6] - Số tháng gần nhất (clamped [1, 12]).
 * @returns {Promise<{
 *   months: string[],          // ["2026-02","2026-03",...]
 *   users: number[],
 *   files: number[],
 *   notifications: number[],
 *   generatedAt: string,
 *   range: { from: string, to: string }
 * }>}
 */
async function getMonthlyStats({ months = 6 } = {}) {
  const safeMonths = Number.isFinite(months)
    ? Math.max(1, Math.min(12, Math.floor(months)))
    : 6;
  const offsetMonths = safeMonths - 1;
  const monthList = buildRecentMonths(safeMonths);

  // 3 raw song song — mỗi query chỉ scan khoảng N tháng nhờ index createdAt.
  const intervalLiteral = Prisma.raw(`'${offsetMonths} months'`);
  const intervalNext = Prisma.raw(`'1 month'`);

  const [usersRaw, filesRaw, notifsRaw] = await Promise.all([
    runMonthlyCount('"User"', intervalLiteral, intervalNext),
    runMonthlyCount('"upload_files"', intervalLiteral, intervalNext),
    runMonthlyCount('"notifications"', intervalLiteral, intervalNext),
  ]);

  return {
    months: monthList,
    users: fillMonths(usersRaw, monthList),
    files: fillMonths(filesRaw, monthList),
    notifications: fillMonths(notifsRaw, monthList),
    generatedAt: new Date().toISOString(),
    range: {
      from: monthList[0],
      to: monthList[monthList.length - 1],
    },
  };
}

/**
 * Count row theo tháng `createdAt` trong khoảng (offsetMonths ago → next month).
 * Bảng phải có cột `createdAt` + `deletedAt`. Mọi model ở đây đều có.
 *
 * @param {string} quotedTableName - Tên bảng đã quote, vd: '"User"', '"upload_files"'
 * @param {ReturnType<typeof Prisma.raw>} intervalAgo
 * @param {ReturnType<typeof Prisma.raw>} intervalNext
 */
async function runMonthlyCount(quotedTableName, intervalAgo, intervalNext) {
  const query = Prisma.sql`
    SELECT
      to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month,
      COUNT(*)::int AS cnt
    FROM ${Prisma.raw(quotedTableName)}
    WHERE "createdAt" >= date_trunc('month', NOW() - INTERVAL ${intervalAgo})
      AND "createdAt" <  date_trunc('month', NOW() + INTERVAL ${intervalNext})
      AND "deletedAt" IS NULL
    GROUP BY 1
    ORDER BY 1
  `;
  return prisma.$queryRaw(query);
}

/**
 * Sinh danh sách `months` tháng gần nhất từ tháng hiện tại,
 * định dạng "YYYY-MM", end-inclusive.
 */
function buildRecentMonths(months) {
  const list = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    list.push(`${d.getUTCFullYear()}-${m}`);
  }
  return list;
}

/**
 * Map rows [{month, cnt}] thành mảng number đúng thứ tự monthList,
 * mọi tháng thiếu điền 0.
 */
function fillMonths(rows, monthList) {
  const map = new Map();
  for (const r of rows) {
    const cnt = typeof r.cnt === "number" ? r.cnt : Number(r.cnt);
    map.set(r.month, Number.isFinite(cnt) ? cnt : 0);
  }
  return monthList.map((m) => (map.has(m) ? map.get(m) : 0));
}

module.exports = { getOverview, getMonthlyStats };
