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

import { apiFetch } from "../../../shared/api";
import { SEARCH_LIMIT_DEFAULT } from "../constants/search.constants";
import type {
  SearchParams,
  SearchPaged,
  SearchResult,
} from "../types/search.types";

export type {
  SearchFile,
  SearchNotification,
  SearchParams,
  SearchPaged,
  SearchResult,
  SearchType,
  SearchUser,
  NotificationType,
} from "../types/search.types";
export {
  SEARCH_KEYWORD_MAX,
  SEARCH_LIMIT_DEFAULT,
  SEARCH_LIMIT_MAX,
  SEARCH_TYPES,
  SEARCH_TYPE_LABELS,
  validateKeyword,
} from "../constants/search.constants";

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
