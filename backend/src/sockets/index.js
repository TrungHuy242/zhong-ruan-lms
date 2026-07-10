const { Server } = require("socket.io");
const socketAuth = require("./socketAuth");
const { joinUserRooms } = require("./socketRooms");

/**
 * Module-level reference tới Socket.io server, dùng để các service REST
 * (notification.service, ...) gọi io.to(...) / io.emit(...) khi cần broadcast.
 *
 * Khởi tạo qua `setupSocketIO(httpServer)`. Trước khi setup, `getIO()` trả null
 * để an toàn (vd: khi chạy unit test không cần socket).
 */
let ioInstance = null;

function setupSocketIO(httpServer) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const io = new Server(httpServer, {
    cors: {
      origin: frontendUrl,
      credentials: true,
    },
    // Giữ mặc định path "/socket.io" để khớp client mặc định của FE.
  });

  // JWT auth cho mọi kết nối.
  io.use(socketAuth);

  io.on("connection", (socket) => {
    // Gắn user vào 2 nhóm: cá nhân (user:${id}) + theo vai trò (role:${role}).
    joinUserRooms(socket);

    const { userId, role, email } = socket.data || {};
    console.log(
      `[socket] connected sid=${socket.id} userId=${userId} role=${role} email=${email || "-"}`
    );

    socket.on("disconnect", (reason) => {
      console.log(
        `[socket] disconnected sid=${socket.id} userId=${userId} reason=${reason}`
      );
    });
  });

  ioInstance = io;

  console.log(
    `[socket] Socket.io attached, CORS origin=${frontendUrl}, path=/socket.io`
  );

  return io;
}

function getIO() {
  return ioInstance;
}

module.exports = {
  setupSocketIO,
  getIO,
};