const bcrypt = require("bcrypt");
const { Role, UserStatus } = require("@prisma/client");
const userRepository = require("./user.repository");
const audit = require("../audit/audit.service");

const STATUS_MAP = {
  active: UserStatus.ACTIVE,
  inactive: UserStatus.INACTIVE,
  locked: UserStatus.SUSPENDED,
};

async function getAllUsers() {
  return userRepository.findAllUsers();
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
  await audit.log({ userId: req.user.id, action: "ADMIN_USER_UPDATED", target: `User:${updatedUser.id}`, meta: { changes: payload }, ip: req && req.ip, userAgent: req && req.headers && req.headers["user-agent"] });
  return updatedUser;
}

async function deleteUser(id, currentUserId, req) {
  const user = await userRepository.findUserById(id);

  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  if (Number(id) === currentUserId) {
    throw new Error("Bạn không thể tự xóa tài khoản của mình");
  }

  await userRepository.deleteUser(id);
  await audit.log({ userId: currentUserId, action: "ADMIN_USER_DELETED", target: `User:${id}`, meta: { email: user.email }, ip: req && req.ip, userAgent: req && req.headers && req.headers["user-agent"] });
}

module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
};