/**
 * searchApi — global search (users / notifications / files).
 *
 * Endpoint thật (search.routes.js):
 *   GET /api/search?keyword=&type=&page=&limit=
 *
 * Validation BE:
 *   - keyword: bắt buộc, trim, tối đa 200 ký tự
 *   - type: 'users' | 'notifications' | 'files' | 'all' (mặc định 'all')
 *   - page: số nguyên >= 1 (mặc định 1)
 *   - limit: 1..100 (mặc định 10)
 *
 * Response shape (unwrap `data`):
 *   - type=all       → { keyword, type, users, notifications, files }
 *   - type=X (X!=all)→ { keyword, type, [X]: { items, total, page, limit } }
 *
 * Phân quyền:
 *   - Admin: thấy tất cả users.
 *   - Non-admin: users block trả rỗng; chỉ thấy notification/file của mình.
 */

import { apiFetch } from "../../shared/lib/api";
import type { UserRole, UserStatus } from "../users/userApi";

export const SEARCH_TYPES = [
  "all",
  "users",
  "notifications",
  "files",
] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  all: "Tất cả",
  users: "Người dùng",
  notifications: "Thông báo",
  files: "Tệp",
};

export interface SearchUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | (string & {});

export interface SearchNotification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
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
}

export interface SearchPaged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchResult {
  keyword: string;
  type: SearchType;
  users?: SearchPaged<SearchUser>;
  notifications?: SearchPaged<SearchNotification>;
  files?: SearchPaged<SearchFile>;
}

export interface SearchParams {
  keyword: string;
  type?: SearchType;
  page?: number;
  limit?: number;
}

export const SEARCH_KEYWORD_MAX = 200;
export const SEARCH_LIMIT_DEFAULT = 10;
export const SEARCH_LIMIT_MAX = 100;

export function validateKeyword(raw: string): {
  ok: boolean;
  error?: string;
  value: string;
} {
  if (typeof raw !== "string") return { ok: false, error: "Từ khoá không hợp lệ", value: "" };
  const value = raw.trim();
  if (value.length === 0) {
    return { ok: false, error: "Vui lòng nhập từ khoá tìm kiếm", value };
  }
  if (value.length > SEARCH_KEYWORD_MAX) {
    return { ok: false, error: `Từ khoá tối đa ${SEARCH_KEYWORD_MAX} ký tự`, value };
  }
  return { ok: true, value };
}

function buildQuery(params: SearchParams): string {
  const sp = new URLSearchParams();
  sp.set("keyword", params.keyword.trim());
  sp.set("type", params.type ?? "all");
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  sp.set("limit", String(params.limit ?? SEARCH_LIMIT_DEFAULT));
  return `?${sp.toString()}`;
}

export async function globalSearch(params: SearchParams): Promise<SearchResult> {
  const query = buildQuery(params);
  return apiFetch<SearchResult>(`/search${query}`);
}

// Convenience: tính totalPages từ block paginated.
export function totalPagesOf(block: SearchPaged<unknown> | undefined): number {
  if (!block || block.limit <= 0) return 1;
  return Math.max(1, Math.ceil(block.total / block.limit));
}