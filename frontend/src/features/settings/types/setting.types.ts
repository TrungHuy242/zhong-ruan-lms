/**
 * setting.types — type/interface dùng riêng cho feature settings.
 */

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

export interface SettingOneResponse {
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

export interface ValidationResult {
  ok: boolean;
  normalized?: string;
  error?: string;
}
