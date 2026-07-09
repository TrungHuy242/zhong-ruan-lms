/**
 * trash.types — type/interface dùng riêng cho feature trash.
 */

import type { UserRole, UserStatus } from "../../users/types/user.types";

export type TrashModule = "users" | "notifications" | "files";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | string;

// ===================== Users =====================
export interface TrashedUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  deletedAt: string;
}

// ===================== Notifications =====================
export interface TrashedNotification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
  deletedAt: string;
}

// ===================== Files =====================
export interface TrashedFile {
  id: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedById: number;
  createdAt: string;
  deletedAt: string;
}

// ===================== Unified Trash Item =====================
/**
 * TrashItem — record hợp nhất cho bảng Trash Manager.
 * `module` đánh dấu nguồn; `meta` chứa các field hiển thị riêng theo module.
 */
export interface TrashItemBase {
  /** Composite key: `${module}-${id}` để dùng làm React key. */
  compositeKey: string;
  module: TrashModule;
  id: number;
  name: string;
  description: string;
  deletedAt: string;
  /** Người xoá — users không track, còn notif/file hiển thị ID; có thể bổ sung sau. */
  deletedBy?: number | null;
  /** Raw record gốc (để truyền xuống modal/restore). */
  raw: TrashedUser | TrashedNotification | TrashedFile;
}

export interface UserTrashItem extends TrashItemBase {
  module: "users";
  raw: TrashedUser;
}

export interface NotificationTrashItem extends TrashItemBase {
  module: "notifications";
  raw: TrashedNotification;
}

export interface FileTrashItem extends TrashItemBase {
  module: "files";
  raw: TrashedFile;
}

export type TrashItem = UserTrashItem | NotificationTrashItem | FileTrashItem;

export interface PaginatedListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LoadTrashParams {
  /** Lọc theo module; undefined = load tất cả. */
  module?: TrashModule;
  page?: number;
  pageSize?: number;
}

export interface LoadTrashResult {
  items: TrashItem[];
  /** Tổng gộp sau khi load (theo từng module). */
  totals: Record<TrashModule, number>;
}
