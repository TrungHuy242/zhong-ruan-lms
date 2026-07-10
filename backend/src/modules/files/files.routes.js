const express = require("express");
const router = express.Router();

const filesController = require("./files.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

// Tất cả endpoint đều yêu cầu đăng nhập
router.use(authenticate);

// ===== List + filter + sort =====
router.get("/files", filesController.list);

// ===== Storage stats (chỉ Admin) — đặt TRƯỚC /files/:id để không bị match nhầm =====
router.get("/files/storage-stats", authorizeRoles("ADMIN"), filesController.storageStats);

// ===== Detail =====
router.get("/files/:id", filesController.getOne);

// ===== Soft delete đơn lẻ =====
router.delete("/files/:id", filesController.remove);

// ===== Soft delete bulk =====
router.delete("/files/bulk", filesController.bulkRemove);

// ===== Bulk download (stream zip) =====
router.post("/files/bulk-download", filesController.bulkDownload);

// ===== Restore =====
router.post("/files/:id/restore", filesController.restore);

// ===== Force delete (chỉ Admin) =====
router.delete(
  "/files/:id/force",
  authorizeRoles("ADMIN"),
  filesController.forceRemove
);

module.exports = router;