const notificationService = require("./notification.service");

// GET /notifications
async function listMyNotifications(req, res) {
  try {
    const result = await notificationService.listForUser(req.user.id, req.query);
    res.json({
      message: "Lấy danh sách thông báo thành công",
      data: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      },
    });
  } catch (error) {
    console.error("[notification.controller] listMyNotifications error:", error && error.message ? error.message : error);
    res.status(400).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

// GET /notifications/:id
async function getMyNotificationById(req, res) {
  try {
    const notification = await notificationService.getOneForUser(req.user.id, req.params.id);
    res.json({
      message: "Lấy thông tin thông báo thành công",
      data: { notification },
    });
  } catch (error) {
    const status = error.code === "NOT_FOUND" ? 404 : 400;
    res.status(status).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

// POST /notifications (Admin)
async function createNotification(req, res) {
  try {
    const notification = await notificationService.createNotification(req.body);
    res.status(201).json({
      message: "Tạo thông báo thành công",
      data: { notification },
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

// PUT /notifications/:id/read
async function markNotificationAsRead(req, res) {
  try {
    const notification = await notificationService.markAsRead(req.user.id, req.params.id);
    res.json({
      message: "Đánh dấu đã đọc thành công",
      data: { notification },
    });
  } catch (error) {
    const status = error.code === "NOT_FOUND" ? 404 : 400;
    res.status(status).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

// PUT /notifications/read-all
async function markAllNotificationsAsRead(req, res) {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    res.json({
      message: "Đánh dấu tất cả đã đọc thành công",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

// DELETE /notifications/:id
async function deleteNotification(req, res) {
  try {
    const result = await notificationService.removeNotification(req.user, req.params.id, req);
    res.json({
      message: "Đã chuyển thông báo vào thùng rác (soft delete)",
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

// POST /notifications/:id/restore
async function restoreNotification(req, res) {
  try {
    const result = await notificationService.restoreNotification(req.user, req.params.id, req);
    res.json({
      message: "Khôi phục thông báo thành công",
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

// DELETE /notifications/:id/force  (chỉ Admin)
async function forceDeleteNotification(req, res) {
  try {
    const result = await notificationService.forceDeleteNotification(req.user, req.params.id, req);
    res.json({
      message: "Đã xóa cứng thông báo khỏi database",
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
  listMyNotifications,
  getMyNotificationById,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  restoreNotification,
  forceDeleteNotification,
};