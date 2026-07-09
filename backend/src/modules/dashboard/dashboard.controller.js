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

/**
 * GET /api/dashboard/stats/monthly?months=6
 * Chỉ Admin (đã chặn ở route bằng authorizeRoles).
 *
 * Time-series 3 chỉ số theo tháng (users/files/notifications) cho khoảng
 * N tháng gần nhất (mặc định 6, tối đa 12). Tháng không có dữ liệu điền 0
 * — mảng luôn đủ `months` phần tử, thứ tự từ cũ → mới.
 *
 * `months` query:
 *   - Không truyền → 6
 *   - Không hợp lệ (NaN, < 1, > 12) → service clamp về [1, 12]
 *
 * Response shape:
 *   {
 *     message,
 *     data: {
 *       months: ["2026-02", "2026-03", ...],
 *       users: [number, ...],
 *       files: [number, ...],
 *       notifications: [number, ...],
 *       generatedAt,
 *       range: { from, to }
 *     }
 *   }
 */
async function getMonthlyStats(req, res) {
  try {
    const raw = req.query.months;
    const parsed = raw == null || raw === "" ? 6 : Number(raw);
    // Service tự clamp [1, 12] + fallback về 6 nếu invalid
    const data = await dashboardService.getMonthlyStats({ months: parsed });
    res.status(200).json({
      message: "Lấy thống kê monthly thành công",
      data,
    });
  } catch (error) {
    console.error(
      "[dashboard.controller] getMonthlyStats error:",
      error && error.message ? error.message : error
    );
    res.status(500).json({
      message: "Lỗi hệ thống",
    });
  }
}

module.exports = { getOverview, getMonthlyStats };