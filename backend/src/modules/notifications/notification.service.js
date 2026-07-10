const repo = require("./notification.repository");
const { softDelete, restore, forceDelete } = require("../../utils/softDelete");
const { notDeletedWhere, parseFlags } = require("../../utils/softQuery");
const { getIO } = require("../../sockets");
const { USER_ROOM, ROLE_ROOM } = require("../../sockets/socketRooms");
const { Role } = require("@prisma/client");

const VALID_TARGETS = ["all", "role", "user"];

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

function normalizeTarget(target) {
  // Mặc định: backward-compat — payload cũ chỉ có userId ⇒ target = "user".
  if (target === undefined || target === null || target === "") return "user";
  const t = String(target).toLowerCase();
  if (!VALID_TARGETS.includes(t)) {
    throw new Error(
      `target phải là một trong: ${VALID_TARGETS.join(", ")} (nhận: "${target}")`
    );
  }
  return t;
}

function normalizeRole(role) {
  if (!role) throw new Error("role là bắt buộc khi target = 'role'");
  const r = String(role).toUpperCase();
  const known = Object.values(Role);
  if (!known.includes(r)) {
    throw new Error(`role không hợp lệ (phải là một trong: ${known.join(", ")})`);
  }
  return r;
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

/**
 * Build payload broadcast tối giản để FE prepend vào list / cập nhật badge mà
 * không cần gọi lại API. KHÔNG bao gồm message đầy đủ — chỉ preview ngắn.
 */
function buildBroadcastPayload(notification) {
  const fullMessage =
    notification && typeof notification.message === "string"
      ? notification.message
      : "";
  return {
    id: notification.id,
    title: notification.title,
    contentPreview:
      fullMessage.length > 120 ? fullMessage.slice(0, 120) + "…" : fullMessage,
    type: notification.type,
    createdAt: notification.createdAt,
    isRead: !!notification.isRead,
  };
}

function safeEmit(fn) {
  // try/catch để 1 socket lỗi không làm vỡ REST response.
  try {
    fn();
  } catch (err) {
    console.error(
      "[notification.service] socket emit failed:",
      err && err.message ? err.message : err
    );
  }
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

/**
 * Tạo notification.
 *
 * Hỗ trợ 3 target:
 *   - "user" (mặc định, backward-compat): truyền `userId` trong payload.
 *   - "role": truyền `role` (ADMIN / TEACHER / STUDENT).
 *   - "all": broadcast cho mọi user active.
 *
 * Sau khi tạo DB record thành công, emit socket event:
 *   - target="user"  → io.to(`user:<id>`).emit('notification:new', payload)
 *   - target="role"  → io.to(`role:<role>`).emit('notification:new', payload)
 *   - target="all"   → io.emit('notification:new', payload)
 *
 * Không đổi cấu trúc response — chỉ thêm side-effect emit.
 */
async function createNotification(payload) {
  const type = validateType(payload.type);
  const title = validateString("title", payload.title, { min: 1, max: 200 });
  const message = validateString("message", payload.message, {
    min: 1,
    max: 1000,
  });
  const target = normalizeTarget(payload.target);

  const io = getIO();

  // ===== TARGET = "user" (backward-compat) =====
  if (target === "user") {
    const userId = validateUserId(payload.userId);
    const exists = await repo.userExists(userId);
    if (!exists) throw new Error("Người dùng nhận không tồn tại");

    const created = await repo.create({
      userId: userId,
      type: type,
      title: title,
      message: message,
    });

    // Emit cho chính user đó (nhiều tab đều nhận).
    if (io) {
      safeEmit(() =>
        io
          .to(USER_ROOM(userId))
          .emit("notification:new", buildBroadcastPayload(created))
      );
    }
    return created;
  }

  // ===== TARGET = "role" =====
  if (target === "role") {
    const role = normalizeRole(payload.role);
    const userIds = await repo.findActiveUserIdsByRole(role);
    if (userIds.length === 0) {
      throw new Error(`Không có người dùng active nào đang giữ vai trò ${role}`);
    }
    const records = userIds.map((uid) => ({
      userId: uid,
      type,
      title,
      message,
    }));
    const createdList = await repo.createMany(records);

    // Emit 1 lần cho cả phòng role — KHÔNG loop từng user.
    if (io && createdList.length > 0) {
      // Lấy 1 record đại diện cho payload (id đầu tiên đủ để show toast/badge).
      const sample = buildBroadcastPayload(createdList[0]);
      // Đính kèm `role` để FE biết đây là broadcast theo role.
      safeEmit(() =>
        io.to(ROLE_ROOM(role)).emit("notification:new", {
          ...sample,
          target: "role",
          role: role,
          recipientCount: createdList.length,
        })
      );
    }
    return {
      target: "role",
      role,
      recipientCount: createdList.length,
      sample: createdList[0] || null,
    };
  }

  // ===== TARGET = "all" =====
  // Broadcast toàn bộ user active.
  const userIds = await repo.findActiveUserIds();
  if (userIds.length === 0) {
    throw new Error("Hệ thống chưa có người dùng active nào để gửi thông báo");
  }
  const records = userIds.map((uid) => ({ userId: uid, type, title, message }));
  const createdList = await repo.createMany(records);

  if (io && createdList.length > 0) {
    const sample = buildBroadcastPayload(createdList[0]);
    safeEmit(() =>
      io.emit("notification:new", {
        ...sample,
        target: "all",
        recipientCount: createdList.length,
      })
    );
  }
  return {
    target: "all",
    recipientCount: createdList.length,
    sample: createdList[0] || null,
  };
}

async function markAsRead(currentUserId, id) {
  const updated = await repo.markRead(id, currentUserId);
  if (!updated) throw notFound();

  // Đồng bộ tab khác của cùng user — emit vào room user:<id>.
  const io = getIO();
  if (io) {
    safeEmit(() =>
      io
        .to(USER_ROOM(currentUserId))
        .emit("notification:read", { id: updated.id })
    );
  }
  return updated;
}

async function markAllAsRead(currentUserId) {
  const result = await repo.markAllRead(currentUserId);

  const io = getIO();
  if (io) {
    safeEmit(() =>
      io
        .to(USER_ROOM(currentUserId))
        .emit("notification:read", { id: "all", updated: result.updated })
    );
  }
  return result;
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