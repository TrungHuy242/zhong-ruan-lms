const bcrypt = require("bcrypt");
const { Role, UserStatus } = require("@prisma/client");
const userRepository = require("./user.repository");
const audit = require("../audit/audit.service");
const { softDelete, restore, forceDelete } = require("../../utils/softDelete");
const { notDeletedWhere, parseFlags } = require("../../utils/softQuery");

const STATUS_MAP = {
  active: UserStatus.ACTIVE,
  inactive: UserStatus.INACTIVE,
  locked: UserStatus.SUSPENDED,
};

async function getAllUsers(query = {}) {
  const flags = parseFlags(query);
  const where = notDeletedWhere({}, flags);
  return userRepository.findAllUsers(where);
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

module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  restoreUser,
  forceDeleteUser,
};