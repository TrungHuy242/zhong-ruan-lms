const prisma = require("../../config/database");

/**
 * Ghi 1 dòng audit log.
 *
 * @param {Object} params
 * @param {number|null} [params.userId]      - ID user thực hiện (null nếu chưa đăng nhập / lỗi)
 * @param {string}      params.action         - Mã hành động, VD: "AUTH_LOGIN_SUCCESS"
 * @param {string}      [params.target]       - Đối tượng bị tác động, VD: "User:13"
 * @param {Object}      [params.meta]         - Dữ liệu phụ tuỳ action (sẽ lưu vào cột JSON)
 * @param {string}      [params.ip]           - IP client
 * @param {string}      [params.userAgent]    - User-Agent client
 *
 * Hàm này KHÔNG throw ra ngoài — nếu ghi log lỗi, chỉ in console để không làm vỡ request.
 */
async function log({ userId = null, action, target = null, meta = null, ip = null, userAgent = null }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        target,
        meta: meta ?? undefined,
        ip,
        userAgent,
      },
    });
  } catch (err) {
    // Không để lỗi audit làm crash request chính
    // eslint-disable-next-line no-console
    console.error("[AuditLog] write failed:", err && err.message ? err.message : err);
  }
}

/**
 * Trích IP + User-Agent từ Express request, an toàn khi thiếu header.
 */
function extractRequestMeta(req) {
  const ip =
    (req.headers && (req.headers["x-forwarded-for"] || req.headers["x-real-ip"])) ||
    (req.ip || null);
  const userAgent = req.headers && req.headers["user-agent"] ? req.headers["user-agent"] : null;
  return {
    ip: typeof ip === "string" ? ip.split(",")[0].trim() : null,
    userAgent,
  };
}

/**
 * Helper tiện: logEntry(req, { userId, action, target, meta })
 * Tự động lấy ip + userAgent từ req.
 */
async function logFromRequest(req, { userId = null, action, target = null, meta = null }) {
  const { ip, userAgent } = extractRequestMeta(req);
  return log({ userId, action, target, meta, ip, userAgent });
}

/**
 * Lấy danh sách audit log cho admin.
 * Hỗ trợ filter: userId, action, từ ngày -> đến ngày, phân trang.
 */
async function listLogs({
  userId = null,
  action = null,
  from = null,
  to = null,
  page = 1,
  pageSize = 20,
} = {}) {
  const where = {};
  if (userId) where.userId = Number(userId);
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(pageSize));
  const take = Math.min(100, Math.max(1, Number(pageSize)));

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        user: { select: { id: true, email: true, fullName: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: Math.max(1, Number(page)),
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take),
    },
  };
}

module.exports = {
  log,
  logFromRequest,
  extractRequestMeta,
  listLogs,
};