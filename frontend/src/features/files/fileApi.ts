/**
 * fileApi — giao tiếp với backend cho module Upload File.
 *
 * Endpoint thật (từ upload.routes.js + upload.middleware.js):
 *   - POST   /upload                  : upload 1 file (field name = "file")
 *                                       validate: jpg/jpeg/png/pdf/doc/docx, max 10MB
 *   - GET    /files                   : list, pagination {page, pageSize}, total
 *                                       - Admin: thấy tất cả
 *                                       - User thường: chỉ thấy file của mình (server-side filter)
 *   - GET    /files/:id               : chi tiết (Admin hoặc chủ sở hữu)
 *   - DELETE /files/:id               : soft-delete (Admin hoặc chủ sở hữu)
 *   - POST   /files/:id/restore       : restore (Admin hoặc chủ sở hữu)
 *   - DELETE /files/:id/force         : hard delete (chỉ Admin)
 *
 * BE không serve file vật lý qua HTTP → preview/download trực tiếp không khả thi
 * với bản hiện tại. Modal detail chỉ hiện thông tin metadata.
 *
 * BE list KHÔNG include `uploader` (user info) → FE tự fetch users để map tên+email.
 */

import { apiFetch } from "../../shared/lib/api";

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

export const FILE_PAGE_SIZE = 10;

interface FileListResponse {
  data: UploadedFile[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export async function getFiles(params: FileListParams = {}): Promise<FileListResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? FILE_PAGE_SIZE;
  const response = await apiFetch<FileListResponse>(
    `/files?page=${page}&pageSize=${pageSize}`
  );
  const items = Array.isArray(response.data) ? response.data : [];
  return {
    items,
    total: response.pagination?.total ?? items.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((response.pagination?.total ?? 0) / pageSize)),
  };
}

export interface FileDetailResponse {
  file: UploadedFile;
}

export async function getFileDetail(id: number | string): Promise<UploadedFile> {
  const response = await apiFetch<FileDetailResponse>(`/files/${id}`);
  if (!response?.file) throw new Error("Phản hồi từ máy chủ không hợp lệ");
  return response.file;
}

export async function deleteFile(id: number | string): Promise<void> {
  await apiFetch(`/files/${id}`, { method: "DELETE" });
}

/**
 * Upload 1 file. BE chỉ nhận 1 file/request (`multer limits.files = 1`),
 * nên để upload nhiều file cần gọi hàm này N lần.
 *
 * Dùng FormData với field "file" đúng tên BE mong đợi.
 */
export async function uploadFile(file: File): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file, file.name);
  const response = await apiFetch<{ file: UploadedFile }>("/upload", {
    method: "POST",
    body: form,
  });
  if (!response?.file) throw new Error("Phản hồi từ máy chủ không hợp lệ");
  return response.file;
}