/**
 * profile.constants — const + validation dùng riêng cho feature profile.
 */

import type {
  PasswordStrengthInfo,
  ProfileValidationResult,
} from "../types/profile.types";

export const FULL_NAME_MAX = 100;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;
export const ADDRESS_MAX = 255;
// Phone format rất tuỳ vùng — chỉ chấp nhận chữ số, khoảng trắng, +, -, độ dài hợp lý.
const PHONE_DIGITS_REGEX = /^[+0-9()\-\s]+$/;

// Common weak patterns (lowercase/uppercase) — nếu password khớp 1 pattern trong list → trừ điểm.
const COMMON_PATTERNS = [
  /^123+456*$/i,
  /^password\d*$/i,
  /^qwerty\d*$/i,
  /^abcdefg?\d*$/i,
  /^admin\d*$/i,
  /^letmein\d*$/i,
  /^welcome\d*$/i,
  /^iloveyou\d*$/i,
  /^1{3,}$/,
  /^(.)\1+$/, // chuỗi lặp ký tự đơn: "aaa", "111"
];

export function validateFullName(raw: string): ProfileValidationResult {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: false, error: "Vui lòng nhập họ tên" };
  }
  if (raw.trim().length > FULL_NAME_MAX) {
    return { ok: false, error: `Họ tên không được dài quá ${FULL_NAME_MAX} ký tự` };
  }
  return { ok: true };
}

export function validatePhone(
  raw: string | null | undefined
): ProfileValidationResult {
  if (raw === undefined || raw === null || raw.trim() === "") return { ok: true };
  const value = raw.trim();
  // Cho phép chuỗi 7–20 ký tự, chỉ chứa số và các ký tự định dạng phổ biến.
  if (value.length > 20) {
    return { ok: false, error: "Số điện thoại không được dài quá 20 ký tự" };
  }
  if (!PHONE_DIGITS_REGEX.test(value)) {
    return {
      ok: false,
      error: "Số điện thoại chỉ được chứa chữ số, khoảng trắng và các ký tự +, -, (, )",
    };
  }
  // Phải có ít nhất 7 chữ số thực sự.
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length < 7) {
    return { ok: false, error: "Số điện thoại không hợp lệ" };
  }
  return { ok: true };
}

export function validateAddress(
  raw: string | null | undefined
): ProfileValidationResult {
  if (raw === undefined || raw === null || raw.trim() === "") return { ok: true };
  const value = raw.trim();
  if (value.length > ADDRESS_MAX) {
    return {
      ok: false,
      error: `Địa chỉ không được dài quá ${ADDRESS_MAX} ký tự`,
    };
  }
  return { ok: true };
}

export function validatePassword(
  raw: string,
  options: { minLength?: number } = {}
): ProfileValidationResult {
  const min = options.minLength ?? PASSWORD_MIN;
  if (typeof raw !== "string" || raw.length === 0) {
    return { ok: false, error: "Mật khẩu không được để trống" };
  }
  if (raw.length < min) {
    return { ok: false, error: `Mật khẩu phải có ít nhất ${min} ký tự` };
  }
  if (raw.length > PASSWORD_MAX) {
    return { ok: false, error: `Mật khẩu không được dài quá ${PASSWORD_MAX} ký tự` };
  }
  return { ok: true };
}

// ===== Đánh giá độ mạnh mật khẩu =====
//
// Heuristic đơn giản nhưng hữu ích cho UX (KHÔNG thay thế password policy server-side).
// BE đã enforce: >= 6 ký tự; FE thêm các tiêu chí mạnh hơn để gợi ý user.
//
// Tiêu chí:
//   - length           (>=8 medium, >=10 strong, >=12 very strong)
//   - variety          (lower/upper/digit/symbol)
//   - no common pattern (qWerty, password, 123456, lặp ký tự đơn)
//
// Trả về PasswordStrengthInfo gồm level + label + tips.
export function evaluatePasswordStrength(raw: string): PasswordStrengthInfo {
  if (typeof raw !== "string" || raw.length === 0) {
    return { level: 0, label: "Trống", score: 0, tips: ["Nhập mật khẩu"] };
  }

  const value = raw;
  const tips: string[] = [];

  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  const varietyCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(
    Boolean
  ).length;
  const length = value.length;

  if (length < 8) tips.push("Nên dài ít nhất 8 ký tự");
  if (length < 12) tips.push("Dài 12+ ký tự sẽ mạnh hơn nhiều");
  if (!hasUpper) tips.push("Thêm chữ hoa");
  if (!hasDigit) tips.push("Thêm chữ số");
  if (!hasSymbol) tips.push("Thêm ký tự đặc biệt");

  const isCommon = COMMON_PATTERNS.some((re) => re.test(value));
  if (isCommon && length > 0) tips.push("Tránh pattern phổ biến (123, password, qwerty...)");

  let level: PasswordStrengthInfo["level"] = 1;
  if (length >= 12 && varietyCount === 4 && !isCommon) {
    level = 4;
  } else if (length >= 10 && varietyCount >= 3 && !isCommon) {
    level = 3;
  } else if (length >= 8 && varietyCount >= 2) {
    level = 2;
  } else if (length === 0) {
    level = 0;
  }

  const labels = ["Trống", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"] as const;
  // score = level/4, 0 cho empty
  const score = level === 0 ? 0 : level / 4;

  return {
    level,
    label: labels[level],
    score,
    tips,
  };
}
