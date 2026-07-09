/**
 * audit.types — type/interface dùng riêng cho feature audit-log.
 */

import type { UserRole } from "../../users/types/user.types";

export interface AuditLogActor {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuditLog {
  id: number;
  userId: number | null;
  action: AuditAction;
  target: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  /** Null khi userId null (VD: login fail) hoặc user đã bị xoá. */
  user: AuditLogActor | null;
}

export interface AuditLogListParams {
  userId?: number;
  action?: AuditAction | "";
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AuditLogListResult {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Danh sách các action code có trong hệ thống — lấy từ grep BE source.
 * (BE không có endpoint trả enum; phải hard-code ở FE cho đồng bộ.)
 */
export const AUDIT_ACTIONS = [
  // Auth
  "AUTH_LOGIN_SUCCESS",
  "AUTH_LOGIN_FAIL",
  "AUTH_LOGOUT_SUCCESS",
  "AUTH_REGISTER_SUCCESS",
  "AUTH_REGISTER_FAIL",
  "AUTH_CHANGE_PASSWORD_SUCCESS",
  // Admin users
  "ADMIN_USER_CREATED",
  "ADMIN_USER_UPDATED",
  "USER_SOFT_DELETE",
  "USER_RESTORE",
  "USER_FORCE_DELETE",
  // Notifications
  "NOTIFICATION_SOFT_DELETE",
  "NOTIFICATION_RESTORE",
  "NOTIFICATION_FORCE_DELETE",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Map action code → label tiếng Việt + nhóm để hiển thị badge màu. */
export type AuditActionGroup = "create" | "update" | "delete" | "auth" | "restore" | "other";
