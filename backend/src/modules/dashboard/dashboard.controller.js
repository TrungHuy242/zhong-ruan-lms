const dashboardService = require("./dashboard.service");

/**
 * GET /api/dashboard/overview
 * Chỉ Admin (đã chặn ở route bằng authorizeRoles).
 *
 * Trả về thống kê tổng quan: users, notifications, files, auditLogs.
 * Thêm `generatedAt` (ISO 8601) để client biết dữ liệu được tạo lúc nào —
 * tiện cho việc cache / debug.
 */
async function getOverview(req, res) {
  try {
    const data = await dashboardService.getOverview();
    res.status(200).json({
      message: "Lấy thống kê dashboard thành công",
      data,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "[dashboard.controller] getOverview error:",
      error && error.message ? error.message : error
    );
    res.status(500).json({
      message: "Lỗi hệ thống",
    });
  }
}

module.exports = { getOverview };