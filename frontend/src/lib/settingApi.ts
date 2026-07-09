/**
 * settingApi — giao tiếp backend cho module System Settings.
 *
 * Endpoint thật (từ setting.routes.js + setting.service.js):
 *   - GET    /settings         : list (BE trả toàn bộ, không phân trang server)
 *   - GET    /settings/:key    : chi tiết (404 nếu không có)
 *   - POST   /settings         : tạo (409 nếu key trùng)
 *   - PUT    /settings/:key    : cập nhật value + description (không cho đổi key)
 *   - DELETE /settings/:key    : xoá (404 nếu không có)
 *
 * Tất cả route yêu cầu ADMIN (BE tự enforce; FE cũng ẩn nút với role khác
 * để UX tốt hơn nhưng không coi đó là bảo mật).
 *
 * Validation từ BE:
 *   - key: /^[a-z0-9_]+$/, max 100
 *   - value: string, max 5000
 *   - description: optional string, max 500
 *
 * FE cũng validate phía client để hiện error inline nhanh hơn (không thay
 * thế BE — vẫn coi message từ ApiError là nguồn sự thật).
 */

import { apiFetch } from "./api";

export interface Setting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettingListResponse {
  data: Setting[];
  total: number;
}

interface SettingOneResponse {
  setting: Setting;
}

export interface CreateSettingPayload {
  key: string;
  value: string;
  description?: string | null;
}

export interface UpdateSettingPayload {
  /** Không cho phép thay đổi key khi update — backend bỏ qua field này. */
  value?: string;
  description?: string | null;
}

export async function getSettings(): Promise<Setting[]> {
  const response = await apiFetch<SettingListResponse>("/settings");
  return Array.isArray(response.data) ? response.data : [];
}

export async function getSetting(key: string): Promise<Setting> {
  const response = await apiFetch<SettingOneResponse>(`/settings/${encodeURIComponent(key)}`);
  if (!response?.setting) throw new Error("Phản hồi từ máy chủ không hợp lệ");
  return response.setting;
}

export async function createSetting(payload: CreateSettingPayload): Promise<Setting> {
  const response = await apiFetch<SettingOneResponse>("/settings", {
    method: "POST",
    body: {
      key: payload.key.trim(),
      value: payload.value,
      description: payload.description ?? null,
    },
  });
  if (!response?.setting) throw new Error("Phản hồi từ máy chủ không hợp lệ");
  return response.setting;
}

export async function updateSetting(
  key: string,
  payload: UpdateSettingPayload
): Promise<Setting> {
  const response = await apiFetch<SettingOneResponse>(
    `/settings/${encodeURIComponent(key)}`,
    { method: "PUT", body: payload }
  );
  if (!response?.setting) throw new Error("Phản hồi từ máy chủ không hợp lệ");
  return response.setting;
}

export async function deleteSetting(key: string): Promise<void> {
  await apiFetch(`/settings/${encodeURIComponent(key)}`, { method: "DELETE" });
}

// ============== Validation helpers (mirror BE) ==============

export const KEY_REGEX = /^[a-z0-9_]+$/;
export const KEY_MAX = 100;
export const VALUE_MAX = 5000;
export const DESCRIPTION_MAX = 500;

export function validateSettingKey(raw: string): {
  ok: boolean;
  normalized?: string;
  error?: string;
} {
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

export function validateSettingValue(raw: string): {
  ok: boolean;
  error?: string;
} {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: false, error: "Value không được để trống" };
  }
  if (raw.length > VALUE_MAX) {
    return { ok: false, error: `Value không được dài quá ${VALUE_MAX} ký tự` };
  }
  return { ok: true };
}

export function validateSettingDescription(raw: string | null | undefined): {
  ok: boolean;
  error?: string;
} {
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