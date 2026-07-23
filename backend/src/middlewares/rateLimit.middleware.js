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

// Public teachers rate-limit: chống spam IP, KHÔNG strict như auth.
// 60 req / 15 min / IP — đủ cho crawler SEO + user xem trang.
const teachersPublicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown"),
  message: {
    message: "Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút",
  },
});

const pricingPlansPublicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown"),
  message: {
    message: "Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút",
  },
});

// ContactRequest public rate-limit (chống spam form liên hệ):
// Mặc định 3 req / IP / 1 giờ — đủ cho người dùng thật, chặn bot/spammer.
// windowMs tính theo milliseconds.
//
// Cho phép override `max` qua ENV CONTACT_RATE_LIMIT_MAX (số nguyên dương) để
// dễ test dev mà KHÔNG phải đợi 1 giờ. Ví dụ đặt trong .env:
//   CONTACT_RATE_LIMIT_MAX=1000
// Lưu ý:
//   - KHÔNG override > 1000 cho môi trường prod.
//   - Vẫn giữ windowMs = 1 giờ vì đây là cửa sổ chống spam hợp lý với lead form.
const DEFAULT_CONTACT_RATE_LIMIT_MAX = 3;
const parsedContactMax = Number(process.env.CONTACT_RATE_LIMIT_MAX);
const contactRateLimitMax =
  Number.isFinite(parsedContactMax) &&
  parsedContactMax >= 1 &&
  parsedContactMax <= 1000
    ? Math.floor(parsedContactMax)
    : DEFAULT_CONTACT_RATE_LIMIT_MAX;

const contactRequestPublicRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: contactRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown"),
  message: {
    message:
      "Bạn đã gửi quá nhiều yêu cầu liên hệ. Vui lòng thử lại sau 1 giờ.",
  },
});

module.exports = {
  loginRateLimiter,
  refreshTokenRateLimiter,
  teachersPublicRateLimiter,
  pricingPlansPublicRateLimiter,
  contactRequestPublicRateLimiter,
};