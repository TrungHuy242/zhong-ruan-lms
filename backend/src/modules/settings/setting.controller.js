const service = require("./setting.service");

// ===== Existing CRUD (giữ nguyên behavior + signature) =====

// GET /settings?group=...&search=...
async function list(req, res) {
  try {
    const { group, search } = req.query || {};
    const items = await service.listSettings({
      group: group || null,
      search: search || null,
    });
    res.json({
      message: "Lấy danh sách cấu hình thành công",
      data: items,
      total: items.length,
      // Echo lại filter để FE đồng bộ nếu cần
      filters: {
        group: group || null,
        search: search || null,
      },
    });
  } catch (error) {
    console.error("[setting.controller] list error:", error.message);
    let status = 400;
    if (error.code === "BAD_REQUEST") status = 400;
    res.status(status).json({ message: error.message || "Lỗi hệ thống" });
  }
}

// GET /settings/:key
async function getOne(req, res) {
  try {
    const setting = await service.getSettingByKey(req.params.key);
    res.json({
      message: "Lấy cấu hình thành công",
      data: { setting },
    });
  } catch (error) {
    let status = 400;
    if (error.code === "NOT_FOUND") status = 404;
    res.status(status).json({ message: error.message || "Lỗi hệ thống" });
  }
}

// POST /settings
async function create(req, res) {
  try {
    const setting = await service.createSetting(req.body, req);
    res.status(201).json({
      message: "Tạo cấu hình thành công",
      data: { setting },
    });
  } catch (error) {
    let status = 400;
    if (error.code === "CONFLICT") status = 409;
    res.status(status).json({ message: error.message || "Lỗi hệ thống" });
  }
}

// PUT /settings/:key
async function update(req, res) {
  try {
    const setting = await service.updateSetting(req.params.key, req.body, req);
    res.json({
      message: "Cập nhật cấu hình thành công",
      data: { setting },
    });
  } catch (error) {
    let status = 400;
    if (error.code === "NOT_FOUND") status = 404;
    res.status(status).json({ message: error.message || "Lỗi hệ thống" });
  }
}

// DELETE /settings/:key
async function remove(req, res) {
  try {
    const result = await service.deleteSetting(req.params.key, req);
    res.json({
      message: "Xóa cấu hình thành công",
      data: result,
    });
  } catch (error) {
    let status = 400;
    if (error.code === "NOT_FOUND") status = 404;
    res.status(status).json({ message: error.message || "Lỗi hệ thống" });
  }
}

// ===== Import / Export =====

// GET /settings/export
async function exportSettings(req, res) {
  try {
    const payload = await service.exportSettings();
    res.json({
      message: "Xuất cấu hình thành công",
      data: payload,
    });
  } catch (error) {
    console.error("[setting.controller] export error:", error.message);
    res.status(500).json({ message: error.message || "Lỗi hệ thống" });
  }
}

// POST /settings/import
//   body: { settings: [...] } hoặc array trực tiếp
//   query: ?replace=true|false (default true)
async function importSettings(req, res) {
  try {
    const replaceRaw = (req.query && req.query.replace) ?? (req.body && req.body.replace);
    const replace = replaceRaw === undefined
      ? true
      : String(replaceRaw) === "true" || replaceRaw === true;

    // Tách `replace` ra khỏi body nếu user nhét vào body.
    const rawBody = req.body && typeof req.body === "object" ? { ...req.body } : req.body;
    if (rawBody && typeof rawBody === "object" && "replace" in rawBody) {
      delete rawBody.replace;
    }

    const result = await service.importSettings(rawBody, { replace, req });
    res.json({
      message: `Import hoàn tất: ${result.imported} thêm mới/cập nhật, ${result.skipped} bỏ qua`,
      data: result,
    });
  } catch (error) {
    let status = 400;
    if (error.code === "BAD_REQUEST") status = 400;
    res.status(status).json({ message: error.message || "Lỗi hệ thống" });
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  exportSettings,
  importSettings,
};