const bcrypt = require("bcrypt");
const { Role } = require("@prisma/client");
const userRepository = require("./user.repository");

async function getAllUsers() {
  return userRepository.findAllUsers();
}

async function createUser(payload) {
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

  return userRepository.createUser({
    fullName,
    email,
    phone: phone || null,
    passwordHash,
    role: Role[role],
    status: "active",
  });
}

async function getUserById(id) {
  const user = await userRepository.findUserById(id);

  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  return user;
}

async function updateUser(id, payload) {
  const { fullName, email, phone, role, status } = payload;

  const currentUser = await userRepository.findUserById(id);

  if (!currentUser) {
    throw new Error("Không tìm thấy người dùng");
  }

  const allowedRoles = Object.values(Role);

  if (role && !allowedRoles.includes(role)) {
    throw new Error("Vai trò không hợp lệ");
  }

  const allowedStatuses = ["active", "inactive", "locked"];

  if (status && !allowedStatuses.includes(status)) {
    throw new Error("Trạng thái không hợp lệ");
  }

  if (email && email !== currentUser.email) {
    const existedUser = await userRepository.findUserByEmail(email);

    if (existedUser) {
      throw new Error("Email đã tồn tại");
    }
  }

  return userRepository.updateUser(id, {
    fullName,
    email,
    phone,
    role: role ? Role[role] : undefined,
    status,
  });
}

async function deleteUser(id, currentUserId) {
  const user = await userRepository.findUserById(id);

  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  if (Number(id) === currentUserId) {
    throw new Error("Bạn không thể tự xóa tài khoản của mình");
  }

  return userRepository.deleteUser(id);
}

module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
};