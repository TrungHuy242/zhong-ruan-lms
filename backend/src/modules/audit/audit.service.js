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

// ===== Helpers dùng cho API =====
const ACTOR_SELECT = { id: true, email: true, fullName: true, role: true };

/**
 * Danh sách các field nhạy cảm cần redact khỏi `meta` trước khi trả ra FE.
 * Áp dụng cả cho list lẫn detail — module audit không có endpoint write,
 * nên redaction sống tập trung tại đây.
 */
const REDACT_KEYS = new Set([
  "password",
  "passwordHash",
  "oldPassword",
  "newPassword",
  "refreshToken",
  "refreshTokenHash",
  "resetToken",
  "resetTokenExpiresAt",
]);
const REDACTED_VALUE = "[REDACTED]";

function redactValue(key, value) {
  if (REDACT_KEYS.has(key)) return REDACTED_VALUE;
  return value;
}

function redactMeta(meta) {
  if (meta === null || meta === undefined) return meta;
  if (Array.isArray(meta)) return meta.map((v) => redactMeta(v));
  if (typeof meta === "object") {
    const out = {};
    for (const [k, v] of Object.entries(meta)) {
      out[k] = v !== null && typeof v === "object" ? redactMeta(v) : redactValue(k, v);
    }
    return out;
  }
  return meta;
}

function redactLog(log) {
  if (!log) return log;
  return { ...log, meta: redactMeta(log.meta) };
}

/**
 * Lấy danh sách audit log cho admin.
 *
 * Filter hỗ trợ:
 *   - userId:  number
 *   - action:  string (exact match)
 *   - module:  string (match với prefix của `target`, VD module="User" → "User:13")
 *   - from/to: ISO date string, inclusive
 *   - search:  keyword — search trong user.email, user.fullName, action, target, ip, userAgent.
 *              (Prisma không cho `string_contains` portable trên cột Json nên ta
 *               không search trong `meta` ở BE; FE có thể search text khi mở detail.)
 *   - page, pageSize: phân trang (pageSize tối đa 100 để tránh OOM)
 *
 * Sort mặc định: createdAt desc (mới nhất trước) — đúng yêu cầu.
 */
async function listLogs({
  userId = null,
  action = null,
  module: moduleName = null,
  from = null,
  to = null,
  search = null,
  page = 1,
  pageSize = 20,
} = {}) {
  const andClauses = [];

  if (userId) andClauses.push({ userId: Number(userId) });
  if (action) andClauses.push({ action: action });
  if (from || to) {
    const range = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(to);
    andClauses.push({ createdAt: range });
  }
  if (moduleName) {
    // target có dạng "<Module>:<id>" — dùng startsWith là đủ cho các module hiện có
    // (User, Auth, UploadFile, Notification). Không phân biệt hoa thường.
    andClauses.push({ target: { startsWith: `${moduleName}:` } });
  }
  if (search && String(search).trim() !== "") {
    const q = String(search).trim();
    const orClauses = [
      { action: { contains: q, mode: "insensitive" } },
      { target: { contains: q, mode: "insensitive" } },
      { ip: { contains: q, mode: "insensitive" } },
      { userAgent: { contains: q, mode: "insensitive" } },
      // user.email / user.fullName — dùng relation filter
      { user: { is: { email: { contains: q, mode: "insensitive" } } } },
      { user: { is: { fullName: { contains: q, mode: "insensitive" } } } },
    ];
    andClauses.push({ OR: orClauses });
  }

  const where = andClauses.length === 0 ? {} : { AND: andClauses };

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const skip = (safePage - 1) * safePageSize;
  const take = safePageSize;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        user: { select: ACTOR_SELECT },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map(redactLog),
    pagination: {
      page: safePage,
      pageSize: take,
      total,
      totalPages: Math.max(1, Math.ceil(total / take)),
    },
  };
}

/**
 * Lấy chi tiết 1 audit log theo id. Trả `null` nếu không tồn tại.
 * `meta` được redact như list.
 */
async function getLogById(id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  const log = await prisma.auditLog.findUnique({
    where: { id: numericId },
    include: {
      user: { select: ACTOR_SELECT },
    },
  });
  return redactLog(log);
}

module.exports = {
  log,
  logFromRequest,
  extractRequestMeta,
  listLogs,
  getLogById,
  // Export `redactMeta` cho test đơn vị. Không nên gọi từ controller —
  // redaction phải đi qua `listLogs` / `getLogById` để đảm bảo không lộ data thô.
  _internal: { redactMeta },
};
