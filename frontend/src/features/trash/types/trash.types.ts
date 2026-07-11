/**
 * trash.types — type/interface dùng riêng cho feature trash.
 *
 * Có 2 nhóm types:
 *   1. Legacy types (TrashedUser/TrashedNotification/TrashedFile) — dùng cho các
 *      endpoint module riêng (giữ backward-compatible với code cũ).
 *   2. Unified types (TrashItemV2, TrashListResponse, BulkResult…) — dùng cho
 *      endpoint thống nhất /api/trash do BE module trash mới cung cấp.
 */

import type { UserRole, UserStatus } from "../../users/types/user.types";

// ============== Trash module enum ==============
export type TrashModule = "users" | "notifications" | "files" | "settings";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR" | string;

// ===================== Users (legacy) =====================
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

// ===================== Notifications (legacy) =====================
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

// ===================== Files (legacy) =====================
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

// ===================== Unified Trash Item (legacy — tổng hợp FE) =====================
export interface TrashItemBase {
  compositeKey: string;
  module: TrashModule;
  id: number;
  name: string;
  description: string;
  deletedAt: string;
  /** Người xoá — users không track, còn notif/file hiển thị ID; có thể bổ sung sau. */
  deletedBy?: number | null;
  /** Raw record gốc (để truyền xuống modal/restore). */
  raw: TrashedUser | TrashedNotification | TrashedFile | TrashedSetting;
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

export interface SettingTrashItem extends TrashItemBase {
  module: "settings";
  raw: TrashedSetting;
}

export type TrashItem =
  | UserTrashItem
  | NotificationTrashItem
  | FileTrashItem
  | SettingTrashItem;

// ===================== Settings =====================
export interface TrashedSetting {
  id: number;
  key: string;
  description: string | null;
  group: string | null;
  createdAt: string;
  updatedAt?: string;
  deletedAt: string;
}

export interface PaginatedListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LoadTrashParams {
  module?: TrashModule;
  page?: number;
  pageSize?: number;
}

export interface LoadTrashResult {
  items: TrashItem[];
  totals: Record<TrashModule, number>;
}

// ===================== Trash V2 — dùng với endpoint /api/trash =====================
//
// Dạng payload mới trả về từ BE trash.service.listTrash().
export interface TrashActor {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
}

/**
 * TrashItemV2 — 1 dòng trong danh sách thùng rác thống nhất.
 *
 * - `module`: 'users' | 'notifications' | 'files' | 'settings'
 * - `id`: primary key của record (Int cho 3 model cũ, Int cho Setting)
 * - `key`: chỉ có khi module=settings (BE Setting dùng key làm identifier)
 * - `label`: tên hiển thị gọn (fullName, title, originalName, key…)
 * - `deletedBy`: người xoá (null nếu record cũ chưa track deletedById).
 */
export interface TrashItemV2 {
  id: number;
  module: TrashModule;
  deletedAt: string;
  deletedById: number | null;
  deletedBy: TrashActor | null;
  label: string;
  createdAt: string;
  /** Chỉ có với module=settings. */
  key?: string;
}

export interface TrashListResponse {
  items: TrashItemV2[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    module: TrashModule | null;
    deletedById: number | null;
    from: string | null;
    to: string | null;
    keyword: string | null;
  };
}

export interface ListTrashV2Params {
  module?: TrashModule | null;
  deletedById?: number | null;
  from?: string | null;
  to?: string | null;
  keyword?: string | null;
  page?: number;
  limit?: number;
}

// ===================== Bulk =====================
export interface BulkTrashItem {
  module: TrashModule;
  /** Bắt buộc cho users/notifications/files. */
  id?: number;
  /** Bắt buộc cho settings. */
  key?: string;
}

export interface BulkResultRow {
  module: TrashModule;
  id: number | null;
  key?: string | null;
  ok: boolean;
  error?: string;
}

export interface BulkResponse {
  total: number;
  success: number;
  failed: number;
  results: BulkResultRow[];
}