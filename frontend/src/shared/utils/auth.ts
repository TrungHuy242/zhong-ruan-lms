/**
 * auth.ts — hàm so sánh role dùng chung, chuẩn hóa không phân biệt hoa/thường.
 *
 * Dùng cho tất cả chỗ check role trong codebase, tránh so sánh strict (===)
 * mà không chuẩn hóa — gây lỗi ẩn menu khi backend trả role viết hoa/thường khác nhau.
 */

import type { UserRole } from "../storage/authStorage";

/** Chuẩn hóa role về uppercase + trim, hoặc null nếu không hợp lệ. */
export function normalizeRole(role: UserRole | string | null | undefined): UserRole | null {
  if (!role) return null;
  const normalized = String(role).trim().toUpperCase() as UserRole;
  if (normalized === "ADMIN" || normalized === "TEACHER" || normalized === "STUDENT") {
    return normalized;
  }
  return null;
}

/**
 * Kiểm tra user có vai trò phù hợp với danh sách allowedRoles.
 * - Nếu allowedRoles rỗng / undefined → luôn trả true (mọi role đều được).
 * - So sánh không phân biệt hoa/thường, an toàn với "admin", "Admin", "ADMIN".
 */
export function hasRole(
  userRole: UserRole | string | null | undefined,
  allowedRoles?: Array<UserRole | string> | readonly (UserRole | string)[]
): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const normalized = normalizeRole(userRole);
  if (!normalized) return false;
  return allowedRoles.some((r) => normalizeRole(r) === normalized);
}

/** Tiện ích: user có phải ADMIN (không phân biệt hoa/thường). */
export function isAdmin(role: UserRole | string | null | undefined): boolean {
  return normalizeRole(role) === "ADMIN";
}

/** Tiện ích: user có phải TEACHER (không phân biệt hoa/thường). */
export function isTeacher(role: UserRole | string | null | undefined): boolean {
  return normalizeRole(role) === "TEACHER";
}

/** Tiện ích: user có phải STUDENT (không phân biệt hoa/thường). */
export function isStudent(role: UserRole | string | null | undefined): boolean {
  return normalizeRole(role) === "STUDENT";
}
