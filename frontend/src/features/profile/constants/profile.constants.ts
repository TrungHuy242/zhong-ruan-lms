/**
 * profile.constants — const + validation dùng riêng cho feature profile.
 */

import type { ProfileValidationResult } from "../types/profile.types";

export const FULL_NAME_MAX = 100;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;
// Phone format rất tuỳ vùng — chỉ chấp nhận chữ số, khoảng trắng, +, -, độ dài hợp lý.
const PHONE_DIGITS_REGEX = /^[+0-9()\-\s]+$/;

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
