/**
 * file.types — type/interface dùng riêng cho feature files.
 */

export interface UploadedFile {
  id: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  /** Absolute path trên server — không dùng để build URL vì BE không static serve. */
  path: string;
  uploadedById: number;
  createdAt: string;
  deletedAt: string | null;
}

/** Sortable keys ở client — map sang field name của BE ở fileApi.ts. */
export type FileSortBy = "name" | "size" | "createdAt";

export interface FileListParams {
  page?: number;
  pageSize?: number;
  /** Tìm theo tên file (BE-side). */
  search?: string;
  /** Lọc theo API category: image | document | video | audio. */
  fileType?: import("../constants/file.constants").FileApiCategory;
  /** Filter theo uploader (chỉ Admin dùng được — user thường bị ép về currentUser.id). */
  uploaderId?: number;
  /** ISO date string "YYYY-MM-DD" — createdAt >= dateFrom. */
  dateFrom?: string;
  /** ISO date string "YYYY-MM-DD" — createdAt <= dateTo. */
  dateTo?: string;
  /** Mặc định "createdAt". */
  sortBy?: FileSortBy;
  /** Mặc định "desc". */
  sortOrder?: "asc" | "desc";
}

export interface FileListResult {
  items: UploadedFile[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FileListResponse {
  data: UploadedFile[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface FileDetailResponse {
  file: UploadedFile;
}

// ===== Storage stats (chỉ Admin) =====
export interface FileCategoryBucket {
  count: number;
  size: number;
}

export interface FileStorageStats {
  totalSize: number;
  totalFiles: number;
  byType: Record<import("../constants/file.constants").FileApiCategory, FileCategoryBucket>;
}

export interface FileStorageStatsResponse {
  data: FileStorageStats;
}

// ===== Bulk operations =====
export interface BulkDeleteFilesResponse {
  message?: string;
  deletedCount: number;
  deletedIds: number[];
  data?: { deletedCount: number; deletedIds: number[] };
}

export interface BulkDeleteForbiddenDetail {
  forbiddenIds: number[];
  notFoundIds?: number[];
}

// ===== View mode (Table | Grid) — lưu localStorage =====
export type FileViewMode = "table" | "grid";