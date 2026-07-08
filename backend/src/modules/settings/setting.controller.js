const service = require("./setting.service");

// GET /settings
async function list(req, res) {
  try {
    const items = await service.listSettings();
    res.json({
      message: "Lấy danh sách cấu hình thành công",
      data: items,
      total: items.length,
    });
  } catch (error) {
    console.error("[setting.controller] list error:", error.message);
    res.status(400).json({ message: error.message || "Lỗi hệ thống" });
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
    const setting = await service.createSetting(req.body);
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
    const setting = await service.updateSetting(req.params.key, req.body);
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
    const result = await service.deleteSetting(req.params.key);
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

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
};