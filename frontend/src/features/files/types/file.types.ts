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

export interface FileListParams {
  page?: number;
  pageSize?: number;
  /** Tìm theo tên file (client-side, vì BE không có param). */
  search?: string;
  /** Lọc theo loại (client-side). */
  kind?: "all" | "image" | "pdf" | "word";
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
