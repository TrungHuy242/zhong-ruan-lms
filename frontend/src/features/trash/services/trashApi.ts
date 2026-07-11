/**
 * trashApi — giao tiếp với backend cho màn Trash Manager.
 *
 * Có 2 lớp API:
 *   1. Legacy functions (listTrashedUsers/Notifications/Files, restoreX, forceDeleteX):
 *      dùng endpoint riêng của từng module. Giữ để không phá các caller cũ.
 *
 *   2. V2 functions (listTrashV2, restoreItem, forceDeleteItem, bulkRestore, bulkForceDelete):
 *      dùng endpoint thống nhất /api/trash do module trash mới cung cấp
 *      (xem backend/src/modules/trash/trash.service.js). Trả payload đã được
 *      BE enrich sẵn (module, deletedBy, label) — FE không cần tự serialize.
 *
 * TrashManagerPage sẽ dùng V2 (gọn hơn, có Settings + filter + bulk).
 */

import { apiFetch } from "../../../shared/api";
import {
  TRASH_LARGE_PAGE_SIZE,
  TRASH_PAGE_SIZE_DEFAULT,
} from "../constants/trash.constants";
import type {
  BulkResponse,
  BulkTrashItem,
  ListTrashV2Params,
  LoadTrashParams,
  LoadTrashResult,
  PaginatedListResponse,
  TrashedFile,
  TrashedNotification,
  TrashedSetting,
  TrashedUser,
  TrashDetail,
  TrashItemV2,
  TrashListResponse,
  TrashModule,
  TrashStats,
} from "../types/trash.types";

export type {
  BulkResponse,
  BulkResultRow,
  BulkTrashItem,
  FileTrashItem,
  ListTrashV2Params,
  LoadTrashParams,
  LoadTrashResult,
  NotificationTrashItem,
  PaginatedListResponse,
  SettingTrashItem,
  TrashActor,
  TrashDetail,
  TrashItem,
  TrashItemV2,
  TrashListResponse,
  TrashModule,
  TrashModuleStats,
  TrashStats,
  TrashedFile,
  TrashedNotification,
  TrashedSetting,
  TrashedUser,
  UserTrashItem,
  NotificationType,
} from "../types/trash.types";
export {
  TRASH_LARGE_PAGE_SIZE,
  TRASH_MODULES,
  TRASH_MODULE_LABELS,
  TRASH_PAGE_SIZE_DEFAULT,
} from "../constants/trash.constants";

// =====================================================================
// ==================== LEGACY: per-module endpoints ====================
// =====================================================================

/** Users: lấy tất cả user đã soft-delete. */
export async function listTrashedUsers(): Promise<TrashedUser[]> {
  const data = await apiFetch<{ users: TrashedUser[] }>(
    "/admin/users?onlyDeleted=true"
  );
  if (!data || !Array.isArray(data.users)) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.users.filter((u) => u.deletedAt);
}

export async function restoreUser(id: number | string): Promise<{ id: number; deletedAt: string | null }> {
  return apiFetch(`/admin/users/${id}/restore`, { method: "POST" });
}

export async function forceDeleteUser(id: number | string): Promise<{ id: number; hardDeleted: boolean }> {
  return apiFetch(`/admin/users/${id}/force`, { method: "DELETE" });
}

async function fetchPaginatedTrashed<T>(
  basePath: string,
  page: number,
  pageSize: number
): Promise<PaginatedListResponse<T>> {
  const qs = new URLSearchParams();
  qs.set("onlyDeleted", "true");
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));
  const payload = await apiFetch<{
    data: T[];
    pagination: { page: number; pageSize: number; total: number };
  }>(`${basePath}?${qs.toString()}`, { raw: true });
  if (!payload) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return {
    items: Array.isArray(payload.data) ? payload.data : [],
    page: payload.pagination?.page ?? page,
    pageSize: payload.pagination?.pageSize ?? pageSize,
    total: payload.pagination?.total ?? 0,
  };
}

export async function listTrashedNotifications(
  page: number,
  pageSize: number
): Promise<PaginatedListResponse<TrashedNotification>> {
  return fetchPaginatedTrashed<TrashedNotification>("/notifications", page, pageSize);
}

export async function restoreNotification(id: number | string): Promise<{ id: number; deletedAt: string | null }> {
  return apiFetch(`/notifications/${id}/restore`, { method: "POST" });
}

export async function forceDeleteNotification(id: number | string): Promise<{ id: number; hardDeleted: boolean }> {
  return apiFetch(`/notifications/${id}/force`, { method: "DELETE" });
}

export async function listTrashedFiles(
  page: number,
  pageSize: number
): Promise<PaginatedListResponse<TrashedFile>> {
  return fetchPaginatedTrashed<TrashedFile>("/files", page, pageSize);
}

export async function restoreFile(id: number | string): Promise<{ id: number; deletedAt: string | null }> {
  return apiFetch(`/files/${id}/restore`, { method: "POST" });
}

export async function forceDeleteFile(id: number | string): Promise<{ id: number; hardDeleted: boolean; physicalFileRemoved?: boolean }> {
  return apiFetch(`/files/${id}/force`, { method: "DELETE" });
}

// ===== Adapters (legacy → TrashItem) =====

export function toUserTrashItem(u: TrashedUser) {
  return {
    compositeKey: `users-${u.id}`,
    module: "users" as const,
    id: u.id,
    name: u.fullName,
    description: u.email,
    deletedAt: u.deletedAt,
    raw: u,
  };
}

export function toNotificationTrashItem(n: TrashedNotification) {
  return {
    compositeKey: `notifications-${n.id}`,
    module: "notifications" as const,
    id: n.id,
    name: n.title,
    description: n.message,
    deletedAt: n.deletedAt,
    deletedBy: n.userId,
    raw: n,
  };
}

export function toFileTrashItem(f: TrashedFile) {
  return {
    compositeKey: `files-${f.id}`,
    module: "files" as const,
    id: f.id,
    name: f.originalName,
    description: f.mimeType || "unknown",
    deletedAt: f.deletedAt,
    deletedBy: f.uploadedById,
    raw: f,
  };
}

export function toSettingTrashItem(s: TrashedSetting) {
  return {
    compositeKey: `settings-${s.key}`,
    module: "settings" as const,
    id: s.id,
    name: s.key,
    description: s.description ?? "",
    deletedAt: s.deletedAt,
    raw: s,
  };
}

/**
 * Legacy load: gộp 3 module → 1 danh sách.
 * Trang TrashManager cũ dùng hàm này.
 */
export async function loadTrash(params: LoadTrashParams = {}): Promise<LoadTrashResult> {
  const module = params.module;
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? TRASH_LARGE_PAGE_SIZE;

  if (module === "users") {
    const users = await listTrashedUsers();
    const items = users.map(toUserTrashItem);
    return {
      items,
      totals: { users: items.length, notifications: 0, files: 0, settings: 0 },
    };
  }
  if (module === "notifications") {
    const notifs = await listTrashedNotifications(page, pageSize);
    const items = notifs.items.filter((n) => n.deletedAt).map(toNotificationTrashItem);
    return {
      items,
      totals: { users: 0, notifications: notifs.total, files: 0, settings: 0 },
    };
  }
  if (module === "files") {
    const files = await listTrashedFiles(page, pageSize);
    const items = files.items.filter((f) => f.deletedAt).map(toFileTrashItem);
    return {
      items,
      totals: { users: 0, notifications: 0, files: files.total, settings: 0 },
    };
  }
  // module = undefined → load tất cả (3 module).
  const [users, notifs, files] = await Promise.all([
    listTrashedUsers(),
    listTrashedNotifications(page, pageSize),
    listTrashedFiles(page, pageSize),
  ]);
  const userItems = users.map(toUserTrashItem);
  const notifItems = notifs.items.filter((n) => n.deletedAt).map(toNotificationTrashItem);
  const fileItems = files.items.filter((f) => f.deletedAt).map(toFileTrashItem);

  return {
    items: [...userItems, ...notifItems, ...fileItems].sort(
      (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    ),
    totals: {
      users: userItems.length,
      notifications: notifs.total,
      files: files.total,
      settings: 0,
    },
  };
}

// =====================================================================
// =============== V2: endpoint thống nhất /api/trash ===================
// =====================================================================
//
// Các function dưới đây dùng BE module trash mới. TrashManagerPage V2 dùng
// nhóm này để tận dụng:
//   - 4 module (có cả Settings)
//   - filter deletedById / from / to / keyword (server-side)
//   - bulk restore + bulk force-delete (1 request)
//   - payload đã include deletedBy + label — không cần tự adapter.

function buildListQuery(params: ListTrashV2Params): string {
  const sp = new URLSearchParams();
  if (params.module) sp.set("module", params.module);
  if (params.deletedById) sp.set("deletedById", String(params.deletedById));
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  if (params.keyword && params.keyword.trim()) sp.set("keyword", params.keyword.trim());
  sp.set("page", String(params.page ?? 1));
  sp.set("limit", String(params.limit ?? TRASH_PAGE_SIZE_DEFAULT));
  return `?${sp.toString()}`;
}

/**
 * List đã xoá thống nhất qua /api/trash.
 * Trả { items: TrashItemV2[], pagination, filters }.
 */
export async function listTrashV2(
  params: ListTrashV2Params = {}
): Promise<TrashListResponse> {
  const query = buildListQuery(params);
  const payload = await apiFetch<{
    items: TrashItemV2[];
    pagination: TrashListResponse["pagination"];
    filters: TrashListResponse["filters"];
  }>(`/trash${query}`, { raw: true });
  if (!payload) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    pagination: payload.pagination ?? {
      page: params.page ?? 1,
      limit: params.limit ?? TRASH_PAGE_SIZE_DEFAULT,
      total: 0,
      totalPages: 1,
    },
    filters: payload.filters ?? {
      module: params.module ?? null,
      deletedById: params.deletedById ?? null,
      from: params.from ?? null,
      to: params.to ?? null,
      keyword: params.keyword ?? null,
    },
  };
}

/**
 * Khôi phục 1 bản ghi. Với settings truyền key, các module khác truyền id.
 */
export async function restoreItem(
  module: TrashModule,
  idOrKey: number | string
): Promise<{ module: TrashModule; id: number; key?: string; deletedAt: string | null; restored: boolean }> {
  return apiFetch(`/trash/${encodeURIComponent(module)}/${encodeURIComponent(String(idOrKey))}/restore`, {
    method: "POST",
  });
}

/**
 * Force-delete 1 bản ghi. Với settings truyền key, các module khác truyền id.
 */
export async function forceDeleteItem(
  module: TrashModule,
  idOrKey: number | string
): Promise<{ module: TrashModule; id: number; key?: string; forceDeleted: boolean }> {
  return apiFetch(`/trash/${encodeURIComponent(module)}/${encodeURIComponent(String(idOrKey))}`, {
    method: "DELETE",
  });
}

/**
 * Bulk restore. items: [{module, id? | key?}].
 */
export async function bulkRestore(items: BulkTrashItem[]): Promise<BulkResponse> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Danh sách item không được rỗng");
  }
  return apiFetch<BulkResponse>("/trash/bulk-restore", {
    method: "POST",
    body: { items },
  });
}

/**
 * Bulk force-delete. items: [{module, id? | key?}].
 */
export async function bulkForceDelete(items: BulkTrashItem[]): Promise<BulkResponse> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Danh sách item không được rỗng");
  }
  return apiFetch<BulkResponse>("/trash/bulk-force-delete", {
    method: "POST",
    body: { items },
  });
}

/**
 * Thống kê tổng quan cho Trash Manager.
 * Returns tổng số bản ghi đã xoá, chi tiết theo module, today + last7Days, top actors.
 */
export async function getTrashStats(): Promise<TrashStats> {
  return apiFetch<TrashStats>("/trash/stats");
}

/**
 * Chi tiết 1 bản ghi đã xoá, kèm snapshot trước khi xoá + creator.
 * Với settings truyền key, các module khác truyền id.
 */
export async function getTrashDetail(
  module: TrashModule,
  idOrKey: number | string
): Promise<TrashDetail> {
  return apiFetch<TrashDetail>(
    `/trash/${encodeURIComponent(module)}/detail/${encodeURIComponent(String(idOrKey))}`,
  );
}