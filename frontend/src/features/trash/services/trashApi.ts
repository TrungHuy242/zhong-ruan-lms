/**
 * trashApi — giao tiếp với backend cho màn Trash Manager.
 *
 * ⚠️ Lưu ý kiến trúc: BE KHÔNG có module /trash thống nhất.
 * Mỗi module có endpoint riêng, mỗi endpoint list/restore/force-delete khác nhau:
 *
 *   Users (Admin only):
 *     - list   : GET    /api/admin/users?onlyDeleted=true
 *                → trả { data: { users: User[] } } (KHÔNG phân trang server-side,
 *                  không hỗ trợ search; FE xử lý cả hai phía client)
 *     - restore: POST   /api/admin/users/:id/restore
 *     - force  : DELETE /api/admin/users/:id/force
 *
 *   Notifications:
 *     - list   : GET    /api/notifications?onlyDeleted=true&page=&pageSize=
 *                → trả { data: Notification[], pagination: { page, pageSize, total } }
 *                (có phân trang server-side, KHÔNG search)
 *     - restore: POST   /api/notifications/:id/restore (Admin hoặc chủ sở hữu)
 *     - force  : DELETE /api/notifications/:id/force (chỉ Admin)
 *
 *   Files:
 *     - list   : GET    /api/files?onlyDeleted=true&page=&pageSize=
 *                → trả { data: File[], pagination: { page, pageSize, total } }
 *                (có phân trang server-side, KHÔNG search)
 *     - restore: POST   /api/files/:id/restore (Admin hoặc uploader)
 *     - force  : DELETE /api/files/:id/force (chỉ Admin; xóa cả file vật lý)
 *
 * FE gộp cả 3 module thành 1 danh sách thống nhất, sau đó filter/search/paginate
 * phía client.
 */

import { apiFetch } from "../../../shared/api";
import { TRASH_LARGE_PAGE_SIZE } from "../constants/trash.constants";
import type {
  FileTrashItem,
  LoadTrashParams,
  LoadTrashResult,
  NotificationTrashItem,
  PaginatedListResponse,
  TrashedFile,
  TrashedNotification,
  TrashedUser,
  UserTrashItem,
} from "../types/trash.types";

export type {
  FileTrashItem,
  LoadTrashParams,
  LoadTrashResult,
  NotificationTrashItem,
  PaginatedListResponse,
  TrashItem,
  TrashModule,
  TrashedFile,
  TrashedNotification,
  TrashedUser,
  UserTrashItem,
  NotificationType,
} from "../types/trash.types";
export {
  TRASH_LARGE_PAGE_SIZE,
  TRASH_MODULES,
  TRASH_MODULE_LABELS,
} from "../constants/trash.constants";

// ===================== Users =====================
/**
 * Lấy TẤT CẢ user đã soft-delete.
 * BE mount user router ở /api/admin/users và KHÔNG phân trang; trả phẳng.
 * apiFetch unwrap field `data` nên ta nhận { users: User[] }.
 */
export async function listTrashedUsers(): Promise<TrashedUser[]> {
  const data = await apiFetch<{ users: TrashedUser[] }>(
    "/admin/users?onlyDeleted=true"
  );
  if (!data || !Array.isArray(data.users)) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  // Chỉ giữ những record có deletedAt khác null (BE có thể trả nhầm include cả null).
  return data.users.filter((u) => u.deletedAt);
}

export async function restoreUser(id: number | string): Promise<{ id: number; deletedAt: string | null }> {
  return apiFetch(`/admin/users/${id}/restore`, { method: "POST" });
}

export async function forceDeleteUser(id: number | string): Promise<{ id: number; hardDeleted: boolean }> {
  return apiFetch(`/admin/users/${id}/force`, { method: "DELETE" });
}

// ===================== Notifications =====================
/**
 * BE trả { data: [...], pagination: { page, pageSize, total } }. apiFetch unwrap
 * `data` thôi, không unwrap `pagination`. Dùng `raw: true` để nhận trọn object,
 * sau đó tự map lại.
 */
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

// ===================== Files =====================
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

export function toUserTrashItem(u: TrashedUser): UserTrashItem {
  return {
    compositeKey: `users-${u.id}`,
    module: "users",
    id: u.id,
    name: u.fullName,
    description: u.email,
    deletedAt: u.deletedAt,
    raw: u,
  };
}

export function toNotificationTrashItem(n: TrashedNotification): NotificationTrashItem {
  return {
    compositeKey: `notifications-${n.id}`,
    module: "notifications",
    id: n.id,
    name: n.title,
    description: n.message,
    deletedAt: n.deletedAt,
    deletedBy: n.userId,
    raw: n,
  };
}

export function toFileTrashItem(f: TrashedFile): FileTrashItem {
  return {
    compositeKey: `files-${f.id}`,
    module: "files",
    id: f.id,
    name: f.originalName,
    description: f.mimeType || "unknown",
    deletedAt: f.deletedAt,
    deletedBy: f.uploadedById,
    raw: f,
  };
}

/**
 * Load các bản ghi đã soft-delete theo module (hoặc tất cả).
 *
 * - Users: 1 request flat (BE không phân trang), FE tự slice theo page.
 * - Notif/File: phân trang server-side.
 *
 * @param module  nếu không truyền → load cả 3 module.
 * @param page    dùng cho pagination client (users) hoặc server (notif/files).
 * @param pageSize
 */
export async function loadTrash(params: LoadTrashParams = {}): Promise<LoadTrashResult> {
  const module = params.module;
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? TRASH_LARGE_PAGE_SIZE;

  if (module === "users") {
    const users = await listTrashedUsers();
    const items = users.map(toUserTrashItem);
    return { items, totals: { users: items.length, notifications: 0, files: 0 } };
  }
  if (module === "notifications") {
    const notifs = await listTrashedNotifications(page, pageSize);
    const items = notifs.items
      .filter((n) => n.deletedAt)
      .map(toNotificationTrashItem);
    return {
      items,
      totals: { users: 0, notifications: notifs.total, files: 0 },
    };
  }
  if (module === "files") {
    const files = await listTrashedFiles(page, pageSize);
    const items = files.items
      .filter((f) => f.deletedAt)
      .map(toFileTrashItem);
    return {
      items,
      totals: { users: 0, notifications: 0, files: files.total },
    };
  }
  // module = undefined → load tất cả.
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
    },
  };
}
