/**
 * settingApi — giao tiếp backend cho module System Settings.
 *
 * Endpoint (từ setting.routes.js):
 *   - GET    /settings           : list (?group=...&search=...) — BE filter
 *   - GET    /settings/:key      : chi tiết
 *   - POST   /settings           : tạo (409 nếu key trùng)
 *   - PUT    /settings/:key      : cập nhật value/description/group
 *   - DELETE /settings/:key      : xoá
 *   - GET    /settings/export    : snapshot toàn bộ setting
 *   - POST   /settings/import    : import từ JSON payload (?replace=true|false)
 *
 * Tất cả route yêu cầu ADMIN (BE tự enforce).
 *
 * Validation từ BE:
 *   - key: /^[a-z0-9_]+$/, max 100
 *   - value: string, max 5000
 *   - description: optional string, max 500
 *   - group: whitelist (General | Security | Upload | Notification | System)
 *
 * FE cũng validate phía client để hiện error inline nhanh hơn (không thay
 * thế BE — vẫn coi message từ ApiError là nguồn sự thật).
 */

import { apiFetch } from "../../../shared/api";
import type {
  CreateSettingPayload,
  ExportSettingsResponse,
  ImportSettingsPayload,
  ImportSettingsResponse,
  ListSettingsParams,
  Setting,
  SettingGroup,
  SettingListResponse,
  SettingOneResponse,
  UpdateSettingPayload,
  ValueKind,
} from "../types/setting.types";

export type {
  CreateSettingPayload,
  ExportSettingsResponse,
  ImportSettingsPayload,
  ImportSettingsResponse,
  ListSettingsParams,
  Setting,
  SettingGroup,
  SettingListResponse,
  SettingOneResponse,
  UpdateSettingPayload,
  ValueKind,
} from "../types/setting.types";
export { SETTING_GROUPS } from "../types/setting.types";
export {
  DESCRIPTION_MAX,
  KEY_MAX,
  KEY_REGEX,
  VALUE_MAX,
  validateSettingDescription,
  validateSettingKey,
  validateSettingValue,
} from "../constants/setting.constants";

// ===== CRUD =====

/**
 * Lấy danh sách setting, có filter theo group + search keyword.
 * BE hiện tại sort ASC theo (group, key) — không phân trang.
 */
export async function getSettings(params: ListSettingsParams = {}): Promise<Setting[]> {
  const search = new URLSearchParams();
  if (params.group) search.set("group", params.group);
  if (params.search && params.search.trim()) search.set("search", params.search.trim());
  const qs = search.toString();
  const url = qs ? `/settings?${qs}` : "/settings";
  const response = await apiFetch<SettingListResponse>(url);
  return Array.isArray(response.data) ? response.data : [];
}

export async function getSetting(key: string): Promise<Setting> {
  const response = await apiFetch<SettingOneResponse>(`/settings/${encodeURIComponent(key)}`);
  if (!response?.setting) throw new Error("Phản hồi từ máy chủ không hợp lệ");
  return response.setting;
}

export async function createSetting(payload: CreateSettingPayload): Promise<Setting> {
  const groupValue: SettingGroup | null | undefined =
    payload.group === undefined ? undefined : payload.group;
  const response = await apiFetch<SettingOneResponse>("/settings", {
    method: "POST",
    body: {
      key: payload.key.trim(),
      value: payload.value,
      description: payload.description ?? null,
      group: groupValue ?? null,
    },
  });
  if (!response?.setting) throw new Error("Phản hồi từ máy chủ không hợp lệ");
  return response.setting;
}

export async function updateSetting(
  key: string,
  payload: UpdateSettingPayload
): Promise<Setting> {
  const body: UpdateSettingPayload = {};
  if (payload.value !== undefined) body.value = payload.value;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.group !== undefined) body.group = payload.group;

  const response = await apiFetch<SettingOneResponse>(
    `/settings/${encodeURIComponent(key)}`,
    { method: "PUT", body }
  );
  if (!response?.setting) throw new Error("Phản hồi từ máy chủ không hợp lệ");
  return response.setting;
}

export async function deleteSetting(key: string): Promise<void> {
  await apiFetch(`/settings/${encodeURIComponent(key)}`, { method: "DELETE" });
}

// ===== Import / Export =====

/** Lấy snapshot toàn bộ setting từ BE (đã sort ASC). */
export async function exportSettings(): Promise<ExportSettingsResponse> {
  const response = await apiFetch<{
    message: string;
    data: ExportSettingsResponse;
  }>("/settings/export");
  if (!response?.data) throw new Error("Phản hồi từ máy chủ không hợp lệ");
  return response.data;
}

/**
 * Import setting từ payload JSON.
 * `replace`: true (default) → upsert; false → skip nếu key tồn tại.
 */
export async function importSettings(
  payload: ImportSettingsPayload,
  replace: boolean = true
): Promise<ImportSettingsResponse> {
  const url = `/settings/import?replace=${replace ? "true" : "false"}`;
  const response = await apiFetch<{
    message: string;
    data: ImportSettingsResponse;
  }>(url, { method: "POST", body: payload });
  if (!response?.data) throw new Error("Phản hồi từ máy chủ không hợp lệ");
  return response.data;
}

// ===== Helper: detectValueKind =====

const LONG_TEXT_THRESHOLD = 120;

/**
 * Đoán kiểu dữ liệu từ raw value string để quyết định render control
 * nào trong quick-edit.
 *
 *   - "true" / "false"  → boolean (Switch)
 *   - số thuần (int/float, optional âm) → number (Input Number)
 *   - JSON object/array hợp lệ        → json (Textarea, read-only — khuyến nghị mở modal)
 *   - dài > 120 ký tự                  → longText (Textarea)
 *   - còn lại                          → text (Input)
 */
export function detectValueKind(raw: string): ValueKind {
  if (typeof raw !== "string") return "text";
  const trimmed = raw.trim();
  if (trimmed === "true" || trimmed === "false") return "boolean";

  // number: parse được, và toString lại đúng như ban đầu
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isNaN(n) && String(n) === trimmed) return "number";
    // Nếu số dạng "01", "00", parse về 1 thì toString khác → coi là text
  }

  // json
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // không phải JSON hợp lệ
    }
  }

  if (trimmed.length > LONG_TEXT_THRESHOLD) return "longText";
  return "text";
}

/** Helper UI: chuyển value "true"/"false" → boolean thật cho Switch. */
export function valueToBoolean(raw: string): boolean {
  return raw.trim() === "true";
}

/** Helper UI: chuyển boolean ngược lại thành "true"/"false" cho BE. */
export function booleanToValue(v: boolean): string {
  return v ? "true" : "false";
}