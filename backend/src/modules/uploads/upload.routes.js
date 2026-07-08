const express = require("express");
const router = express.Router();

const uploadController = require("./upload.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");
const { upload } = require("../../middlewares/upload.middleware");

// Tất cả endpoint đều yêu cầu đăng nhập
router.use(authenticate);

// POST /upload — field tên là "file" (đặt đúng tên trong Postman/Form)
router.post("/upload", upload.single("file"), uploadController.upload);

// GET /files
router.get("/files", uploadController.list);

// GET /files/:id
router.get("/files/:id", uploadController.getOne);

// DELETE /files/:id  (soft delete — user thường chỉ xóa file của mình)
router.delete("/files/:id", uploadController.remove);

// POST /files/:id/restore  (user thường khôi phục file của mình)
router.post("/files/:id/restore", uploadController.restore);

// DELETE /files/:id/force  (chỉ Admin — xóa cứng DB + file vật lý)
router.delete(
  "/files/:id/force",
  authorizeRoles("ADMIN"),
  uploadController.forceRemove
);

module.exports = router;