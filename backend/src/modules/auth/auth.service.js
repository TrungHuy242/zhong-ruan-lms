const bcrypt = require("bcrypt");
const prisma = require("../../config/database");
const { signToken } = require("../../utils/jwt");

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error("Email hoặc mật khẩu không đúng");
    err.statusCode = 401;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const err = new Error("Email hoặc mật khẩu không đúng");
    err.statusCode = 401;
    throw err;
  }

  const token = signToken({ id: user.id, role: user.role });
  const { passwordHash, ...safeUser } = user;

  return { token, user: safeUser };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    const err = new Error("Không tìm thấy user");
    err.statusCode = 404;
    throw err;
  }

  return user;
}

module.exports = { login, getMe };