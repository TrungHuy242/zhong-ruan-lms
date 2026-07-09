/**
 * setting.constants — const dùng riêng cho feature settings.
 */

import type { ValidationResult } from "../types/setting.types";

export const KEY_REGEX = /^[a-z0-9_]+$/;
export const KEY_MAX = 100;
export const VALUE_MAX = 5000;
export const DESCRIPTION_MAX = 500;

export function validateSettingKey(raw: string): ValidationResult {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: false, error: "Key không được để trống" };
  }
  const normalized = raw.trim();
  if (normalized.length > KEY_MAX) {
    return { ok: false, error: `Key không được dài quá ${KEY_MAX} ký tự` };
  }
  if (!KEY_REGEX.test(normalized)) {
    return {
      ok: false,
      error: "Key chỉ được chứa chữ thường, số và dấu gạch dưới (a-z, 0-9, _).",
    };
  }
  return { ok: true, normalized };
}

export function validateSettingValue(raw: string): ValidationResult {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: false, error: "Value không được để trống" };
  }
  if (raw.length > VALUE_MAX) {
    return { ok: false, error: `Value không được dài quá ${VALUE_MAX} ký tự` };
  }
  return { ok: true };
}

export function validateSettingDescription(raw: string | null | undefined): ValidationResult {
  if (raw === undefined || raw === null || raw === "") return { ok: true };
  if (typeof raw !== "string") return { ok: false, error: "Description phải là chuỗi" };
  if (raw.length > DESCRIPTION_MAX) {
    return {
      ok: false,
      error: `Description không được dài quá ${DESCRIPTION_MAX} ký tự`,
    };
  }
  return { ok: true };
}
