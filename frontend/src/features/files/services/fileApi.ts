/**
 * fileApi — giao tiếp với backend cho module Upload File.
 *
 * Endpoint BE (refactor mới ở backend/src/modules/files/):
 *   - POST   /upload              : upload 1 file (field name = "file")
 *   - GET    /files               : list có sort/filter (backward compatible)
 *   - GET    /files/storage-stats : thống kê dung lượng (chỉ Admin)
 *   - GET    /files/:id           : chi tiết (Admin hoặc chủ sở hữu)
 *   - DELETE /files/:id           : soft-delete (Admin hoặc chủ sở hữu)
 *   - DELETE /files/bulk          : soft-delete nhiều file
 *   - POST   /files/bulk-download : trả file zip (Admin hoặc chủ sở hữu)
 *   - POST   /files/:id/restore   : restore (Admin hoặc chủ sở hữu)
 *   - DELETE /files/:id/force     : hard delete (chỉ Admin)
 *
 * Lưu ý: BE không serve file vật lý qua HTTP (chưa có static route cho
 * uploads). Do đó preview/download trực tiếp chỉ là UI scaffold; khi BE bổ
 * sung static serve, chỉ cần đổi URL strategy trong fileApi.
 */

import { apiFetch, ApiError } from "../../../shared/api";
import { authStorage } from "../../../shared/storage/authStorage";
import { FILE_PAGE_SIZE } from "../constants/file.constants";
import type {
  BulkDeleteFilesResponse,
  FileDetailResponse,
  FileListParams,
  FileListResponse,
  FileListResult,
  FileStorageStats,
  FileStorageStatsResponse,
  UploadedFile,
} from "../types/file.types";

export type {
  BulkDeleteFilesResponse,
  FileDetailResponse,
  FileListParams,
  FileListResponse,
  FileListResult,
  FileStorageStats,
  FileStorageStatsResponse,
  FileViewMode,
  UploadedFile,
  FileSortBy,
} from "../types/file.types";
export { FILE_PAGE_SIZE } from "../constants/file.constants";

/**
 * GET /files — list có sort + filter + phân trang.
 *
 * Các param mới (sortBy/sortOrder/fileType/uploaderId/dateFrom/dateTo) đều
 * OPTIONAL và được Prisma xử lý server-side (xem files.service.js). Nếu
 * không truyền, behavior y hệt bản cũ (sortBy=createdAt desc, no filter).
 */
export async function getFiles(params: FileListParams = {}): Promise<FileListResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? FILE_PAGE_SIZE;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));

  if (params.search) qs.set("search", params.search);
  if (params.fileType) qs.set("fileType", params.fileType);
  if (params.uploaderId) qs.set("uploaderId", String(params.uploaderId));
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params.dateTo) qs.set("dateTo", params.dateTo);
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);

  const response = await apiFetch<FileListResponse>(`/files?${qs.toString()}`);
  const items = Array.isArray(response.data) ? response.data : [];
  const total = response.pagination?.total ?? items.length;
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
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
 * DELETE /files/bulk — soft-delete nhiều file (atomic).
 *
 * Permission: từng file — Admin tất cả, user thường chỉ file của mình.
 * Nếu có 1 id không thuộc quyền → 403 với details.forbiddenIds (KHÔNG xóa
 * phần còn lại). Nếu 1 id không tồn tại → 404 với details.notFoundIds.
 *
 * Throw ApiError với payload.details nếu BE trả về 4xx.
 */
export async function bulkDeleteFiles(
  ids: Array<number | string>
): Promise<{ deletedCount: number; deletedIds: number[] }> {
  const numericIds = ids.map((id) => Number(id)).filter((n) => Number.isInteger(n));
  const response = await apiFetch<BulkDeleteFilesResponse>("/files/bulk", {
    method: "DELETE",
    body: { ids: numericIds },
  });
  // BE có thể trả response ở root hoặc trong `data` (apiFetch unwrap).
  const payload = (response as unknown as {
    deletedCount?: number;
    deletedIds?: number[];
  }) ?? {};
  return {
    deletedCount:
      payload.deletedCount ?? response.data?.deletedCount ?? numericIds.length,
    deletedIds:
      payload.deletedIds ?? response.data?.deletedIds ?? numericIds,
  };
}

/**
 * POST /files/bulk-download — gọi thẳng fetch (KHÔNG dùng apiFetch) vì
 * response là blob (zip), không phải JSON.
 *
 * Trả về Blob + metadata. Caller chịu trách nhiệm trigger download qua
 * URL.createObjectURL. Throw ApiError nếu 4xx/5xx.
 *
 * Permission: từng file — giống bulkDeleteFiles.
 *
 * Response header `X-Missing-Files` được trả về khi có file vật lý bị
 * thiếu — trả kèm metadata để caller cảnh báo user.
 */
export interface BulkDownloadResult {
  blob: Blob;
  /** Tên file zip đề xuất. */
  filename: string;
  /** File vật lý bị thiếu (nếu có) — parse từ X-Missing-Files header. */
  missingFiles: Array<{ id: number; originalName: string; reason: string }>;
}

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

async function getAccessToken(): Promise<string | null> {
  return authStorage.getAccessToken();
}

export async function bulkDownloadFiles(
  ids: Array<number | string>
): Promise<BulkDownloadResult> {
  const numericIds = ids.map((id) => Number(id)).filter((n) => Number.isInteger(n));

  const token = await getAccessToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${RAW_BASE}/files/bulk-download`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ids: numericIds }),
  });

  if (!res.ok) {
    // Thử parse lỗi JSON để trả message tiếng Việt.
    let message = `Yêu cầu thất bại (${res.status})`;
    try {
      const data = await res.json();
      if (data && typeof data.message === "string") message = data.message;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status, null);
  }

  // Parse header X-Missing-Files (nếu có)
  let missingFiles: BulkDownloadResult["missingFiles"] = [];
  const rawHeader = res.headers.get("X-Missing-Files");
  if (rawHeader) {
    try {
      missingFiles = JSON.parse(rawHeader);
    } catch {
      missingFiles = [];
    }
  }

  // Parse Content-Disposition để lấy filename (vd: files_<ts>.zip)
  const disposition = res.headers.get("Content-Disposition") || "";
  const filenameMatch = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = filenameMatch ? filenameMatch[1] : "files.zip";

  const blob = await res.blob();
  return { blob, filename, missingFiles };
}

/**
 * Upload 1 file (legacy API — UploadQueue hiện dùng uploadFileRaw trực tiếp
 * để lấy onUploadProgress qua XMLHttpRequest).
 *
 * Giữ lại để tương thích ngược với code khác nếu có.
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

/**
 * Upload raw qua XMLHttpRequest — lấy onUploadProgress chính xác.
 *
 * Trả về Promise<UploadedFile>. Caller dùng abort.signal để huỷ.
 *
 * Trả reject nếu:
 *   - status >= 400 → ApiError(message từ body hoặc default)
 *   - abort → Error('Upload bị huỷ')
 */
export interface UploadFileRawOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export function uploadFileRaw(
  file: File,
  opts: UploadFileRawOptions = {}
): Promise<UploadedFile> {
  const { onProgress, signal } = opts;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${RAW_BASE}/upload`);

    const token = authStorage.getAccessToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    // KHÔNG set Content-Type — trình duyệt tự thêm multipart boundary.

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return;
      if (e.lengthComputable && e.total > 0) {
        const pct = Math.min(100, Math.round((e.loaded / e.total) * 100));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          const fileObj = data?.data?.file ?? data?.file;
          if (!fileObj) throw new Error("Phản hồi không hợp lệ");
          resolve(fileObj as UploadedFile);
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Phản hồi không hợp lệ"));
        }
      } else {
        // Parse lỗi JSON
        let message = `Upload thất bại (${xhr.status})`;
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          if (data && typeof data.message === "string") message = data.message;
        } catch {
          // ignore
        }
        reject(new ApiError(message, xhr.status, null));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Lỗi mạng khi upload"));
    };

    xhr.onabort = () => {
      reject(new Error("Upload bị huỷ"));
    };

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => {
        try {
          xhr.abort();
        } catch {
          // ignore
        }
      });
    }

    const form = new FormData();
    form.append("file", file, file.name);
    xhr.send(form);
  });
}

/**
 * GET /files/storage-stats (chỉ Admin). Throw ApiError 403 nếu user thường.
 */
export async function getStorageStats(): Promise<FileStorageStats> {
  const response = await apiFetch<FileStorageStatsResponse>("/files/storage-stats");
  if (!response.data) throw new Error("Phản hồi từ máy chủ không hợp lệ");
  return response.data;
}