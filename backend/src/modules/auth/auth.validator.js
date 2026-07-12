// Helper validate + normalize input cho module Auth.
// Tái sử dụng giữa register/login/change-password/forgot-password/reset-password
// và updateProfile. Đặt cùng thư mục auth theo pattern của project (không có
// thư mục validators/ riêng).
//
// Quy tắc:
//   - Email: trim + lowercase + regex chuẩn.
//   - Phone: trim, bỏ khoảng trắng/dấu gạch giữa/dấu chấm/dấu cộng (giữ leading +),
//     validate 10-11 chữ số (chuẩn VN: 0xxxxxxxxx hoặc 0xxxxxxxxxx; với +84 prefix
//     sau khi strip + thì 9-10 số). Validate format cho phép extension quốc tế đơn giản.
//   - fullName: trim, length 1-100.
//   - password: trim (loại bỏ space đầu/cuối), length 6-128, không toàn whitespace.
//   - Mọi validate throw Error với message rõ ràng để controller trả 400.

const MAX_FULL_NAME = 100;
const MIN_PASSWORD_LEN = 6;
const MAX_PASSWORD_LEN = 128;
const MAX_EMAIL_LEN = 255;
const MIN_PHONE_DIGITS = 9;
const MAX_PHONE_DIGITS = 11;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  if (value === undefined || value === null) return null;
  return String(value).trim().toLowerCase();
}

function validateEmail(raw) {
  const email = normalizeEmail(raw);
  if (!email) {
    throw new Error("Email không được để trống");
  }
  if (email.length > MAX_EMAIL_LEN) {
    throw new Error(`Email không được dài quá ${MAX_EMAIL_LEN} ký tự`);
  }
  if (!EMAIL_RE.test(email)) {
    throw new Error("Email không đúng định dạng");
  }
  return email;
}

function normalizeFullName(value) {
  if (value === undefined || value === null) return null;
  return String(value).trim();
}

function validateFullName(raw) {
  const name = normalizeFullName(raw);
  if (!name) {
    throw new Error("Họ tên không được để trống");
  }
  if (name.length > MAX_FULL_NAME) {
    throw new Error(`Họ tên không được dài quá ${MAX_FULL_NAME} ký tự`);
  }
  return name;
}

function normalizePhone(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Bỏ space, dấu gạch giữa, dấu chấm, dấu ngoặc. Giữ dấu + ở đầu.
  return trimmed.replace(/[\s\-.]/g, "").replace(/[()]/g, "");
}

function validatePhone(raw) {
  const phone = normalizePhone(raw);
  if (!phone) return null; // phone optional
  // Cho phép + ở đầu (quốc tế) hoặc bắt đầu bằng 0 (nội địa VN).
  const phoneRe = /^\+?\d{9,11}$/;
  if (!phoneRe.test(phone)) {
    throw new Error("Số điện thoại không đúng định dạng");
  }
  const digits = phone.replace(/^\+/, "");
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
    throw new Error(`Số điện thoại phải có ${MIN_PHONE_DIGITS}-${MAX_PHONE_DIGITS} chữ số`);
  }
  return phone;
}

function validatePassword(raw, label = "Mật khẩu") {
  if (raw === undefined || raw === null) {
    throw new Error(`${label} không được để trống`);
  }
  if (typeof raw !== "string") {
    throw new Error(`${label} không hợp lệ`);
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error(`${label} không được để trống`);
  }
  if (raw.length < MIN_PASSWORD_LEN) {
    throw new Error(`${label} phải có ít nhất ${MIN_PASSWORD_LEN} ký tự`);
  }
  if (raw.length > MAX_PASSWORD_LEN) {
    throw new Error(`${label} không được dài quá ${MAX_PASSWORD_LEN} ký tự`);
  }
  // Reject nếu raw chỉ chứa whitespace (ví dụ "      ").
  if (trimmed.length === 0 && raw.length > 0) {
    throw new Error(`${label} không được chỉ chứa khoảng trắng`);
  }
  return raw; // giữ nguyên raw để cho phép ký tự đặc biệt ở giữa
}

function validateEmailOptional(raw) {
  // Cho forgot-password: nếu không có hoặc rỗng → trả null (không throw để
  // tránh lộ thông tin), nếu có thì phải đúng format.
  if (raw === undefined || raw === null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  return validateEmail(trimmed);
}

module.exports = {
  normalizeEmail,
  validateEmail,
  validateEmailOptional,
  normalizeFullName,
  validateFullName,
  normalizePhone,
  validatePhone,
  validatePassword,
  MAX_FULL_NAME,
  MIN_PASSWORD_LEN,
  MAX_PASSWORD_LEN,
};