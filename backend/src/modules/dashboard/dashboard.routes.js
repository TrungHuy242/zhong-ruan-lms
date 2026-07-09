const express = require("express");
const router = express.Router();

const dashboardController = require("./dashboard.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

// GET /api/dashboard/overview
// Thống kê tổng quan cho trang Admin Dashboard.
// Chỉ Admin mới được truy cập.
router.get(
  "/overview",
  authenticate,
  authorizeRoles("ADMIN"),
  dashboardController.getOverview
);

// GET /api/dashboard/stats/monthly?months=6
// Thống kê time-series theo tháng (users/files/notifications) cho khoảng
// N tháng gần nhất. Chỉ Admin.
router.get(
  "/stats/monthly",
  authenticate,
  authorizeRoles("ADMIN"),
  dashboardController.getMonthlyStats
);

module.exports = router;