const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Role, UserStatus } = require("@prisma/client");
const prisma = require("../../config/database");
const audit = require("../audit/audit.service");

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

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getRefreshExpiryDate() {
  const raw = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
  const match = /^(\d+)([smhd])$/.exec(raw);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return new Date(Date.now() + value * (multipliers[unit] || multipliers.d));
}

async function login(email, password, req) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Ghi audit TRƯỚC throw (audit chỉ best-effort, không làm fail login flow).
    try {
      await audit.log({ userId: null, action: "AUTH_LOGIN_FAIL", target: `User:by-email:${email}`, meta: { reason: "INVALID_CREDENTIALS" }, ip: req && req.ip, userAgent: req && req.headers && req.headers["user-agent"] });
    } catch (_) {}
    throw new Error("Email hoặc mật khẩu không đúng");
  }

  if (user.status !== UserStatus.ACTIVE) {
    try {
      await audit.log({ userId: user.id, action: "AUTH_LOGIN_FAIL", target: `User:${user.id}`, meta: { reason: "USER_SUSPENDED" }, ip: req && req.ip, userAgent: req && req.headers && req.headers["user-agent"] });
    } catch (_) {}
    throw new Error("Tài khoản đã bị khóa");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    try {
      await audit.log({ userId: user.id, action: "AUTH_LOGIN_FAIL", target: `User:${user.id}`, meta: { reason: "INVALID_CREDENTIALS" }, ip: req && req.ip, userAgent: req && req.headers && req.headers["user-agent"] });
    } catch (_) {}
    throw new Error("Email hoặc mật khẩu không đúng");
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const refreshTokenExpiresAt = getRefreshExpiryDate();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshTokenHash,
      refreshTokenExpiresAt,
    },
  });

  // Ghi audit LOGIN_SUCCESS.
  try {
    await audit.log({ userId: user.id, action: "AUTH_LOGIN_SUCCESS", target: `User:${user.id}`, meta: { email: user.email }, ip: req && req.ip, userAgent: req && req.headers && req.headers["user-agent"] });
  } catch (_) {}

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
  let decoded;
  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
  } catch (error) {
    throw new Error("Refresh token không hợp lệ hoặc đã hết hạn");
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });

  if (!user) {
    throw new Error("Refresh token không hợp lệ");
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new Error("Tài khoản đã bị khóa");
  }

  const incomingHash = hashRefreshToken(token);

  if (!user.refreshTokenHash || user.refreshTokenHash !== incomingHash) {
    throw new Error("Refresh token không hợp lệ");
  }

  if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt.getTime() <= Date.now()) {
    throw new Error("Refresh token không hợp lệ hoặc đã hết hạn");
  }

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
  const newRefreshTokenExpiresAt = getRefreshExpiryDate();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshTokenHash: newRefreshTokenHash,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

async function register(payload, req) {
  const { fullName, email, phone, password } = payload;

  if (!fullName || !email || !password) {
    throw new Error("Vui lòng nhập đầy đủ họ tên, email và mật khẩu");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Email không đúng định dạng");
  }

  if (password.length < 6) {
    throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
  }

  const existedUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existedUser) {
    await audit.log({ userId: null, action: "AUTH_REGISTER_FAIL", target: "User:new", meta: { email, reason: "DUPLICATE_EMAIL" }, ip: req && req.ip, userAgent: req && req.headers && req.headers["user-agent"] });
    const err = new Error("Email đã tồn tại");
    err.code = "DUPLICATE_EMAIL";
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      fullName,
      email,
      phone: phone || null,
      passwordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
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
  await audit.log({ userId: newUser.id, action: "AUTH_REGISTER_SUCCESS", target: `User:${newUser.id}`, meta: { email: newUser.email, role: newUser.role }, ip: req && req.ip, userAgent: req && req.headers && req.headers["user-agent"] });
  return newUser;
}

async function updateProfile(userId, payload) {
  const { fullName, phone } = payload;

  if (!fullName || fullName.trim() === "") {
    throw new Error("Vui lòng nhập họ tên");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: fullName.trim(),
      phone: phone === undefined ? undefined : phone || null,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      updatedAt: true,
    },
  });

  return updated;
}

async function changePassword(userId, oldPassword, newPassword, req) {
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
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    },
  });
  await audit.log({ userId, action: "AUTH_CHANGE_PASSWORD_SUCCESS", target: `User:${userId}`, ip: req && req.ip, userAgent: req && req.headers && req.headers["user-agent"] });
}

async function forgotPassword(email) {
  const result = { sent: true };

  if (!email) {
    return result;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return result;
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return result;
  }

  if (user.status !== UserStatus.ACTIVE) {
    return result;
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

  if (process.env.NODE_ENV === "development") {
    result.resetToken = rawToken;
    result.expiresAt = expiresAt;
  }

  return result;
}

async function resetPassword(rawToken, newPassword) {
  if (!rawToken || !newPassword) {
    throw new Error("Vui lòng cung cấp token và mật khẩu mới");
  }

  if (newPassword.length < 6) {
    throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự");
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetToken: hashedToken,
      resetTokenExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    throw new Error("Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      resetToken: null,
      resetTokenExpiresAt: null,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    },
  });
}

async function logout(userId, req) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    },
  });
  await audit.log({ userId, action: "AUTH_LOGOUT_SUCCESS", target: `User:${userId}`, ip: req && req.ip, userAgent: req && req.headers && req.headers["user-agent"] });
}

module.exports = {
  login,
  refreshToken,
  register,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  logout,
};