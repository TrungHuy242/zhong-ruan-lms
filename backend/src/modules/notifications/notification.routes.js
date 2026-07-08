const express = require("express");
const router = express.Router();

const notificationController = require("./notification.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

// Tất cả endpoint đều yêu cầu đăng nhập
router.use(authenticate);

// User thường — xem/sửa/xóa/khôi phục thông báo của chính mình
router.get("/", notificationController.listMyNotifications);
router.get("/:id", notificationController.getMyNotificationById);
router.put("/:id/read", notificationController.markNotificationAsRead);
router.put("/read-all", notificationController.markAllNotificationsAsRead);
router.delete("/:id", notificationController.deleteNotification);
router.post("/:id/restore", notificationController.restoreNotification);

// Chỉ Admin
router.post(
  "/",
  authorizeRoles("ADMIN"),
  notificationController.createNotification
);
router.delete(
  "/:id/force",
  authorizeRoles("ADMIN"),
  notificationController.forceDeleteNotification
);

module.exports = router;