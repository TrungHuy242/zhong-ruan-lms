/**
 * search.constants — const + validation dùng riêng cho feature search.
 */

import { SEARCH_TYPES } from "../types/search.types";
import type { SearchType } from "../types/search.types";

export const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  all: "Tất cả",
  users: "Người dùng",
  notifications: "Thông báo",
  files: "Tệp",
};

export const SEARCH_KEYWORD_MAX = 200;
export const SEARCH_LIMIT_DEFAULT = 10;
export const SEARCH_LIMIT_MAX = 100;

export interface KeywordValidationResult {
  ok: boolean;
  error?: string;
  value: string;
}

export function validateKeyword(raw: string): KeywordValidationResult {
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

/** Re-export từ types để caller có thể import duy nhất từ constants. */
export { SEARCH_TYPES };
export type { SearchType };
