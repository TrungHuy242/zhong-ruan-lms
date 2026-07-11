/**
 * searchApi — global search (users / notifications / files / settings).
 *
 * Endpoint thật (search.routes.js):
 *   GET    /api/search?keyword=&type=&page=&limit=
 *   GET    /api/search/history?limit=10
 *   DELETE /api/search/history
 *
 * Validation BE:
 *   - keyword: bắt buộc, trim, tối đa 200 ký tự
 *   - type: 'users' | 'notifications' | 'files' | 'settings' | 'all' (mặc định 'all')
 *   - page:   số nguyên >= 1 (mặc định 1) — KHÔNG dùng khi type=all
 *   - limit:  1..100 (mặc định 10) — KHÔNG dùng khi type=all (BE cứng = 5)
 *
 * Response shape (unwrap `data`):
 *   - type=all (lightweight): { keyword, type, mode, limitPerModule, users,
 *                              notifications, files, settings, totals }
 *   - type=X  (detailed):     { keyword, type, mode, [X]: { items, total, page, limit } }
 *
 * Mỗi item có thêm `highlight: { positions, snippet }` để FE render <mark>.
 *
 * Phân quyền:
 *   - Admin: thấy tất cả users + settings.
 *   - Non-admin: users/settings block trả rỗng; chỉ thấy notification/file của mình.
 *
 * History (GET /api/search/history):
 *   - Trả tối đa 10 keyword gần nhất của user hiện tại.
 *   - Keyword trùng (case-insensitive) sẽ được "di chuyển" lên đầu (đã search lại).
 */

import { apiFetch } from "../../../shared/api";
import { SEARCH_LIMIT_DEFAULT } from "../constants/search.constants";
import type {
  SearchHistoryItem,
  SearchHistoryParams,
  SearchHistoryResponse,
  SearchParams,
  SearchPaged,
  SearchResult,
} from "../types/search.types";

export type {
  SearchFile,
  SearchHighlight,
  SearchHistoryItem,
  SearchHistoryParams,
  SearchHistoryResponse,
  SearchMode,
  SearchNotification,
  SearchParams,
  SearchPaged,
  SearchResult,
  SearchSetting,
  SearchTotals,
  SearchType,
  SearchUser,
  NotificationType,
} from "../types/search.types";
export {
  SEARCH_HISTORY_LIMIT,
  SEARCH_HISTORY_MAX,
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
  // Khi type=all, BE bỏ qua page/limit — không gửi để URL gọn.
  if (params.type === "all") {
    // pass
  } else {
    if (params.page && params.page > 1) sp.set("page", String(params.page));
    if (params.limit && params.limit !== SEARCH_LIMIT_DEFAULT) {
      sp.set("limit", String(params.limit));
    }
  }
  return `?${sp.toString()}`;
}

export async function globalSearch(params: SearchParams): Promise<SearchResult> {
  const query = buildQuery(params);
  return apiFetch<SearchResult>(`/search${query}`);
}

/**
 * Lấy lịch sử từ khoá tìm kiếm gần nhất của user hiện tại.
 * Mặc định 10, tối đa 50 (theo BE).
 */
export async function getSearchHistory(
  params: SearchHistoryParams = {}
): Promise<SearchHistoryItem[]> {
  const sp = new URLSearchParams();
  if (params.limit && params.limit > 0) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  const data = await apiFetch<SearchHistoryResponse>(
    `/search/history${qs ? `?${qs}` : ""}`
  );
  return data?.items ?? [];
}

/**
 * Xoá toàn bộ lịch sử tìm kiếm của user hiện tại.
 */
export async function clearSearchHistory(): Promise<{ deleted: number }> {
  const data = await apiFetch<{ deleted: number }>("/search/history", {
    method: "DELETE",
  });
  return { deleted: data?.deleted ?? 0 };
}

/**
 * Xoá 1 mục trong lịch sử tìm kiếm (chỉ self).
 * - Trả về true nếu xoá thành công (200)
 * - Throw ApiError nếu 403/404/400 (component xử lý thông báo phù hợp)
 */
export async function deleteSearchHistoryItem(id: number): Promise<boolean> {
  if (!Number.isFinite(id) || id <= 0) return false;
  const data = await apiFetch<{ id: number }>(
    `/search/history/${encodeURIComponent(String(id))}`,
    { method: "DELETE" }
  );
  return data?.id != null;
}

// Convenience: tính totalPages từ block paginated.
export function totalPagesOf(block: SearchPaged<unknown> | undefined): number {
  if (!block || block.limit <= 0) return 1;
  return Math.max(1, Math.ceil(block.total / block.limit));
}