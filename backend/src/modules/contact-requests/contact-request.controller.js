/**
 * contact-request.controller.js — Admin API handlers.
 *
 * Mapping error.code → HTTP status. Tuân theo convention của
 * pricing-plan.controller.js.
 */

const contactRequestService = require("./contact-request.service");

function statusFromError(error) {
  let status = 400;
  if (error.code === "NOT_FOUND") status = 404;
  else if (error.code === "FORBIDDEN") status = 403;
  else if (error.code === "BAD_REQUEST") status = 400;
  return status;
}

// =====================================================================
// ADMIN handlers
// =====================================================================

async function listContacts(req, res) {
  try {
    const result = await contactRequestService.listContacts(req.query || {});
    res.json({
      message: "Lấy danh sách liên hệ thành công",
      data: {
        contacts: result.contacts,
        pagination: result.pagination,
        stats: result.stats,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
}

async function getContactById(req, res) {
  try {
    const contact = await contactRequestService.getContactById(req.params.id);
    res.json({
      message: "Lấy chi tiết liên hệ thành công",
      data: { contact },
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

async function updateContactStatus(req, res) {
  try {
    const contact = await contactRequestService.updateStatus(req.params.id, req.body || {}, req);
    res.json({
      message: "Cập nhật trạng thái liên hệ thành công",
      data: { contact },
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

async function deleteContact(req, res) {
  try {
    const result = await contactRequestService.deleteContact(req.params.id, req.user.id, req);
    res.json({
      message: "Đã chuyển liên hệ vào thùng rác (soft delete)",
      data: result,
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

async function restoreContact(req, res) {
  try {
    const result = await contactRequestService.restoreContact(req.params.id, req.user.id, req);
    res.json({
      message: "Khôi phục liên hệ thành công",
      data: result,
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

async function forceDeleteContact(req, res) {
  try {
    const result = await contactRequestService.forceDeleteContact(req.params.id, req.user.id, req);
    res.json({
      message: "Đã xóa cứng liên hệ khỏi database",
      data: result,
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

module.exports = {
  listContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
  restoreContact,
  forceDeleteContact,
};