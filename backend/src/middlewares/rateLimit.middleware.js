const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const { ipKeyGenerator } = require("express-rate-limit");

// Login limiter: chỉ đếm lần đăng nhập THẤT BẠI (skipSuccessfulRequests).
// Key theo IP + email (lowercase + trim) để tránh chặn user khác cùng IP khi
// 1 account bị brute-force, đồng thời vẫn chặn 1 account bị spam dù đổi IP.
// ipKeyGenerator() đảm bảo IPv6 được normalize đúng trước khi dùng làm key.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip || "unknown");
    const email = String(req.body?.email || "").trim().toLowerCase();
    return email ? `${ip}:${email}` : ip;
  },
  message: {
    message: "Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút",
  },
});

// Refresh-token limiter: chống brute-force / replay refresh token.
// Đếm cả success & fail để chặn cả 2 vector (vì mỗi lần đều tốn DB query + JWT verify).
// Key theo IP + hash(refreshToken) để chặn token cụ thể bị spam.
const refreshTokenRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip || "unknown");
    const token = String(req.body?.refreshToken || "");
    // Hash để key ngắn + không leak raw token qua rate-limit store key.
    const tokenDigest = token ? crypto.createHash("sha256").update(token).digest("hex") : "no-token";
    return `${ip}:${tokenDigest}`;
  },
  message: {
    message: "Quá nhiều yêu cầu refresh token, vui lòng thử lại sau 15 phút",
  },
});

module.exports = { loginRateLimiter, refreshTokenRateLimiter };