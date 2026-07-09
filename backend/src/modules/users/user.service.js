const bcrypt = require("bcrypt");
const { Role, UserStatus } = require("@prisma/client");
const userRepository = require("./user.repository");
const audit = require("../audit/audit.service");
const { softDelete, restore, forceDelete } = require("../../utils/softDelete");
const { notDeletedWhere, parseFlags } = require("../../utils/softQuery");
const prisma = require("../../config/database");

const STATUS_MAP = {
  active: UserStatus.ACTIVE,
  inactive: UserStatus.INACTIVE,
  locked: UserStatus.SUSPENDED,
};

/** Map sortBy FE đưa lên → field Prisma (whitelist chống SQL injection qua Prisma). */
const SORTABLE_FIELDS = {
  fullName: "fullName",
  email: "email",
  role: "role",
  status: "status",
  createdAt: "createdAt",
};

/**
 * Lấy danh sách user có phân trang + filter + sort thật ở server (Prisma skip/take).
 *
 * Query params (tất cả optional):
 *   - page       (default 1)
 *   - limit      (default 10; cho phép 10/20/50)
 *   - keyword    (alias của `search`, tìm cả tên + email — để tương thích ngược FE hiện tại)
 *   - search     (giữ nguyên từ contract cũ)
 *   - name       (tìm riêng theo fullName)
 *   - email      (tìm riêng theo email)
 *   - role       (ADMIN/TEACHER/STUDENT — filter enum)
 *   - status     (ACTIVE/INACTIVE/SUSPENDED — filter enum)
 *   - sortBy     (fullName/email/role/status/createdAt; default createdAt)
 *   - sortOrder  (asc/desc; default desc)
 *   - includeDeleted / onlyDeleted (giữ nguyên từ softQuery.js)
 *
 * @returns {Promise<{users: User[], pagination: {page,limit,total,totalPages}}>}
 */
async function getAllUsers(query = {}) {
  const flags = parseFlags(query);

  // ===== Page / limit =====
  const ALLOWED_LIMITS = [10, 20, 50];
  const rawLimit = Number(query.limit);
  const limit = ALLOWED_LIMITS.includes(rawLimit) ? rawLimit : 10;
  const page = Math.max(1, Number(query.page) || 1);
  const skip = (page - 1) * limit;

  // ===== Build where =====
  const where = notDeletedWhere({}, flags);

  // `keyword` hoặc `search` (alias nhau — FE đang gửi `search`, đề bài chuẩn hoá `keyword`)
  const keyword = (query.keyword ?? query.search ?? "").toString().trim();
  if (keyword) {
    where.OR = [
      { fullName: { contains: keyword, mode: "insensitive" } },
      { email: { contains: keyword, mode: "insensitive" } },
    ];
  }
  // `name`/`email` riêng (ưu tiên cao hơn keyword nếu cả 2 cùng có)
  if (query.name) {
    where.fullName = { contains: String(query.name), mode: "insensitive" };
  }
  if (query.email) {
    where.email = { contains: String(query.email), mode: "insensitive" };
  }

  // role: enum Role
  if (query.role && Object.values(Role).includes(query.role)) {
    where.role = query.role;
  }
  // status: nhận cả lowercase ("active") lẫn uppercase ("ACTIVE") để tương thích
  if (query.status) {
    const upper = String(query.status).toUpperCase();
    if (Object.values(UserStatus).includes(upper)) {
      where.status = upper;
    }
  }

  // ===== Sort =====
  const sortBy = SORTABLE_FIELDS[query.sortBy] ? query.sortBy : "createdAt";
  const sortOrder = String(query.sortOrder).toLowerCase() === "asc" ? "asc" : "desc";
  const orderBy = { [sortBy]: sortOrder };

  // ===== Query Prisma =====
  const { items, total } = await userRepository.findUsersPaginated({
    where,
    orderBy,
    skip,
    take: limit,
  });

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    users: items,
    pagination: { page, limit, total, totalPages },
  };
}

async function createUser(payload, req) {
  const { fullName, email, phone, password, role } = payload;

  if (!fullName || !email || !password || !role) {
    throw new Error("Vui lòng nhập đầy đủ họ tên, email, mật khẩu và vai trò");
  }

  const allowedRoles = Object.values(Role);

  if (!allowedRoles.includes(role)) {
    throw new Error("Vai trò không hợp lệ");
  }

  const existedUser = await userRepository.findUserByEmail(email);

  if (existedUser) {
    throw new Error("Email đã tồn tại");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await userRepository.createUser({
    fullName,
    email,
    phone: phone || null,
    passwordHash,
    role: Role[role],
    status: UserStatus.ACTIVE,
  });
  await audit.log({ userId: req.user.id, action: "ADMIN_USER_CREATED", target: `User:${newUser.id}`, meta: { email: newUser.email, role: newUser.role }, ip: req && req.ip, userAgent: req && req.headers && req.headers["user-agent"] });
  return newUser;
}

async function getUserById(id) {
  const user = await userRepository.findUserById(id);

  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  return user;
}

async function updateUser(id, payload, req) {
  const { fullName, email, phone, role, status } = payload;

  const currentUser = await userRepository.findUserById(id);

  if (!currentUser) {
    throw new Error("Không tìm thấy người dùng");
  }

  const allowedRoles = Object.values(Role);

  if (role && !allowedRoles.includes(role)) {
    throw new Error("Vai trò không hợp lệ");
  }

  const allowedStatuses = Object.keys(STATUS_MAP);

  if (status && !allowedStatuses.includes(status)) {
    throw new Error("Trạng thái không hợp lệ");
  }

  if (email && email !== currentUser.email) {
    const existedUser = await userRepository.findUserByEmail(email);

    if (existedUser) {
      throw new Error("Email đã tồn tại");
    }
  }

  const updateUser = await userRepository.updateUser(id, {
    fullName,
    email,
    phone,
    role: role ? Role[role] : undefined,
    status: status ? STATUS_MAP[status] : undefined,
  });
  await audit.log({ userId: req.user.id, action: "ADMIN_USER_UPDATED", target: `User:${updateUser.id}`, meta: { changes: payload }, ip: req && req.ip, userAgent: req && req.headers && req.headers["user-agent"] });
  return updateUser;
}

async function deleteUser(id, currentUserId, req) {
  const numericId = Number(id);
  if (numericId === currentUserId) {
    throw new Error("Bạn không thể tự xóa tài khoản của mình");
  }

  const user = await userRepository.findUserByIdIncludeDeleted(numericId);
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  if (user.deletedAt) {
    return { id: user.id, email: user.email, deletedAt: user.deletedAt, alreadyDeleted: true };
  }

  const deleted = await softDelete(
    "User",
    { id: numericId },
    { req, userId: currentUserId }
  );

  if (!deleted) {
    throw new Error("Không tìm thấy người dùng");
  }

  return { id: deleted.id, email: deleted.email, deletedAt: deleted.deletedAt };
}

/**
 * Khôi phục user đã bị soft-delete.
 * Chỉ Admin được dùng. Idempotent — nếu user chưa xóa thì trả về luôn.
 */
async function restoreUser(id, currentUserId, req) {
  const numericId = Number(id);

  const user = await userRepository.findUserByIdIncludeDeleted(numericId);
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  // Restore có thể vượt qua kiểm tra "tự xóa" — vì đây là hành động khôi phục
  const restored = await restore(
    "User",
    { id: numericId },
    { req, userId: currentUserId }
  );

  if (!restored) {
    throw new Error("Không thể khôi phục người dùng");
  }

  return { id: restored.id, email: restored.email, deletedAt: restored.deletedAt };
}

/**
 * Xóa cứng user khỏi database.
 * ⚠️ Chỉ Admin được dùng. Nếu user là chủ sở hữu tài nguyên khác, sẽ fail do FK.
 */
async function forceDeleteUser(id, currentUserId, req) {
  const numericId = Number(id);
  if (numericId === currentUserId) {
    throw new Error("Bạn không thể tự xóa cứng tài khoản của mình");
  }

  const user = await userRepository.findUserByIdIncludeDeleted(numericId);
  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  try {
    await forceDelete(
      "User",
      { id: numericId },
      { req, userId: currentUserId }
    );
  } catch (error) {
    if (error.code === "P2003") {
      throw new Error("Không thể xóa cứng: người dùng còn dữ liệu liên quan (audit log, notification, upload, ...). Hãy xử lý dữ liệu liên quan trước.");
    }
    throw error;
  }

  return { id: numericId, hardDeleted: true };
}

/**
 * Bulk soft-delete nhiều user.
 *
 * Quy tắc:
 *   - Chỉ Admin (route đã có middleware).
 *   - Validate: ids phải là mảng, không rỗng, mỗi phần tử parse được sang Number.
 *   - KHÔNG tự xoá chính mình: nếu currentUserId nằm trong ids → throw ngay.
 *   - Fail-fast: check tất cả id tồn tại (kể cả đã xoá) TRƯỚC khi vào transaction;
 *     nếu có id không tồn tại → throw liệt kê id lỗi, KHÔNG xoá nửa vời.
 *   - Thực hiện updateMany deletedAt trong Prisma $transaction để atomic.
 *   - Ghi audit log TỪNG user (mỗi user 1 dòng, action = USER_SOFT_DELETE_BULK).
 *
 * @param {Array<number|string>} ids
 * @param {number} currentUserId
 * @param {Object} req            - Express request (để ghi audit log)
 * @returns {Promise<{deletedCount: number, deletedIds: number[]}>}
 */
async function bulkDeleteUsers(ids, currentUserId, req) {
  // 1. Validate input
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Danh sách ids không được rỗng");
  }
  const numericIds = [];
  for (const id of ids) {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error(`Id không hợp lệ: ${id}`);
    }
    numericIds.push(n);
  }

  // 2. Không tự xoá chính mình
  if (numericIds.includes(currentUserId)) {
    throw new Error("Bạn không thể tự xoá tài khoản của chính mình");
  }

  // 3. Fail-fast: check tất cả id tồn tại
  const existing = await userRepository.findUsersByIdsIncludeDeleted(numericIds);
  const existingIds = new Set(existing.map((u) => u.id));
  const missing = numericIds.filter((id) => !existingIds.has(id));
  if (missing.length > 0) {
    throw new Error(`Các id không tồn tại: ${missing.join(", ")}`);
  }

  // 4. Lọc ra những user CHƯA bị xoá (đã xoá thì idempotent, bỏ qua)
  const targets = existing.filter((u) => !u.deletedAt);
  if (targets.length === 0) {
    return { deletedCount: 0, deletedIds: [] };
  }
  const targetIds = targets.map((u) => u.id);

  // 5. Transaction atomic: set deletedAt cho tất cả
  await prisma.$transaction(async (tx) => {
    await userRepository.softDeleteMany(tx, targetIds);
  });

  // 6. Audit log TỪNG user (sau transaction để không làm rollback nếu audit lỗi)
  for (const u of targets) {
    await audit.logFromRequest(req, {
      userId: currentUserId,
      action: "USER_SOFT_DELETE_BULK",
      target: `User:${u.id}`,
      meta: {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        bulkSize: targetIds.length,
      },
    });
  }

  return { deletedCount: targetIds.length, deletedIds: targetIds };
}

/**
 * Bulk update status cho nhiều user.
 *
 * Quy tắc:
 *   - Chỉ Admin (route đã có middleware).
 *   - status phải thuộc UserStatus enum (nhận cả "active" / "ACTIVE").
 *   - Không tự đổi trạng thái chính mình nếu status mới là SUSPENDED/INACTIVE
 *     (tránh admin tự khoá tài khoản đang đăng nhập).
 *   - Fail-fast check tồn tại như bulk delete.
 *   - Transaction atomic + audit từng user.
 *
 * @param {Array<number|string>} ids
 * @param {string} status          - "ACTIVE" | "INACTIVE" | "SUSPENDED"
 * @param {number} currentUserId
 * @param {Object} req
 * @returns {Promise<{updatedCount: number, updatedIds: number[]}>}
 */
async function bulkUpdateStatus(ids, status, currentUserId, req) {
  // 1. Validate ids
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Danh sách ids không được rỗng");
  }
  const numericIds = [];
  for (const id of ids) {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error(`Id không hợp lệ: ${id}`);
    }
    numericIds.push(n);
  }

  // 2. Validate status (uppercase để khớp enum)
  const statusUpper = String(status || "").toUpperCase();
  if (!Object.values(UserStatus).includes(statusUpper)) {
    throw new Error(`Trạng thái không hợp lệ: ${status}`);
  }

  // 3. Không tự khoá/vô hiệu chính mình
  if (
    numericIds.includes(currentUserId) &&
    (statusUpper === UserStatus.SUSPENDED || statusUpper === UserStatus.INACTIVE)
  ) {
    throw new Error("Bạn không thể tự khoá/vô hiệu hoá tài khoản của chính mình");
  }

  // 4. Fail-fast: check tồn tại (chỉ user CHƯA xoá mềm — user đã xoá thì bỏ qua)
  const existing = await userRepository.findUsersByIdsIncludeDeleted(numericIds);
  const existingIds = new Set(existing.map((u) => u.id));
  const missing = numericIds.filter((id) => !existingIds.has(id));
  if (missing.length > 0) {
    throw new Error(`Các id không tồn tại: ${missing.join(", ")}`);
  }

  // 5. Chỉ update những user CHƯA bị xoá + status thực sự khác
  const targets = existing.filter((u) => !u.deletedAt && u.status !== statusUpper);
  if (targets.length === 0) {
    return { updatedCount: 0, updatedIds: [] };
  }
  const targetIds = targets.map((u) => u.id);

  // 6. Transaction atomic
  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { id: { in: targetIds } },
      data: { status: statusUpper },
    });
  });

  // 7. Audit log TỪNG user (ghi cả from→to để trace)
  for (const u of targets) {
    await audit.logFromRequest(req, {
      userId: currentUserId,
      action: "USER_STATUS_BULK_UPDATE",
      target: `User:${u.id}`,
      meta: {
        id: u.id,
        email: u.email,
        fromStatus: u.status,
        toStatus: statusUpper,
        bulkSize: targetIds.length,
      },
    });
  }

  return { updatedCount: targetIds.length, updatedIds: targetIds };
}

module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  restoreUser,
  forceDeleteUser,
  bulkDeleteUsers,
  bulkUpdateStatus,
};