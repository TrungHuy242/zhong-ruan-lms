const express = require("express");
const router = express.Router();

const uploadController = require("./upload.controller");
const authenticate = require("../../middlewares/auth.middleware");
const { upload } = require("../../middlewares/upload.middleware");

// Tất cả endpoint đều yêu cầu đăng nhập
router.use(authenticate);

// POST /upload — field tên là "file" (đặt đúng tên trong Postman/Form)
router.post("/upload", upload.single("file"), uploadController.upload);

// GET /files
router.get("/files", uploadController.list);

// GET /files/:id
router.get("/files/:id", uploadController.getOne);

// DELETE /files/:id
router.delete("/files/:id", uploadController.remove);

module.exports = router;