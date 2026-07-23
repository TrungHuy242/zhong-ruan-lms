/**
 * contact-request.helpers.js — Helper dùng chung cho module ContactRequest.
 *
 * - validateContactPayload(...): Validate input create từ public form.
 *   Phone: định dạng VN (10 số, đầu 03/05/07/08/09 — hoặc +84).
 *   Email: regex cơ bản.
 *   Message: tối thiểu 10 ký tự sau trim.
 * - notFound/badRequest: Error có code để controller map HTTP.
 */

const MAX_FULL_NAME = 100;
const MAX_EMAIL = 254; // RFC 5321 max email length
const MAX_PHONE = 20;
const MAX_MESSAGE = 5000;
const MIN_MESSAGE = 10;

const ALLOWED_STATUSES = new Set(["NEW", "CONTACTED", "CLOSED"]);

// VN phone: bắt đầu bằng 0 (10 số) hoặc +84 (11-12 số).
// Chấp nhận có khoảng trắng giữa các nhóm khi user paste từ clipboard.
const PHONE_VN_REGEX = /^(?:\+?84|0)\s?(?:3|5|7|8|9)\d(?:[\s.-]?\d){7}$/;

// Email: đơn giản nhưng đủ dùng cho lead form public.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function validateContactPayload(payload, { isUpdate = false } = {}) {
  if (!payload || typeof payload !== "object") {
    throw badRequest("payload không hợp lệ");
  }

  // fullName (required on create)
  if (!isUpdate || payload.fullName !== undefined) {
    const name = trimOrNull(payload.fullName);
    if (!name) {
      throw badRequest(isUpdate ? "fullName không được để trống" : "Vui lòng nhập họ và tên");
    }
    if (name.length > MAX_FULL_NAME) {
      throw badRequest(`Họ tên không được dài quá ${MAX_FULL_NAME} ký tự`);
    }
  }

  // phone (required on create) — định dạng VN
  if (!isUpdate || payload.phone !== undefined) {
    const phoneRaw = trimOrNull(payload.phone);
    if (!phoneRaw) {
      throw badRequest(isUpdate ? "phone không được để trống" : "Vui lòng nhập số điện thoại");
    }
    if (phoneRaw.length > MAX_PHONE) {
      throw badRequest(`Số điện thoại không được dài quá ${MAX_PHONE} ký tự`);
    }
    if (!PHONE_VN_REGEX.test(phoneRaw)) {
      throw badRequest("Số điện thoại không đúng định dạng Việt Nam (VD: 0912345678 hoặc +84912345678)");
    }
  }

  // email (required on create) — định dạng email
  if (!isUpdate || payload.email !== undefined) {
    const emailRaw = trimOrNull(payload.email);
    if (!emailRaw) {
      throw badRequest(isUpdate ? "email không được để trống" : "Vui lòng nhập email");
    }
    if (emailRaw.length > MAX_EMAIL) {
      throw badRequest(`Email không được dài quá ${MAX_EMAIL} ký tự`);
    }
    if (!EMAIL_REGEX.test(emailRaw)) {
      throw badRequest("Email không đúng định dạng");
    }
  }

  // message (required on create) — tối thiểu 10 ký tự
  if (!isUpdate || payload.message !== undefined) {
    const msg = trimOrNull(payload.message);
    if (!msg) {
      throw badRequest(isUpdate ? "message không được để trống" : "Vui lòng nhập nội dung liên hệ");
    }
    if (msg.length < MIN_MESSAGE) {
      throw badRequest(`Nội dung phải có ít nhất ${MIN_MESSAGE} ký tự`);
    }
    if (msg.length > MAX_MESSAGE) {
      throw badRequest(`Nội dung không được dài quá ${MAX_MESSAGE} ký tự`);
    }
  }
}

function validateStatus(status) {
  const s = trimOrNull(status);
  if (!s) return null;
  if (!ALLOWED_STATUSES.has(s)) {
    throw badRequest(`status phải là một trong: ${Array.from(ALLOWED_STATUSES).join(", ")}`);
  }
  return s;
}

function badRequest(message) {
  const e = new Error(message);
  e.code = "BAD_REQUEST";
  return e;
}

function notFound(message = "Không tìm thấy yêu cầu liên hệ") {
  const e = new Error(message);
  e.code = "NOT_FOUND";
  return e;
}

module.exports = {
  validateContactPayload,
  validateStatus,
  ALLOWED_STATUSES,
  PHONE_VN_REGEX,
  EMAIL_REGEX,
  badRequest,
  notFound,
};