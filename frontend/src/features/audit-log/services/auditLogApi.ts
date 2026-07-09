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

import { apiFetch } from "../../../shared/api";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_PAGE_SIZE,
} from "../constants/audit.constants";
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
} from "../types/audit.types";
export {
  AUDIT_ACTIONS,
  AUDIT_ACTION_GROUPS,
  AUDIT_ACTION_LABELS,
  AUDIT_GROUP_LABELS,
  AUDIT_PAGE_SIZE,
} from "../constants/audit.constants";

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
