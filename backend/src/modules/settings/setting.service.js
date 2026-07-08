const repo = require("./setting.repository");

// Tạo lỗi có gắn .code để controller map status
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

// GET /settings
async function listSettings() {
  return repo.findAll();
}

// GET /settings/:key
async function getSettingByKey(key) {
  const normalized = validateKey(key);
  const setting = await repo.findByKey(normalized);
  if (!setting) throw notFound(`Không tìm thấy cấu hình với key "${normalized}"`);
  return setting;
}

// POST /settings
async function createSetting(data) {
  const key = validateKey(data?.key);
  const value = validateValue(data?.value);
  const description = validateDescription(data?.description);

  if (await repo.existsByKey(key)) {
    throw conflict(`key "${key}" đã tồn tại`);
  }

  return repo.create({ key, value, description });
}

// PUT /settings/:key
async function updateSetting(key, data) {
  const normalized = validateKey(key);
  const existing = await repo.findByKey(normalized);
  if (!existing) throw notFound(`Không tìm thấy cấu hình với key "${normalized}"`);

  // Tạo object update chỉ chứa field hợp lệ
  const patch = {};
  if (data?.value !== undefined) patch.value = validateValue(data.value);
  if (data?.description !== undefined) patch.description = validateDescription(data.description);

  // Nếu không có gì để update thì trả về bản ghi hiện tại
  if (Object.keys(patch).length === 0) return existing;

  return repo.updateByKey(normalized, patch);
}

// DELETE /settings/:key
async function deleteSetting(key) {
  const normalized = validateKey(key);
  const existing = await repo.findByKey(normalized);
  if (!existing) throw notFound(`Không tìm thấy cấu hình với key "${normalized}"`);

  await repo.removeByKey(normalized);
  return { key: existing.key };
}

module.exports = {
  listSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
};