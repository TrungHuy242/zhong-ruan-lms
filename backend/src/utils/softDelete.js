/**
 * softDelete.js — Helper soft-delete / restore / force-delete dùng chung cho mọi model.
 *
 * Cách dùng trong module:
 *   const { softDelete, restore, forceDelete } = require("../../utils/softDelete");
 *   await softDelete("User", { id: req.params.id }, { req, userId: req.user.id });
 *
 * Quy tắc:
 *  - Helper tự map label "User"/"Notification"/"UploadFile"/"Setting" → prismaInternal.<delegate>.
 *  - prismaInternal KHÔNG có extension, nên có thể tìm được cả record đã soft-delete
 *    (cần thiết cho restore + force-delete, và cho idempotent soft-delete).
 *  - Soft-delete đồng thời ghi `deletedAt` + `deletedById` (actor) để audit trail.
 *  - Audit ghi qua audit.service nếu truyền `req`.
 */

const audit = require("../modules/audit/audit.service");
const { prismaInternal } = require("../config/database");

const SOFT_DELETE_ACTIONS = {
  user: "USER_SOFT_DELETE",
  notification: "NOTIFICATION_SOFT_DELETE",
  uploadFile: "UPLOAD_SOFT_DELETE",
  setting: "SETTING_SOFT_DELETE",
};

const RESTORE_ACTIONS = {
  user: "USER_RESTORE",
  notification: "NOTIFICATION_RESTORE",
  uploadFile: "UPLOAD_RESTORE",
  setting: "SETTING_RESTORE",
};

const FORCE_DELETE_ACTIONS = {
  user: "USER_FORCE_DELETE",
  notification: "NOTIFICATION_FORCE_DELETE",
  uploadFile: "UPLOAD_FORCE_DELETE",
  setting: "SETTING_FORCE_DELETE",
};

// Map "User" → "user" (prismaInternal.user), "Notification" → "notification", "UploadFile" → "uploadFile"
// Vì Prisma camelCase các model name nên phải giữ camelCase, không chỉ .toLowerCase()
function toCamelCase(label) {
  if (!label) return label;
  // "UploadFile" → "uploadFile", "User" → "user", "Notification" → "notification", "Setting" → "setting"
  return label.charAt(0).toLowerCase() + label.slice(1);
}

function resolveModel(label) {
  if (!label) throw new Error("softDelete helper: thiếu label (vd: 'User')");
  const key = toCamelCase(label);
  const m = prismaInternal[key];
  if (!m) throw new Error(`softDelete helper: model "${label}" không tồn tại trên Prisma`);
  return m;
}

function resolveActionKey(label) {
  const lower = label.toLowerCase();
  if (lower === "user") return "user";
  if (lower === "notification") return "notification";
  if (lower === "uploadfile" || lower === "upload") return "uploadFile";
  if (lower === "setting" || lower === "settings") return "setting";
  return null;
}

/**
 * Soft delete: set deletedAt = now + deletedById = userId (actor).
 * Idempotent: nếu đã deletedAt rồi thì trả về record luôn (không throw, không update lại).
 *
 * @param {string} label      - "User" | "Notification" | "UploadFile" | "Setting"
 * @param {Object} where      - Điều kiện tìm, vd: { id: 5 }
 * @param {Object} [opts]
 * @param {Object} [opts.req] - Express req (để ghi AuditLog tự động)
 * @param {number} [opts.userId]
 * @returns {Promise<Object|null>} bản ghi (kèm deletedAt) hoặc null nếu không tồn tại
 */
async function softDelete(label, where, { req = null, userId = null } = {}) {
  const model = resolveModel(label);
  const exist = await model.findFirst({ where });
  if (!exist) return null;
  if (exist.deletedAt) return exist; // idempotent

  const updated = await model.update({
    where: { id: exist.id },
    data: {
      deletedAt: new Date(),
      deletedById: userId ?? null,
    },
  });

  if (req) {
    const key = resolveActionKey(label);
    const action = SOFT_DELETE_ACTIONS[key];
    if (action) {
      await audit.logFromRequest(req, {
        userId,
        action,
        target: `${label}:${exist.id}`,
        meta: {
          id: exist.id,
          deletedAt: updated.deletedAt,
          deletedById: updated.deletedById,
        },
      });
    }
  }

  return updated;
}

/**
 * Khôi phục bản ghi đã xóa mềm.
 * Idempotent: nếu chưa xóa thì trả về luôn.
 *
 * @returns {Promise<Object|null>} bản ghi (deletedAt = null) hoặc null
 */
async function restore(label, where, { req = null, userId = null } = {}) {
  const model = resolveModel(label);
  const exist = await model.findFirst({ where });
  if (!exist) return null;
  if (!exist.deletedAt) return exist;

  const updated = await model.update({
    where: { id: exist.id },
    data: { deletedAt: null, deletedById: null },
  });

  if (req) {
    const key = resolveActionKey(label);
    const action = RESTORE_ACTIONS[key];
    if (action) {
      await audit.logFromRequest(req, {
        userId,
        action,
        target: `${label}:${exist.id}`,
        meta: { id: exist.id, restoredFromDeletedAt: exist.deletedAt },
      });
    }
  }

  return updated;
}

/**
 * Xóa cứng khỏi database.
 * ⚠️ Controller BẮT BUỘC phải check quyền Admin trước khi gọi.
 *
 * Ghi AuditLog TRƯỚC khi xóa (vì sau khi xóa target.id không còn trỏ được).
 */
async function forceDelete(label, where, { req = null, userId = null } = {}) {
  const model = resolveModel(label);
  const exist = await model.findFirst({ where });
  if (!exist) return null;

  if (req) {
    const key = resolveActionKey(label);
    const action = FORCE_DELETE_ACTIONS[key];
    if (action) {
      await audit.logFromRequest(req, {
        userId,
        action,
        target: `${label}:${exist.id}`,
        meta: {
          id: exist.id,
          wasDeleted: !!exist.deletedAt,
          snapshot: snapshotFields(exist),
        },
      });
    }
  }

  await model.delete({ where: { id: exist.id } });
  return exist;
}

function snapshotFields(obj) {
  if (!obj) return null;
  const snap = {};
  for (const k of ["id", "email", "fullName", "title", "storedName", "originalName", "key"]) {
    if (obj[k] !== undefined) snap[k] = obj[k];
  }
  return snap;
}

module.exports = {
  softDelete,
  restore,
  forceDelete,
  SOFT_DELETE_ACTIONS,
  RESTORE_ACTIONS,
  FORCE_DELETE_ACTIONS,
};