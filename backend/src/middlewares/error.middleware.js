// Global error handler — must be registered LAST in app.js (after all routes and 404 handler).
// Express 5 forwards thrown errors and next(err) calls here. Body-parser writes a parse error
// onto the request and emits it on the response; we catch that by listening to "error" on the
// parser instance and converting it to a 400 instead of letting it crash the process.

const STATUS_MESSAGES = {
  400: "Yêu cầu không hợp lệ",
  401: "Chưa xác thực",
  403: "Bạn không có quyền truy cập chức năng này",
  404: "Không tìm thấy tài nguyên",
  409: "Xung đột dữ liệu",
  422: "Dữ liệu không hợp lệ",
  429: "Quá nhiều yêu cầu, vui lòng thử lại sau",
  500: "Lỗi máy chủ nội bộ",
};

function defaultMessageFor(status) {
  return STATUS_MESSAGES[status] || STATUS_MESSAGES[500];
}

function isPrismaKnownError(err) {
  return err && typeof err === "object" && typeof err.code === "string" && err.code.startsWith("P");
}

function mapPrismaError(err) {
  switch (err.code) {
    case "P2002":
      return { status: 409, message: "Dữ liệu đã tồn tại", detail: err.meta };
    case "P2025":
      return { status: 404, message: "Không tìm thấy bản ghi", detail: err.meta };
    case "P2003":
      return { status: 409, message: "Vi phạm ràng buộc khoá ngoại", detail: err.meta };
    default:
      return { status: 500, message: "Lỗi cơ sở dữ liệu", detail: { code: err.code } };
  }
}

function isJwtError(err) {
  return (
    err &&
    (err.name === "JsonWebTokenError" ||
      err.name === "TokenExpiredError" ||
      err.name === "NotBeforeError")
  );
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // 1) Invalid JSON body from express.json() — status 400, body-parser error
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "INVALID_JSON",
      message: "Body JSON không hợp lệ",
    });
  }

  // 2) Body too large
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({
      error: "PAYLOAD_TOO_LARGE",
      message: "Body vượt quá kích thước cho phép",
    });
  }

  // 3) Validation errors (express-validator style: err.errors = [...])
  if (err && Array.isArray(err.errors)) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Dữ liệu không hợp lệ",
      details: err.errors,
    });
  }

  // 4) JWT errors
  if (isJwtError(err)) {
    const status = err.name === "TokenExpiredError" ? 401 : 401;
    return res.status(status).json({
      error: err.name,
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }

  // 5) Prisma errors
  if (isPrismaKnownError(err)) {
    const mapped = mapPrismaError(err);
    return res.status(mapped.status).json({
      error: "DATABASE_ERROR",
      message: mapped.message,
      ...(process.env.NODE_ENV === "production" ? {} : { detail: mapped.detail }),
    });
  }

  // 6) Errors with explicit status (e.g. ApiError thrown in services)
  if (err && typeof err.status === "number" && err.status >= 400 && err.status < 600) {
    return res.status(err.status).json({
      error: err.code || "ERROR",
      message: err.message || defaultMessageFor(err.status),
    });
  }

  // 7) Fallback — unknown error. Log full stack, return generic 500 so server stays alive.
  // eslint-disable-next-line no-console
  console.error("[UnhandledError]", err && err.stack ? err.stack : err);
  return res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: defaultMessageFor(500),
  });
}

module.exports = errorHandler;