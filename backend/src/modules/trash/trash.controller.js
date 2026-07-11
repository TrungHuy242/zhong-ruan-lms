/**
 * trash.controller.js — HTTP layer cho module Trash Manager.
 *
 * Tất cả endpoint đều yêu cầu quyền ADMIN (route sẽ gắn authorizeRoles).
 *
 * Endpoint:
 *   GET    /api/trash?module=&deletedById=&from=&to=&keyword=&page=&limit=
 *   POST   /api/trash/:module/:id/restore
 *   DELETE /api/trash/:module/:id
 *   POST   /api/trash/bulk-restore       body: { items: [{module, id}] }
 *   POST   /api/trash/bulk-force-delete  body: { items: [{module, id}] }
 */

const service = require("./trash.service");

function statusFromError(error) {
  if (error && error.code === "BAD_REQUEST") return 400;
  if (error && error.code === "NOT_FOUND") return 404;
  return 500;
}

// ===== GET /trash =====
async function list(req, res) {
  try {
    const {
      module: mod,
      deletedById,
      from,
      to,
      keyword,
      page,
      limit,
    } = req.query || {};
    const result = await service.listTrash({
      module: mod || null,
      deletedById: deletedById || null,
      from: from || null,
      to: to || null,
      keyword: keyword || null,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    res.json({
      message: "Lấy danh sách thùng rác thành công",
      data: result,
    });
  } catch (error) {
    console.error("[trash.controller] list error:", error.message);
    res
      .status(statusFromError(error))
      .json({ message: error.message || "Lỗi hệ thống" });
  }
}

// ===== POST /trash/:module/:id/restore =====
async function restore(req, res) {
  try {
    const { module: mod, id } = req.params;
    const result = await service.restoreOne(mod, id, req.user.id, req);
    res.json({
      message: "Khôi phục bản ghi thành công",
      data: result,
    });
  } catch (error) {
    console.error("[trash.controller] restore error:", error.message);
    res
      .status(statusFromError(error))
      .json({ message: error.message || "Lỗi hệ thống" });
  }
}

// ===== DELETE /trash/:module/:id =====
// Force-delete 1 record.
async function forceDelete(req, res) {
  try {
    const { module: mod, id } = req.params;
    const result = await service.forceDeleteOne(mod, id, req.user.id, req);
    res.json({
      message: "Xoá vĩnh viễn bản ghi thành công",
      data: result,
    });
  } catch (error) {
    console.error("[trash.controller] forceDelete error:", error.message);
    res
      .status(statusFromError(error))
      .json({ message: error.message || "Lỗi hệ thống" });
  }
}

// ===== POST /trash/bulk-restore =====
async function bulkRestore(req, res) {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const result = await service.bulkRestore(items, req.user.id, req);
    res.json({
      message: `Khôi phục hàng loạt: ${result.success} thành công, ${result.failed} thất bại`,
      data: result,
    });
  } catch (error) {
    console.error("[trash.controller] bulkRestore error:", error.message);
    res
      .status(statusFromError(error))
      .json({ message: error.message || "Lỗi hệ thống" });
  }
}

// ===== POST /trash/bulk-force-delete =====
async function bulkForceDelete(req, res) {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const result = await service.bulkForceDelete(items, req.user.id, req);
    res.json({
      message: `Xoá vĩnh viễn hàng loạt: ${result.success} thành công, ${result.failed} thất bại`,
      data: result,
    });
  } catch (error) {
    console.error("[trash.controller] bulkForceDelete error:", error.message);
    res
      .status(statusFromError(error))
      .json({ message: error.message || "Lỗi hệ thống" });
  }
}

module.exports = {
  list,
  restore,
  forceDelete,
  bulkRestore,
  bulkForceDelete,
};