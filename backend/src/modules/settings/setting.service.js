const repo = require("./setting.repository");
const { SETTING_GROUPS, normalizeGroup, SYSTEM_PROTECTED_KEYS } = require("./setting.constants");
const audit = require("../audit/audit.service");
const {
  softDelete,
  restore,
  forceDelete,
} = require("../../utils/softDelete");

// ===== Error helpers =====

function notFound(message = "Không tìm thấy cấu hình") {
  const e = new Error(message);
  e.code = "NOT_FOUND";
  return e;
}

function badRequest(message) {
  const e = new Error(message);
  e.code = "BAD_REQUEST";
  return e;
}

function conflict(message) {
  const e = new Error(message);
  e.code = "CONFLICT";
  return e;
}

// ===== Validate helpers =====

// Validate key: chỉ chứa chữ thường, số, gạch dưới, không trống, không quá dài
function validateKey(key) {
  if (typeof key !== "string" || key.trim() === "") {
    throw badRequest("key không được để trống");
  }
  const normalized = key.trim();
  if (normalized.length > 100) {
    throw badRequest("key không được dài quá 100 ký tự");
  }
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    throw badRequest("key chỉ được chứa chữ thường, số và dấu gạch dưới (a-z, 0-9, _)");
  }
  return normalized;
}

function validateValue(value) {
  if (value === undefined || value === null) {
    throw badRequest("value không được để trống");
  }
  if (typeof value !== "string") {
    throw badRequest("value phải là chuỗi");
  }
  if (value.length > 5000) {
    throw badRequest("value không được dài quá 5000 ký tự");
  }
  return value;
}

function validateDescription(description) {
  if (description === undefined || description === null) return null;
  if (typeof description !== "string") {
    throw badRequest("description phải là chuỗi");
  }
  if (description.length > 500) {
    throw badRequest("description không được dài quá 500 ký tự");
  }
  return description;
}

/**
 * Validate + normalize group.
 * Trả về null nếu không truyền/empty (giữ tương thích row cũ).
 * Throw BAD_REQUEST nếu không nằm trong whitelist.
 */
function validateGroup(raw) {
  const norm = normalizeGroup(raw);
  if (norm === undefined) {
    throw badRequest(
      `group không hợp lệ. Chỉ chấp nhận: ${SETTING_GROUPS.join(", ")}`
    );
  }
  return norm; // null hoặc string trong whitelist
}

// ===== Business logic =====

// GET /settings
//   - group : optional, filter
//   - search: optional, keyword trên key/description/value
async function listSettings({ group = null, search = null } = {}) {
  // Validate group nếu truyền
  if (group !== null && group !== undefined && group !== "") {
    validateGroup(group);
  }
  return repo.findAll({
    group: group || null,
    search: search || null,
  });
}

// GET /settings/:key
async function getSettingByKey(key) {
  const normalized = validateKey(key);
  const setting = await repo.findByKey(normalized);
  if (!setting) throw notFound(`Không tìm thấy cấu hình với key "${normalized}"`);
  return setting;
}

// POST /settings
async function createSetting(data, req = null) {
  const key = validateKey(data?.key);
  const value = validateValue(data?.value);
  const description = validateDescription(data?.description);
  const group = validateGroup(data?.group);

  if (await repo.existsByKey(key)) {
    throw conflict(`key "${key}" đã tồn tại`);
  }

  const created = await repo.create({ key, value, description, group });

  // Audit log — best-effort, không làm crash request nếu ghi log lỗi.
  await audit.logFromRequest(req, {
    userId: req?.user?.id ?? null,
    action: "SETTING_CREATED",
    target: `Setting:${created.key}`,
    meta: {
      group: created.group,
      hasDescription: Boolean(created.description),
    },
  });

  return created;
}

// PUT /settings/:key
async function updateSetting(key, data, req = null) {
  const normalized = validateKey(key);
  const existing = await repo.findByKey(normalized);
  if (!existing) throw notFound(`Không tìm thấy cấu hình với key "${normalized}"`);

  // Tạo object update chỉ chứa field hợp lệ
  const patch = {};
  if (data?.value !== undefined) patch.value = validateValue(data.value);
  if (data?.description !== undefined) patch.description = validateDescription(data.description);
  if (data?.group !== undefined) patch.group = validateGroup(data.group);

  // Nếu không có gì để update thì trả về bản ghi hiện tại
  if (Object.keys(patch).length === 0) return existing;

  const updated = await repo.updateByKey(normalized, patch);

  // Diff gọn để audit (chỉ liệt kê field thay đổi).
  const changes = {};
  for (const k of Object.keys(patch)) {
    if (patch[k] !== existing[k]) changes[k] = { from: existing[k], to: patch[k] };
  }

  await audit.logFromRequest(req, {
    userId: req?.user?.id ?? null,
    action: "SETTING_UPDATED",
    target: `Setting:${normalized}`,
    meta: {
      changes,
    },
  });

  return updated;
}

// DELETE /settings/:key
//
// Từ bản Trash Manager: chuyển từ hard-delete sang soft-delete để có thể
// restore / force-delete sau này qua module trash. Idempotent — nếu đã xoá
// thì trả về luôn không throw.
async function deleteSetting(key, req = null) {
  const normalized = validateKey(key);
  const existing = await repo.findByKeyIncludeDeleted(normalized);
  if (!existing) throw notFound(`Không tìm thấy cấu hình với key "${normalized}"`);

  const userId = req?.user?.id ?? null;

  // Nếu đã xoá mềm rồi → trả idempotent, không ghi log lặp.
  if (existing.deletedAt) {
    return {
      key: existing.key,
      alreadyDeleted: true,
      deletedAt: existing.deletedAt,
    };
  }

  const deleted = await softDelete(
    "Setting",
    { key: normalized },
    { req, userId }
  );

  if (!deleted) {
    throw notFound(`Không tìm thấy cấu hình với key "${normalized}"`);
  }

  return {
    key: deleted.key,
    deletedAt: deleted.deletedAt,
    deletedById: deleted.deletedById,
  };
}

// ===== Restore / Force-delete wrappers =====
//
// Service-level API cho module trash (và cho backward-compat nếu cần).
// Controller setting hiện không gọi trực tiếp — trash sẽ tự gọi.

async function restoreSetting(key, req = null) {
  const normalized = validateKey(key);
  const existing = await repo.findByKeyIncludeDeleted(normalized);
  if (!existing) throw notFound(`Không tìm thấy cấu hình với key "${normalized}"`);
  if (!existing.deletedAt) {
    return { key: existing.key, alreadyRestored: true };
  }
  const restored = await restore(
    "Setting",
    { key: normalized },
    { req, userId: req?.user?.id ?? null }
  );
  return { key: restored.key };
}

async function forceDeleteSetting(key, req = null) {
  const normalized = validateKey(key);
  const existing = await repo.findByKeyIncludeDeleted(normalized);
  if (!existing) throw notFound(`Không tìm thấy cấu hình với key "${normalized}"`);
  const removed = await forceDelete(
    "Setting",
    { key: normalized },
    { req, userId: req?.user?.id ?? null }
  );
  return { key: removed.key };
}

// ===== Export / Import =====

// Lấy snapshot toàn bộ setting (đã sort) để xuất ra JSON.
// Trả về { exportedAt, version, settings } để bên nhận biết schema.
async function exportSettings() {
  const items = await repo.findAll({});
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    settings: items,
  };
}

/**
 * Import settings từ JSON payload.
 *
 * @param {Object} payload - { settings: [...] } hoặc array trực tiếp.
 * @param {Object} options
 * @param {boolean} [options.replace=true] - true: upsert (ghi đè nếu key tồn tại).
 *                                            false: skip nếu key tồn tại (báo skipped).
 * @param {Object} [options.req] - Express request để ghi audit log.
 *
 * Validate dữ liệu trước khi ghi DB:
 *   - key/value/description/group phải hợp lệ (giống CRUD)
 *   - key thuộc SYSTEM_PROTECTED_KEYS thì KHÔNG được phép ghi đè
 *     (chỉ cho phép tạo mới nếu chưa có — để tránh vô tình ghi đè secret)
 *
 * Trả { imported: number, skipped: number, errors: [{ key, reason }] }.
 *
 * Audit log: 1 record `SETTING_IMPORTED` tổng hợp (không ghi 1 record/entry
 * để tránh spam Audit Log khi import 100 setting).
 */
async function importSettings(payload, options = {}) {
  const { replace = true, req = null } = options;

  // 1. Normalize input — chấp nhận { settings: [...] } hoặc array.
  let entries = [];
  if (Array.isArray(payload)) {
    entries = payload;
  } else if (payload && Array.isArray(payload.settings)) {
    entries = payload.settings;
  } else {
    throw badRequest("payload không hợp lệ — phải là array hoặc { settings: [...] }");
  }
  if (entries.length === 0) {
    return { imported: 0, skipped: 0, errors: [], total: 0 };
  }

  // 2. Validate + apply
  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (const entry of entries) {
    try {
      const key = validateKey(entry?.key);
      const value = validateValue(entry?.value);
      const description = validateDescription(entry?.description);
      const group = validateGroup(entry?.group);

      // System-protected: không cho phép ghi đè nếu đã tồn tại
      const isProtected = SYSTEM_PROTECTED_KEYS.has(key);
      const existed = await repo.existsByKey(key);

      if (isProtected && existed && !replace) {
        skipped += 1;
        errors.push({ key, reason: "PROTECTED_KEY_SKIPPED" });
        continue;
      }
      if (isProtected && existed) {
        // Vẫn skip nếu ghi đè — system-protected không bao giờ được import đè
        skipped += 1;
        errors.push({ key, reason: "PROTECTED_KEY_CANNOT_OVERWRITE" });
        continue;
      }

      if (!replace && existed) {
        skipped += 1;
        errors.push({ key, reason: "ALREADY_EXISTS" });
        continue;
      }

      await repo.upsertByKey({ key, value, description, group });
      imported += 1;
    } catch (err) {
      skipped += 1;
      errors.push({
        key: typeof entry?.key === "string" ? entry.key : "<invalid>",
        reason: err && err.message ? err.message : "INVALID",
      });
    }
  }

  // 3. Audit log (tổng hợp)
  await audit.logFromRequest(req, {
    userId: req?.user?.id ?? null,
    action: "SETTING_IMPORTED",
    target: "Setting:bulk",
    meta: {
      total: entries.length,
      imported,
      skipped,
      replace,
      // Giới hạn 20 lỗi đầu để meta không phình quá
      errorsSample: errors.slice(0, 20),
    },
  });

  return { total: entries.length, imported, skipped, errors };
}

module.exports = {
  listSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
  restoreSetting,
  forceDeleteSetting,
  exportSettings,
  importSettings,
  // Export helpers cho controller unit-test nếu cần
  _internal: { validateGroup, SETTING_GROUPS },
};