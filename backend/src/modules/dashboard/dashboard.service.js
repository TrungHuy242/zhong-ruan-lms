const prisma = require("../../config/database");

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

module.exports = { getOverview };