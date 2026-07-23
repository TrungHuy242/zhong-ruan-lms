/**
 * contact-request.public.controller.js — Public API (không cần auth).
 *
 * Chỉ có 1 endpoint: POST /api/public/contact-requests
 * Validate + lưu DB + gửi email (best-effort) được xử lý trong service.
 */

const contactRequestService = require("./contact-request.service");

async function createContact(req, res) {
  try {
    const contact = await contactRequestService.createContact(req.body, req);
    res.status(201).json({
      message: "Gửi liên hệ thành công. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.",
      data: { contact },
    });
  } catch (error) {
    let status = 400;
    if (error.code === "BAD_REQUEST") status = 400;
    else if (error.code === "NOT_FOUND") status = 404;
    res.status(status).json({ message: error.message || "Gửi liên hệ thất bại" });
  }
}

module.exports = {
  createContact,
};