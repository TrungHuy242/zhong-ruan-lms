const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const searchController = require("./search.controller");

router.use(authMiddleware);

// Lấy lịch sử tìm kiếm của user hiện tại.
// Đặt TRƯỚC /:keyword-style để không bị nuốt route (hiện tại không có param route,
// nhưng vẫn khai báo rõ ràng cho tương lai).
router.get("/history", searchController.getHistory);
router.delete("/history", searchController.clearHistory);

// Tìm kiếm toàn hệ thống (giữ nguyên contract cũ + enrich payload).
router.get("/", searchController.search);

module.exports = router;