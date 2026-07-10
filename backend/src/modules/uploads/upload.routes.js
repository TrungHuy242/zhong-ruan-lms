const express = require("express");
const router = express.Router();

const uploadController = require("./upload.controller");
const authenticate = require("../../middlewares/auth.middleware");
const { upload } = require("../../middlewares/upload.middleware");

// Tất cả endpoint đều yêu cầu đăng nhập
router.use(authenticate);

// POST /upload — endpoint upload file (logic + storage do module files/ quản lý).
// Module uploads/ chỉ phụ trách nhận multipart và tạo record, mọi thao tác khác
// (list / detail / delete / restore / force / storage-stats / bulk) đã chuyển sang
// module files/ ở /api/files.
router.post("/upload", upload.single("file"), uploadController.upload);

module.exports = router;