/**
 * audit.constants — const dùng riêng cho feature audit-log.
 */

import { AUDIT_ACTIONS } from "../types/audit.types";
import type { AuditAction, AuditActionGroup } from "../types/audit.types";

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
  USER_RESTORE: "Khôi phục người dùng",
  USER_FORCE_DELETE: "Xoá cứng người dùng",
  NOTIFICATION_SOFT_DELETE: "Xoá mềm thông báo",
  NOTIFICATION_RESTORE: "Khôi phục thông báo",
  NOTIFICATION_FORCE_DELETE: "Xoá cứng thông báo",
};

/** Phân nhóm để chọn màu badge trong UI. */
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

/** Re-export từ types để caller có thể import duy nhất từ constants. */
export { AUDIT_ACTIONS };
export type { AuditAction, AuditActionGroup };
