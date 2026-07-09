/**
 * fileValidation — kiểm tra file trước khi upload.
 *
 * Lấy theo cấu hình THỰC TẾ của BE (upload.middleware.js):
 *   - ALLOWED_EXTENSIONS = jpg, jpeg, png, pdf, doc, docx
 *   - MAX_FILE_SIZE     = 10 MB
 *
 * Tách riêng thành helper generic để tái sử dụng cho các module
 * upload khác (Avatar / Tài liệu học tập / Ảnh khóa học…) trong tương lai.
 *
 * Lưu ý: BE vẫn là tầng quyết định cuối cùng. Validate ở đây chỉ để
 * tránh request sai tốn băng thông + UX tốt hơn.
 */

import { apiFetch, ApiError } from "../api";

/** Extension cho phép (lowercase, có dấu chấm). */
export const ALLOWED_FILE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".pdf",
  ".doc",
  ".docx",
] as const;

/** MIME type cho phép (giữ đồng bộ với BE fileFilter). */
export const ALLOWED_FILE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

/** Dung lượng tối đa 1 file (bytes). BE multer cũng enforce 10MB. */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export type FileValidationCode =
  | "INVALID_EXTENSION"
  | "INVALID_MIME"
  | "FILE_TOO_LARGE"
  | "EMPTY_FILE";

export interface FileValidationError {
  /** Mã lỗi — dùng để i18n hoặc mapping UI. */
  code: FileValidationCode;
  /** Thông báo thân thiện tiếng Việt. */
  message: string;
}

export interface FileValidationResult {
  file: File;
  ok: boolean;
  error?: FileValidationError;
}

/** Lấy extension từ tên file (lowercase, có dấu chấm). */
export function getFileExtension(filename: string): string {
  const i = filename.lastIndexOf(".");
  if (i < 0) return "";
  return filename.slice(i).toLowerCase();
}

/** Validate 1 file dựa trên extension + size + mimeType. */
export function validateFile(file: File): FileValidationResult {
  if (file.size === 0) {
    return {
      file,
      ok: false,
      error: {
        code: "EMPTY_FILE",
        message: `File "${file.name}" rỗng (0 bytes).`,
      },
    };
  }

  const ext = getFileExtension(file.name);
  if (!ALLOWED_FILE_EXTENSIONS.includes(ext as (typeof ALLOWED_FILE_EXTENSIONS)[number])) {
    return {
      file,
      ok: false,
      error: {
        code: "INVALID_EXTENSION",
        message: `File "${file.name}" có định dạng "${ext}" không được phép. Chỉ chấp nhận: jpg, jpeg, png, pdf, doc, docx.`,
      },
    };
  }

  if (!ALLOWED_FILE_MIME_TYPES.includes(file.type as (typeof ALLOWED_FILE_MIME_TYPES)[number])) {
    return {
      file,
      ok: false,
      error: {
        code: "INVALID_MIME",
        message: `File "${file.name}" có MIME type không hợp lệ ("${file.type}").`,
      },
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      file,
      ok: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: `File "${file.name}" vượt quá dung lượng tối đa ${formatFileSize(MAX_FILE_SIZE)} (hiện tại: ${formatFileSize(file.size)}).`,
      },
    };
  }

  return { file, ok: true };
}

/**
 * Validate nhiều file, trả về 2 nhóm:
 *   - valid: file hợp lệ, sẵn sàng gọi API
 *   - errors: thông báo lỗi theo từng file (KHÔNG chặn các file hợp lệ khác)
 */
export function validateFiles(files: File[] | FileList): {
  valid: File[];
  errors: { file: File; error: FileValidationError }[];
} {
  const arr = Array.from(files);
  const valid: File[] = [];
  const errors: { file: File; error: FileValidationError }[] = [];
  for (const file of arr) {
    const r = validateFile(file);
    if (r.ok) valid.push(file);
    else if (r.error) errors.push({ file, error: r.error });
  }
  return { valid, errors };
}

/** Format bytes → human readable (KB/MB/GB). */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(gb < 10 ? 2 : 1)} GB`;
}

/** Xác định loại file theo extension (dùng cho icon + filter). */
export type FileKind = "image" | "pdf" | "word" | "other";

export function getFileKind(filenameOrMime: string): FileKind {
  const lower = filenameOrMime.toLowerCase();
  if (lower.includes("image/") || /\.(jpe?g|png|webp|gif)$/.test(lower)) return "image";
  if (lower.includes("pdf") || lower.endsWith(".pdf")) return "pdf";
  if (
    lower.includes("word") ||
    lower.includes("officedocument.wordprocessingml") ||
    /\.(docx?|rtf)$/.test(lower)
  ) {
    return "word";
  }
  return "other";
}

/** Label ngắn tiếng Việt cho loại file (badge trong table). */
export function getFileKindLabel(kind: FileKind): string {
  switch (kind) {
    case "image":
      return "Ảnh";
    case "pdf":
      return "PDF";
    case "word":
      return "Word";
    default:
      return "Khác";
  }
}

/** Lấy message lỗi từ BE nếu là ApiError, fallback về message mặc định. */
export function getApiErrorMessage(err: unknown, fallback = "Lỗi hệ thống"): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

/** Re-export apiFetch + ApiError cho caller dùng thuận tiện. */
export { apiFetch, ApiError };
