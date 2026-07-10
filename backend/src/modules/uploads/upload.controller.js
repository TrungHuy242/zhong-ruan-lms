/**
 * upload.controller.js — Controller cho module uploads/ (chỉ endpoint POST /upload).
 *
 * Lưu ý: tất cả các endpoint khác (list, detail, delete, restore, force, bulk, storage-stats)
 * đã được chuyển sang module files/ ở /api/files. Module uploads/ chỉ còn nhiệm vụ:
 *   - Nhận multipart upload qua multer
 *   - Tạo record UploadFile (qua files.service.uploadFile — shared)
 *
 * Lý do tách: route rõ ràng. POST /api/upload chỉ để upload; thao tác khác qua /api/files.
 */

const filesService = require("../files/files.service");

// POST /upload
async function upload(req, res) {
  try {
    const file = await filesService.uploadFile(req.user.id, req.file);
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

module.exports = { upload };