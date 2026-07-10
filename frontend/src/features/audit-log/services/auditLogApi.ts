/**
 * auditLogApi — giao tiếp với backend cho module Audit Log.
 *
 * Endpoint: GET /api/admin/audit-logs          (list, chỉ Admin — BE đã enforce)
 * Endpoint: GET /api/admin/audit-logs/:id      (detail theo id — bổ sung ở bản nâng cấp)
 *
 * BE filter params (audit.controller.listAuditLogs):
 *   - userId    (number)
 *   - action    (string, exact match)
 *   - module    (string)              — match prefix của `target` (VD "User", "Auth")
 *   - from      (ISO date, inclusive) — vd "2026-07-01"
 *   - to        (ISO date, inclusive) — vd "2026-07-09"
 *   - search    (string)              — keyword search đa trường
 *   - page      (number)
 *   - pageSize  (number)
 *
 * Response shape:
 *   List  → apiFetch unwrap `data` → items (AuditLog[]) + pagination
 *   Detail → apiFetch unwrap `data.log` → AuditLog
 *
 * `meta` được redact ở BE (password / refreshToken / ...), không lộ field nhạy cảm.
 *
 * Sort: cố định `createdAt desc` ở BE. FE không cần truyền sort — đúng yêu cầu.
 */

import { apiFetch } from "../../../shared/api";
import { AUDIT_PAGE_SIZE } from "../constants/audit.constants";
import type {
  AuditLog,
  AuditLogListParams,
  AuditLogListResult,
} from "../types/audit.types";

export type {
  AuditAction,
  AuditActionGroup,
  AuditLog,
  AuditLogActor,
  AuditLogListParams,
  AuditLogListResult,
  AuditModule,
} from "../types/audit.types";
export {
  AUDIT_ACTIONS,
  AUDIT_ACTION_GROUPS,
  AUDIT_ACTION_LABELS,
  AUDIT_GROUP_LABELS,
  AUDIT_MODULES,
  AUDIT_MODULE_LABELS,
  AUDIT_PAGE_SIZE,
} from "../constants/audit.constants";

/**
 * Lấy danh sách audit log phân trang + filter + search từ BE.
 * BE đã lo search keyword + filter; FE chỉ truyền tham số và nhận items đã paginate.
 */
export async function listAuditLogs(
  params: AuditLogListParams = {}
): Promise<AuditLogListResult> {
  const qs = new URLSearchParams();
  if (params.userId) qs.set("userId", String(params.userId));
  if (params.action) qs.set("action", String(params.action));
  if (params.module) qs.set("module", String(params.module));
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.search) qs.set("search", String(params.search));
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));

  const path = `/admin/audit-logs${qs.toString() ? `?${qs}` : ""}`;
  // Backend response shape: { message, data: AuditLog[], pagination: {...} }
  const response = await apiFetch<{
    data: AuditLog[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>(path);

  return {
    items: Array.isArray(response.data) ? response.data : [],
    total: response.pagination?.total ?? 0,
    page: response.pagination?.page ?? 1,
    pageSize: response.pagination?.pageSize ?? AUDIT_PAGE_SIZE,
    totalPages:
      response.pagination?.totalPages ??
      Math.max(1, Math.ceil((response.pagination?.total ?? 0) / (response.pagination?.pageSize ?? AUDIT_PAGE_SIZE))),
  };
}

/**
 * Lấy chi tiết 1 audit log theo id.
 * Trả null nếu BE trả 404.
 */
export async function getAuditLog(id: number | string): Promise<AuditLog | null> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  try {
    const response = await apiFetch<{ data: { log: AuditLog } }>(
      `/admin/audit-logs/${numericId}`
    );
    return response?.data?.log ?? null;
  } catch (err) {
    // ApiError với status 404 → không tìm thấy
    if (err && typeof err === "object" && "status" in err && (err as { status?: number }).status === 404) {
      return null;
    }
    throw err;
  }
}
