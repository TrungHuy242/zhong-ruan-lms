/**
 * setting.types — type/interface dùng riêng cho feature settings.
 */

/** Danh sách nhóm cấu hình — phải đồng bộ với backend `setting.constants.SETTING_GROUPS`. */
export type SettingGroup =
  | "General"
  | "Security"
  | "Upload"
  | "Notification"
  | "System";

export const SETTING_GROUPS: SettingGroup[] = [
  "General",
  "Security",
  "Upload",
  "Notification",
  "System",
];

/** Kiểu dữ liệu suy ra từ `value` — dùng cho quick-edit (Switch/Number/Text/Textarea). */
export type ValueKind = "boolean" | "number" | "json" | "longText" | "text";

export interface Setting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  group: SettingGroup | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettingListResponse {
  data: Setting[];
  total: number;
  filters?: {
    group?: string | null;
    search?: string | null;
  };
}

export interface SettingOneResponse {
  setting: Setting;
}

export interface CreateSettingPayload {
  key: string;
  value: string;
  description?: string | null;
  /** Group optional — BE whitelist 5 giá trị; null/undefined = chưa phân nhóm. */
  group?: SettingGroup | null;
}

export interface UpdateSettingPayload {
  /** Không cho phép thay đổi key khi update — backend bỏ qua field này. */
  value?: string;
  description?: string | null;
  group?: SettingGroup | null;
}

export interface ValidationResult {
  ok: boolean;
  normalized?: string;
  error?: string;
}

/** Param cho listSettings. */
export interface ListSettingsParams {
  group?: SettingGroup | null;
  search?: string | null;
}

/** Payload import từ JSON. */
export interface ImportSettingsPayload {
  settings: Array<{
    key: string;
    value: string;
    description?: string | null;
    group?: SettingGroup | null;
  }>;
}

export interface ImportSettingsResponse {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ key: string; reason: string }>;
}

export interface ExportSettingsResponse {
  exportedAt: string;
  version: number;
  settings: Setting[];
}