const express = require("express");
const router = express.Router();

const notificationController = require("./notification.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

// Tất cả endpoint đều yêu cầu đăng nhập
router.use(authenticate);

// User thường — xem/sửa/xóa thông báo của chính mình
router.get("/", notificationController.listMyNotifications);
router.get("/:id", notificationController.getMyNotificationById);
router.put("/:id/read", notificationController.markNotificationAsRead);
router.put("/read-all", notificationController.markAllNotificationsAsRead);
router.delete("/:id", notificationController.deleteNotification);

// Chỉ Admin mới được tạo thông báo
router.post(
  "/",
  authorizeRoles("ADMIN"),
  notificationController.createNotification
);

module.exports = router;