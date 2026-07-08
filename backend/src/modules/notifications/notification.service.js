const repo = require("./notification.repository");
const { softDelete, restore, forceDelete } = require("../../utils/softDelete");
const { notDeletedWhere, parseFlags } = require("../../utils/softQuery");

function validateType(type) {
  if (type === undefined || type === null || type === "") return "INFO";
  if (!repo.VALID_TYPES.includes(type)) {
    throw new Error(`type phải là một trong: ${repo.VALID_TYPES.join(", ")}`);
  }
  return type;
}

function validateString(field, value, opts) {
  const min = (opts && opts.min) || 1;
  const max = (opts && opts.max) || 255;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} không được để trống`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) throw new Error(`${field} quá ngắn`);
  if (trimmed.length > max) throw new Error(`${field} quá dài (tối đa ${max} ký tự)`);
  return trimmed;
}

function validateUserId(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("userId phải là số nguyên dương");
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

async function listForUser(currentUserId, query) {
  query = query || {};
  const flags = parseFlags(query);
  const baseWhere = { userId: currentUserId };
  if (query.isRead === "true") baseWhere.isRead = true;
  else if (query.isRead === "false") baseWhere.isRead = false;

  const where = notDeletedWhere(baseWhere, flags);
  const page = query.page ? Number(query.page) : 1;
  const pageSize = query.pageSize ? Number(query.pageSize) : 20;

  return repo.findAllByUser(currentUserId, {
    where: where,
    isRead: typeof baseWhere.isRead === "boolean" ? baseWhere.isRead : undefined,
    page: page,
    pageSize: pageSize,
  });
}

async function getOneForUser(currentUserId, id) {
  const noti = await repo.findByIdForUser(id, currentUserId);
  if (!noti) throw notFound();
  return noti;
}

async function createNotification(payload) {
  const type = validateType(payload.type);
  const title = validateString("title", payload.title, { min: 1, max: 200 });
  const message = validateString("message", payload.message, { min: 1, max: 1000 });
  const userId = validateUserId(payload.userId);

  const exists = await repo.userExists(userId);
  if (!exists) throw new Error("Người dùng nhận không tồn tại");

  return repo.create({ userId: userId, type: type, title: title, message: message });
}

async function markAsRead(currentUserId, id) {
  const updated = await repo.markRead(id, currentUserId);
  if (!updated) throw notFound();
  return updated;
}

async function markAllAsRead(currentUserId) {
  return repo.markAllRead(currentUserId);
}

async function removeNotification(currentUser, id, req) {
  const isAdmin = currentUser && currentUser.role === "ADMIN";

  const noti = await repo.findByIdIncludeDeleted(id);
  if (!noti) throw notFound();

  if (!isAdmin && noti.userId !== currentUser.id) {
    throw forbidden();
  }

  if (noti.deletedAt) {
    return { id: noti.id, alreadyDeleted: true };
  }

  const where = isAdmin
    ? { id: noti.id }
    : { id: noti.id, userId: currentUser.id };

  const deleted = await softDelete("Notification", where, {
    req: req || null,
    userId: currentUser && currentUser.id,
  });

  if (!deleted) {
    return { id: noti.id, alreadyDeleted: true };
  }

  return { id: deleted.id, deletedAt: deleted.deletedAt };
}

/**
 * Khôi phục notification đã soft-delete.
 * - Admin: khôi phục bất kỳ
 * - User thường: chỉ được khôi phục thông báo của chính mình
 */
async function restoreNotification(currentUser, id, req) {
  const isAdmin = currentUser && currentUser.role === "ADMIN";

  const noti = await repo.findByIdIncludeDeleted(id);
  if (!noti) throw notFound();

  if (!isAdmin && noti.userId !== currentUser.id) {
    throw forbidden();
  }

  const where = isAdmin
    ? { id: noti.id }
    : { id: noti.id, userId: currentUser.id };

  const restored = await restore("Notification", where, {
    req: req || null,
    userId: currentUser && currentUser.id,
  });

  if (!restored) {
    throw new Error("Không thể khôi phục thông báo");
  }

  return { id: restored.id, deletedAt: restored.deletedAt };
}

/**
 * Xóa cứng notification khỏi database. Chỉ Admin.
 */
async function forceDeleteNotification(currentUser, id, req) {
  const isAdmin = currentUser && currentUser.role === "ADMIN";
  if (!isAdmin) {
    throw forbidden();
  }

  const noti = await repo.findByIdIncludeDeleted(id);
  if (!noti) throw notFound();

  await forceDelete("Notification", { id: noti.id }, {
    req: req || null,
    userId: currentUser && currentUser.id,
  });

  return { id: noti.id, hardDeleted: true };
}

module.exports = {
  listForUser: listForUser,
  getOneForUser: getOneForUser,
  createNotification: createNotification,
  markAsRead: markAsRead,
  markAllAsRead: markAllAsRead,
  removeNotification: removeNotification,
  restoreNotification: restoreNotification,
  forceDeleteNotification: forceDeleteNotification,
};