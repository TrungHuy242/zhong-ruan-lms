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

import { apiFetch } from "../../../shared/api";
import type {
  CreateSettingPayload,
  Setting,
  SettingListResponse,
  SettingOneResponse,
  UpdateSettingPayload,
} from "../types/setting.types";

export type {
  CreateSettingPayload,
  Setting,
  SettingListResponse,
  SettingOneResponse,
  UpdateSettingPayload,
  ValidationResult,
} from "../types/setting.types";
export {
  DESCRIPTION_MAX,
  KEY_MAX,
  KEY_REGEX,
  VALUE_MAX,
  validateSettingDescription,
  validateSettingKey,
  validateSettingValue,
} from "../constants/setting.constants";

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
