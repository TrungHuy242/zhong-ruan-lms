const auditService = require("./audit.service");

/**
 * GET /api/admin/audit-logs
 *
 * Query params (backward-compatible — tất cả param cũ vẫn hoạt động):
 *   - userId    (number)             — exact match
 *   - action    (string)             — exact match (VD: "AUTH_LOGIN_SUCCESS")
 *   - module    (string)             — match prefix của `target` (VD: "User", "Auth", "UploadFile")
 *   - from      (ISO date string)    — inclusive, VD "2026-07-01"
 *   - to        (ISO date string)    — inclusive, VD "2026-07-09"
 *   - search    (string)             — keyword search đa trường (xem service)
 *   - page      (number)             — mặc định 1
 *   - pageSize  (number)             — mặc định 20, tối đa 100
 *
 * Sort mặc định: createdAt desc (mới nhất trước).
 * `meta` đã được redact (password / refreshToken / ...) tại service.
 */
async function listAuditLogs(req, res) {
  try {
    const { userId, action, module, from, to, search, page, pageSize } = req.query;
    const result = await auditService.listLogs({
      userId: userId ? Number(userId) : null,
      action: action || null,
      module: module || null,
      from: from || null,
      to: to || null,
      search: search ? String(search) : null,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });

    res.json({
      message: "Lấy danh sách audit log thành công",
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("[audit.controller] listAuditLogs error:", error && error.message ? error.message : error);
    res.status(500).json({
      message: "Lỗi hệ thống",
    });
  }
}

/**
 * GET /api/admin/audit-logs/:id
 *
 * Trả chi tiết 1 audit log. Trả 404 khi không tìm thấy / id không hợp lệ.
 * Không trả field nhạy cảm (đã redact tại service).
 */
async function getAuditLogById(req, res) {
  try {
    const log = await auditService.getLogById(req.params.id);
    if (!log) {
      return res.status(404).json({
        message: "Không tìm thấy nhật ký",
      });
    }
    res.json({
      message: "Lấy chi tiết audit log thành công",
      data: { log },
    });
  } catch (error) {
    console.error("[audit.controller] getAuditLogById error:", error && error.message ? error.message : error);
    res.status(500).json({
      message: "Lỗi hệ thống",
    });
  }
}

module.exports = { listAuditLogs, getAuditLogById };
