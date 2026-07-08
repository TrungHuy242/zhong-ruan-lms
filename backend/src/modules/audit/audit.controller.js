const auditService = require("./audit.service");

async function listAuditLogs(req, res) {
  try {
    const { userId, action, from, to, page, pageSize } = req.query;
    const result = await auditService.listLogs({
      userId: userId ? Number(userId) : null,
      action: action || null,
      from: from || null,
      to: to || null,
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

module.exports = { listAuditLogs };