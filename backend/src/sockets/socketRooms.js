/**
 * Quản lý rooms cho Socket.io.
 *
 * Convention đặt tên:
 *   - `user:<id>`  : room riêng cho từng user (gửi notification, đồng bộ mark-read
 *                    giữa nhiều tab/thiết bị của cùng 1 user).
 *   - `role:<ROLE>`: room theo vai trò (ADMIN / TEACHER / STUDENT) — emit broadcast
 *                    theo nhóm mà không cần loop từng user.
 *
 * Lưu ý: viết thường hoá role khi join để tránh lệch do input không nhất quán.
 */
function joinUserRooms(socket) {
  const userId = socket.data && socket.data.userId;
  const role = socket.data && socket.data.role;

  if (userId) {
    socket.join(`user:${userId}`);
  }
  if (role) {
    socket.join(`role:${String(role).toLowerCase()}`);
  }
}

module.exports = {
  joinUserRooms,
  USER_ROOM: (id) => `user:${id}`,
  ROLE_ROOM: (role) => `role:${String(role).toLowerCase()}`,
};