/**
 * search.types — type/interface dùng riêng cho feature search.
 */

import type { UserRole, UserStatus } from "../../users/types/user.types";
import type { SettingGroup } from "../../settings/types/setting.types";

export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | (string & {});

/**
 * Highlight trả về từ BE (search.service.buildItemHighlight).
 * - positions: { [field]: [[start, endExclusive], ...] } — Intl-friendly
 * - snippet:   { [field]: string } — text ngắn chứa match, có prefix/suffix "…"
 *
 * FE dùng positions để render <mark>...</mark>, snippet để hiển thị dòng preview ngắn.
 */
export interface SearchHighlight {
  positions?: Record<string, Array<[number, number]>>;
  snippet?: Record<string, string>;
}

export interface SearchUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  highlight?: SearchHighlight | null;
}

export interface SearchNotification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  highlight?: SearchHighlight | null;
}

export interface SearchFile {
  id: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedById: number;
  createdAt: string;
  highlight?: SearchHighlight | null;
}

export interface SearchSetting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  group: SettingGroup | null;
  updatedAt: string;
  highlight?: SearchHighlight | null;
}

export interface SearchPaged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Tổng kết nhanh — chỉ có ở mode "lightweight" (type=all).
 * Giúp FE hiển thị "X kết quả" mà không cần cộng tay.
 */
export interface SearchTotals {
  users: number;
  notifications: number;
  files: number;
  settings: number;
  grand: number;
}

export type SearchMode = "lightweight" | "detailed";

export interface SearchResult {
  keyword: string;
  type: SearchType;
  /** lightweight = type=all (limit cứng 5/module); detailed = single module. */
  mode?: SearchMode;
  /** Chỉ có khi mode=lightweight. */
  limitPerModule?: number;
  /** Chỉ có khi mode=lightweight. */
  totals?: SearchTotals;

  users?: SearchPaged<SearchUser>;
  notifications?: SearchPaged<SearchNotification>;
  files?: SearchPaged<SearchFile>;
  settings?: SearchPaged<SearchSetting>;
}

export interface SearchParams {
  keyword: string;
  type?: SearchType;
  page?: number;
  limit?: number;
}

// ===== Search History =====

export interface SearchHistoryItem {
  id: number;
  keyword: string;
  createdAt: string;
}

export interface SearchHistoryResponse {
  items: SearchHistoryItem[];
}

export interface SearchHistoryParams {
  /** 1..50, mặc định 10. */
  limit?: number;
}

export const SEARCH_TYPES = [
  "all",
  "users",
  "notifications",
  "files",
  "settings",
] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];