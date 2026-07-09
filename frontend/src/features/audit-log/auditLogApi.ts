/**
 * auditLogApi — giao tiếp với backend cho module Audit Log.
 *
 * Endpoint: GET /api/admin/audit-logs (chỉ Admin — đã enforce ở BE).
 *
 * BE filter params (controller.listAuditLogs):
 *   - userId    (number)
 *   - action    (string, exact match)
 *   - from      (ISO date string, inclusive) — vd "2026-07-01"
 *   - to        (ISO date string, inclusive) — vd "2026-07-09"
 *   - page      (number)
 *   - pageSize  (number)
 *
 * Response shape (sau apiFetch unwrap `data`):
 *   {
 *     items: AuditLog[],
 *     total: number,
 *     page: number,
 *     pageSize: number,
 *     totalPages: number,
 *   }
 *
 * BE không có endpoint riêng để lấy 1 audit-log detail → FE lấy từ list rồi
 * filter theo id. (Chỉ đọc, list có sẵn phân trang nên đây là approach đơn giản
 * và đúng với tinh thần read-only.)
 *
 * Search theo text (tên user / target description) — FE tự filter client-side
 * vì BE không có search param.
 */

import { apiFetch } from "../../shared/lib/api";
import type { UserRole } from "../users/userApi";

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

export const AUDIT_PAGE_SIZE = 10;

/**
 * Danh sách các action code có trong hệ thống — lấy từ grep BE source.
 * (BE không có endpoint trả enum; phải hard-code ở FE cho đồng bộ.)
 *
 * Thứ tự: nhóm theo domain (auth, user, notification, upload).
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

const GROUP_LABELS: Record<AuditActionGroup, string> = {
  create: "Tạo",
  update: "Sửa",
  delete: "Xoá",
  auth: "Đăng nhập/Đăng xuất",
  restore: "Khôi phục",
  other: "Khác",
};

export const AUDIT_GROUP_LABELS = GROUP_LABELS;

/**
 * BE chỉ trả 1 endpoint list — không có detail. Detail lấy bằng cách
 * fetch list rồi tìm theo id. List lớn nhưng search bằng id (number) là O(n).
 * Tuy nhiên list đã phân trang nên id có thể không nằm trong page hiện tại —
 * cần tìm kiếm trong toàn bộ bằng cách fetch với pageSize lớn.
 *
 * → Approach đơn giản: load lại list với pageSize = max và tìm id.
 * Khi FE dùng trong AuditLogDetailModal (1 user xem), pageSize=200 là đủ
 * với mọi màn hình admin thông thường (nếu >200 thì cần endpoint riêng — chưa có).
 */
export async function getAuditLog(id: number | string): Promise<AuditLog | null> {
  const all = await fetchAllRaw({ pageSize: 200 });
  const found = all.find((it) => String(it.id) === String(id));
  return found ?? null;
}

async function fetchAllRaw(params: AuditLogListParams = {}): Promise<AuditLog[]> {
  const qs = new URLSearchParams();
  if (params.userId) qs.set("userId", String(params.userId));
  if (params.action) qs.set("action", String(params.action));
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const path = `/admin/audit-logs${qs.toString() ? `?${qs}` : ""}`;
  const data = await apiFetch<AuditLog[]>(path);
  if (!Array.isArray(data)) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data;
}

/**
 * Lấy danh sách audit log, có phân trang client-side + search text client-side.
 * (BE filter exact match action/userId/from/to nhưng không có search — search làm ở FE.)
 */
export async function listAuditLogs(
  params: AuditLogListParams = {}
): Promise<AuditLogListResult> {
  // Lấy tối đa 1000 record mỗi lần để FE có dữ liệu cho search + filter.
  // (Nếu sau này >1000, cần BE endpoint search + pagination đúng cách.)
  const items = await fetchAllRaw({
    userId: params.userId,
    action: params.action || undefined,
    from: params.from,
    to: params.to,
    pageSize: 1000,
  });

  let filtered = items;
  const search = (params.search ?? "").trim().toLowerCase();
  if (search) {
    filtered = filtered.filter((it) => {
      const actor = it.user ? `${it.user.fullName} ${it.user.email}` : "";
      const target = it.target ?? "";
      const actionLabel = AUDIT_ACTION_LABELS[it.action] ?? "";
      return (
        actor.toLowerCase().includes(search) ||
        target.toLowerCase().includes(search) ||
        it.action.toLowerCase().includes(search) ||
        actionLabel.toLowerCase().includes(search)
      );
    });
  }

  const total = filtered.length;
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? AUDIT_PAGE_SIZE;
  const start = (page - 1) * pageSize;
  const sliced = filtered.slice(start, start + pageSize);

  return {
    items: sliced,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}