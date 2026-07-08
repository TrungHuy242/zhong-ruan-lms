const uploadService = require("./upload.service");

// POST /upload
async function upload(req, res) {
  try {
    const file = await uploadService.uploadFile(req.user.id, req.file);
    res.status(201).json({
      message: "Upload file thành công",
      data: { file },
    });
  } catch (error) {
    console.error("[upload.controller] upload error:", error && error.message ? error.message : error);
    res.status(400).json({
      message: error.message || "Lỗi upload",
    });
  }
}

// GET /files
async function list(req, res) {
  try {
    const result = await uploadService.listFiles(req.user, req.query);
    res.json({
      message: "Lấy danh sách file thành công",
      data: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      },
    });
  } catch (error) {
    const status = error.code === "BAD_REQUEST" ? 400 : 400;
    res.status(status).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

// GET /files/:id
async function getOne(req, res) {
  try {
    const file = await uploadService.getOneFile(req.user, req.params.id);
    res.json({
      message: "Lấy thông tin file thành công",
      data: { file },
    });
  } catch (error) {
    let status = 400;
    if (error.code === "NOT_FOUND") status = 404;
    else if (error.code === "FORBIDDEN") status = 403;
    res.status(status).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

// DELETE /files/:id
async function remove(req, res) {
  try {
    const result = await uploadService.removeFile(req.user, req.params.id);
    res.json({
      message: "Xóa file thành công",
      data: result,
    });
  } catch (error) {
    let status = 400;
    if (error.code === "NOT_FOUND") status = 404;
    else if (error.code === "FORBIDDEN") status = 403;
    res.status(status).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

module.exports = {
  upload,
  list,
  getOne,
  remove,
};