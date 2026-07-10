/**
 * audit.constants — const dùng riêng cho feature audit-log.
 */

import { AUDIT_ACTIONS, AUDIT_MODULES } from "../types/audit.types";
import type { AuditAction, AuditActionGroup, AuditModule } from "../types/audit.types";

export const AUDIT_PAGE_SIZE = 10;

/** Map action code → label tiếng Việt. */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  AUTH_LOGIN_SUCCESS: "Đăng nhập thành công",
  AUTH_LOGIN_FAIL: "Đăng nhập thất bại",
  AUTH_LOGOUT_SUCCESS: "Đăng xuất",
  AUTH_REGISTER_SUCCESS: "Đăng ký thành công",
  AUTH_REGISTER_FAIL: "Đăng ký thất bại",
  AUTH_CHANGE_PASSWORD_SUCCESS: "Đổi mật khẩu",
  ADMIN_USER_CREATED: "Tạo người dùng",
  ADMIN_USER_UPDATED: "Cập nhật người dùng",
  USER_SOFT_DELETE: "Xoá mềm người dùng",
  USER_SOFT_DELETE_BULK: "Xoá mềm hàng loạt",
  USER_STATUS_BULK_UPDATE: "Đổi trạng thái hàng loạt",
  USER_RESTORE: "Khôi phục người dùng",
  USER_FORCE_DELETE: "Xoá cứng người dùng",
  NOTIFICATION_SOFT_DELETE: "Xoá mềm thông báo",
  NOTIFICATION_RESTORE: "Khôi phục thông báo",
  NOTIFICATION_FORCE_DELETE: "Xoá cứng thông báo",
};

/** Phân nhóm theo trục CRUD/AUTH/RESTORE để chọn màu badge nhanh (cho bảng cũ). */
export const AUDIT_ACTION_GROUPS: Record<AuditAction, AuditActionGroup> = {
  AUTH_LOGIN_SUCCESS: "auth",
  AUTH_LOGIN_FAIL: "auth",
  AUTH_LOGOUT_SUCCESS: "auth",
  AUTH_REGISTER_SUCCESS: "auth",
  AUTH_REGISTER_FAIL: "auth",
  AUTH_CHANGE_PASSWORD_SUCCESS: "auth",
  ADMIN_USER_CREATED: "create",
  ADMIN_USER_UPDATED: "update",
  USER_SOFT_DELETE: "delete",
  USER_SOFT_DELETE_BULK: "delete",
  USER_STATUS_BULK_UPDATE: "update",
  USER_RESTORE: "restore",
  USER_FORCE_DELETE: "delete",
  NOTIFICATION_SOFT_DELETE: "delete",
  NOTIFICATION_RESTORE: "restore",
  NOTIFICATION_FORCE_DELETE: "delete",
};

export const AUDIT_GROUP_LABELS: Record<AuditActionGroup, string> = {
  create: "Tạo",
  update: "Sửa",
  delete: "Xoá",
  auth: "Đăng nhập/Đăng xuất",
  restore: "Khôi phục",
  other: "Khác",
};

/**
 * Bảng map action → tone theo yêu cầu task (#3):
 *
 *   CREATE → success      (xanh lá)
 *   UPDATE → warning      (vàng/cam)
 *   DELETE → error        (đỏ danger)
 *   LOGIN  → info         (xanh dương)
 *   LOGOUT → neutral      (xám / secondary)
 *
 * Dựa trên token semantic trong DESIGN.md. Mọi nhãn ngoài 5 trục này (VD:
 * AUTH_LOGIN_FAIL, USER_RESTORE, NOTIFICATION_*) rơi về tone phụ (`restore`,
 * `error`, ...) để vẫn có màu phù hợp ngữ nghĩa.
 */
export type AuditActionTone =
  | "create"      // green (success)
  | "update"      // orange (warning)
  | "delete"      // red (danger)
  | "login"       // blue (info)
  | "logout"      // neutral (gray)
  | "restore"     // orange/warning (reused)
  | "fail"        // red/danger (login fail)
  | "neutral";    // fallback (other)

export const AUDIT_ACTION_BADGES: Record<AuditAction, AuditActionTone> = {
  // AUTH — login/logout/fail/register
  AUTH_LOGIN_SUCCESS: "login",
  AUTH_LOGIN_FAIL: "fail",
  AUTH_LOGOUT_SUCCESS: "logout",
  AUTH_REGISTER_SUCCESS: "create",
  AUTH_REGISTER_FAIL: "fail",
  AUTH_CHANGE_PASSWORD_SUCCESS: "update",
  // Admin users
  ADMIN_USER_CREATED: "create",
  ADMIN_USER_UPDATED: "update",
  USER_SOFT_DELETE: "delete",
  USER_SOFT_DELETE_BULK: "delete",
  USER_STATUS_BULK_UPDATE: "update",
  USER_RESTORE: "restore",
  USER_FORCE_DELETE: "delete",
  // Notifications
  NOTIFICATION_SOFT_DELETE: "delete",
  NOTIFICATION_RESTORE: "restore",
  NOTIFICATION_FORCE_DELETE: "delete",
};

export const AUDIT_TONE_LABELS: Record<AuditActionTone, string> = {
  create: "Tạo",
  update: "Sửa",
  delete: "Xoá",
  login: "Đăng nhập",
  logout: "Đăng xuất",
  restore: "Khôi phục",
  fail: "Thất bại",
  neutral: "Khác",
};

/** Module label tiếng Việt cho filter dropdown. */
export const AUDIT_MODULE_LABELS: Record<AuditModule, string> = {
  User: "Người dùng",
  Auth: "Xác thực",
  UploadFile: "Tệp tin",
  Notification: "Thông báo",
};

/**
 * Map module → path trong app (để dùng cho "Xem đối tượng" trong detail).
 * Nếu module chưa có route riêng → undefined → không hiển thị nút.
 */
export const AUDIT_MODULE_ROUTE: Partial<Record<AuditModule, string>> = {
  User: "/users",
  Notification: "/notifications",
  UploadFile: "/files",
};

/** Re-export từ types để caller có thể import duy nhất từ constants. */
export { AUDIT_ACTIONS, AUDIT_MODULES };
export type { AuditAction, AuditActionGroup, AuditModule };
