const repo = require("./notification.repository");

function validateType(type) {
  if (type === undefined || type === null || type === "") return "INFO";
  if (!repo.VALID_TYPES.includes(type)) {
    throw new Error(`type phải là một trong: ${repo.VALID_TYPES.join(", ")}`);
  }
  return type;
}

function validateString(field, value, { min = 1, max = 255 } = {}) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} không được để trống`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new Error(`${field} quá ngắn`);
  }
  if (trimmed.length > max) {
    throw new Error(`${field} quá dài (tối đa ${max} ký tự)`);
  }
  return trimmed;
}

function validateUserId(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("userId phải là số nguyên dương");
  }
  return id;
}

function notFound() {
  const e = new Error("Không tìm thấy thông báo");
  e.code = "NOT_FOUND";
  return e;
}

function forbidden() {
  const e = new Error("Bạn không có quyền thao tác thông báo này");
  e.code = "FORBIDDEN";
  return e;
}

// GET /notifications (user)
async function listForUser(currentUserId, query = {}) {
  const where = { userId: currentUserId };
  if (query.isRead === "true") where.isRead = true;
  else if (query.isRead === "false") where.isRead = false;

  const page = query.page ? Number(query.page) : 1;
  const pageSize = query.pageSize ? Number(query.pageSize) : 20;

  return repo.findAllByUser(currentUserId, {
    isRead: typeof where.isRead === "boolean" ? where.isRead : undefined,
    page,
    pageSize,
  });
}

// GET /notifications/:id (user)
async function getOneForUser(currentUserId, id) {
  const noti = await repo.findByIdForUser(id, currentUserId);
  if (!noti) throw notFound();
  return noti;
}

// POST /notifications (admin)
async function createNotification(payload) {
  const type = validateType(payload.type);
  const title = validateString("title", payload.title, { min: 1, max: 200 });
  const message = validateString("message", payload.message, { min: 1, max: 1000 });
  const userId = validateUserId(payload.userId);

  const exists = await repo.userExists(userId);
  if (!exists) throw new Error("Người dùng nhận không tồn tại");

  return repo.create({ userId, type, title, message });
}

// PUT /notifications/:id/read (user)
async function markAsRead(currentUserId, id) {
  const updated = await repo.markRead(id, currentUserId);
  if (!updated) throw notFound();
  return updated;
}

// PUT /notifications/read-all (user)
async function markAllAsRead(currentUserId) {
  return repo.markAllRead(currentUserId);
}

// DELETE /notifications/:id
async function removeNotification(currentUser, id) {
  const isAdmin = currentUser && currentUser.role === "ADMIN";

  const noti = await repo.findById(id);
  if (!noti) throw notFound();

  if (!isAdmin && noti.userId !== currentUser.id) {
    throw forbidden();
  }

  await repo.remove(id, isAdmin ? null : currentUser.id);
  return { id: noti.id };
}

module.exports = {
  listForUser,
  getOneForUser,
  createNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
};