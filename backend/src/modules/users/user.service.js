const bcrypt = require("bcrypt");
const userRepository = require("./user.repository");

async function getAllUsers() {
  return userRepository.findAllUsers();
}

async function createUser(payload) {
  const { fullName, email, phone, password, role } = payload;

  if (!fullName || !email || !password || !role) {
    throw new Error("Vui lòng nhập đầy đủ họ tên, email, mật khẩu và vai trò");
  }

  const allowedRoles = ["ADMIN", "TEACHER", "STUDENT"];

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
    phone,
    passwordHash,
    role,
    status: "active",
  });
}

module.exports = {
  getAllUsers,
  createUser,
};