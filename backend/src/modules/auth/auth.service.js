const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Role } = require("@prisma/client");
const prisma = require("../../config/database");

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    }
  );
}

async function login(email, password) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("Email hoặc mật khẩu không đúng");
  }

  if (user.status !== "active") {
    throw new Error("Tài khoản đã bị khóa");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error("Email hoặc mật khẩu không đúng");
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    },
  };
}

async function refreshToken(token) {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw new Error("Token không hợp lệ");
    }

    if (user.status !== "active") {
      throw new Error("Tài khoản đã bị khóa");
    }

    const newAccessToken = generateAccessToken(user);

    return {
      accessToken: newAccessToken,
    };
  } catch (error) {
    throw new Error("Refresh token không hợp lệ hoặc đã hết hạn");
  }
}

async function register(payload) {
  const { fullName, email, phone, password, role } = payload;

  if (!fullName || !email || !password || !role) {
    throw new Error("Vui lòng nhập đầy đủ họ tên, email, mật khẩu và vai trò");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Email không đúng định dạng");
  }

  if (password.length < 6) {
    throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
  }

  const allowedSelfRegisterRoles = [Role.STUDENT, Role.TEACHER];
  if (!allowedSelfRegisterRoles.includes(role)) {
    throw new Error("Chỉ được phép đăng ký với vai trò STUDENT hoặc TEACHER");
  }

  const existedUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existedUser) {
    throw new Error("Email đã tồn tại");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      fullName,
      email,
      phone: phone || null,
      passwordHash,
      role,
      status: "active",
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return newUser;
}

async function changePassword(userId, oldPassword, newPassword) {
  if (!oldPassword || !newPassword) {
    throw new Error("Vui lòng nhập mật khẩu cũ và mật khẩu mới");
  }

  if (newPassword.length < 6) {
    throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự");
  }

  if (oldPassword === newPassword) {
    throw new Error("Mật khẩu mới phải khác mật khẩu cũ");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Không tìm thấy người dùng");
  }

  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) {
    throw new Error("Mật khẩu cũ không đúng");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
    },
  });
}

async function forgotPassword(email) {
  if (!email) {
    throw new Error("Vui lòng cung cấp email");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Email không đúng định dạng");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { sent: true };
  }

  if (user.status !== "active") {
    return { sent: true };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashedToken,
      resetTokenExpiresAt: expiresAt,
    },
  });

  return {
    sent: true,
    resetToken: rawToken,
    expiresAt,
  };
}

module.exports = {
  login,
  refreshToken,
  register,
  forgotPassword,
  changePassword,
};
