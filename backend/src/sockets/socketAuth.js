const jwt = require("jsonwebtoken");
const { verifyToken } = require("../utils/jwt");
const prisma = require("../config/database");
const { UserStatus } = require("@prisma/client");

/**
 * Socket.io authentication middleware.
 *
 * Tái sử dụng logic verify JWT từ utils/jwt (cùng hàm `verifyToken` được REST auth
 * middleware sử dụng), đồng thời load user từ DB để check status (giống middleware
 * REST) — đảm bảo 1 nguồn xác thực duy nhất cho cả HTTP và WebSocket.
 *
 * Client phải gửi token qua `socket.handshake.auth.token`
 * (FE: io(url, { auth: { token: accessToken } })).
 *
 * Sau khi verify thành công, `socket.data` được set:
 *   - socket.data.userId  : id người dùng
 *   - socket.data.role    : vai trò
 *   - socket.data.email   : email (phục vụ log/debug)
 */
function socketAuth(socket, next) {
  try {
    const token =
      (socket.handshake.auth && socket.handshake.auth.token) ||
      socket.handshake.headers.authorization;

    if (!token) {
      return next(new Error("UNAUTHENTICATED: thiếu accessToken"));
    }

    // Hỗ trợ cả "Bearer xxx" và "xxx" thuần cho tiện.
    const raw = typeof token === "string" ? token : "";
    const cleaned = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
    if (!cleaned) {
      return next(new Error("UNAUTHENTICATED: token rỗng"));
    }

    let decoded;
    try {
      // verifyToken ném JsonWebTokenError / TokenExpiredError nếu invalid/hết hạn
      decoded = verifyToken(cleaned);
    } catch (err) {
      const reason =
        err instanceof jwt.TokenExpiredError
          ? "token đã hết hạn"
          : "token không hợp lệ";
      return next(new Error(`UNAUTHENTICATED: ${reason}`));
    }

    if (!decoded || !decoded.id) {
      return next(new Error("UNAUTHENTICATED: payload thiếu id"));
    }

    // Verify user còn tồn tại và đang active (check async trong middleware)
    prisma.user
      .findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      })
      .then((user) => {
        if (!user) {
          return next(new Error("UNAUTHENTICATED: user không tồn tại"));
        }
        if (user.status !== UserStatus.ACTIVE) {
          return next(new Error("FORBIDDEN: tài khoản đã bị khóa"));
        }

        socket.data.userId = user.id;
        socket.data.role = user.role;
        socket.data.email = user.email;
        next();
      })
      .catch((dbErr) => {
        console.error(
          "[socketAuth] prisma lookup failed:",
          dbErr && dbErr.message ? dbErr.message : dbErr
        );
        next(new Error("UNAUTHENTICATED: lỗi xác thực"));
      });
  } catch (err) {
    console.error(
      "[socketAuth] unexpected error:",
      err && err.message ? err.message : err
    );
    next(new Error("UNAUTHENTICATED: lỗi xác thực"));
  }
}

module.exports = socketAuth;