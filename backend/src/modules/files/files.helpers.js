/**
 * files.helpers.js — Helper cho module files (phân loại file, validate bulk input).
 *
 * Tách riêng khỏi FileKind phía FE (image | pdf | word | other) — vì API yêu cầu
 * taxonomy `image | document | video | audio`. Helper này là "API category" dùng nội bộ
 * cho filter + storage-stats, không đụng tới UI component phía FE.
 */

/**
 * 4 category được API hỗ trợ cho filter `fileType`.
 */
const FILE_CATEGORIES = ["image", "document", "video", "audio"];

/**
 * Map mimeType + extension -> category theo taxonomy API.
 *
 * Quy tắc:
 *  - image/*       -> image
 *  - video/*       -> video
 *  - audio/*       -> audio
 *  - application/pdf, text/*, application/msword,
 *    application/vnd.openxmlformats-officedocument.*, application/vnd.ms-* -> document
 *  - còn lại       -> document (fallback mặc định cho "tài liệu không xác định")
 *
 * @param {string} mimeType
 * @param {string} [originalName]
 * @returns {"image" | "document" | "video" | "audio"}
 */
function categoryFromMime(mimeType, originalName) {
  const mime = String(mimeType || "").toLowerCase();
  const ext = originalName ? getExt(originalName) : "";

  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";

  if (mime === "application/pdf") return "document";
  if (mime.startsWith("text/")) return "document";
  if (mime === "application/msword") return "document";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "document";
  if (mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "document";
  if (mime === "application/vnd.ms-excel") return "document";
  if (mime === "application/vnd.ms-powerpoint") return "document";
  if (mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return "document";
  if (mime === "application/zip" || mime === "application/x-rar-compressed" || mime === "application/x-7z-compressed") return "document";

  // Fallback theo extension nếu mimeType trống / lạ
  if (/\.(jpe?g|png|gif|webp|bmp|svg)$/.test(ext)) return "image";
  if (/\.(mp4|mkv|avi|mov|webm|flv|wmv)$/.test(ext)) return "video";
  if (/\.(mp3|wav|ogg|m4a|flac|aac)$/.test(ext)) return "audio";
  if (/\.(pdf|docx?|xlsx?|pptx?|txt|rtf|csv|md)$/.test(ext)) return "document";

  return "document";
}

function getExt(name) {
  const i = String(name || "").lastIndexOf(".");
  return i >= 0 ? String(name).slice(i).toLowerCase() : "";
}

/**
 * Validate 1 giá trị fileType từ query — trả về category hợp lệ hoặc null.
 *
 * @param {string|undefined|null} raw
 * @returns {"image"|"document"|"video"|"audio"|null}
 */
function normalizeFileType(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const v = String(raw).toLowerCase();
  return FILE_CATEGORIES.includes(v) ? v : null;
}

/**
 * Validate mảng id cho bulk endpoints.
 *
 * @param {unknown} raw
 * @returns {{ ok: true, ids: number[] } | { ok: false, error: string }}
 */
function validateBulkIds(raw) {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "ids phải là một mảng" };
  }
  if (raw.length === 0) {
    return { ok: false, error: "ids không được rỗng" };
  }
  const ids = [];
  for (const v of raw) {
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) {
      return { ok: false, error: `id không hợp lệ: ${v}` };
    }
    ids.push(n);
  }
  // De-dup để tránh double-count trong transaction
  return { ok: true, ids: [...new Set(ids)] };
}

/**
 * Validate `sortBy` + `sortOrder` cho GET /files.
 *
 * @returns {{ ok: true, sortBy: string, sortOrder: "asc"|"desc" } | { ok: false, error: string }}
 */
function normalizeSort(sortByRaw, sortOrderRaw) {
  const allowedSortBy = ["name", "size", "createdAt"];
  const allowedSortOrder = ["asc", "desc"];

  const sortBy = sortByRaw ? String(sortByRaw) : "createdAt";
  if (!allowedSortBy.includes(sortBy)) {
    return { ok: false, error: `sortBy phải là một trong: ${allowedSortBy.join(", ")} (nhận: "${sortByRaw}")` };
  }

  const sortOrder = sortOrderRaw ? String(sortOrderRaw).toLowerCase() : "desc";
  if (!allowedSortOrder.includes(sortOrder)) {
    return { ok: false, error: `sortOrder phải là một trong: ${allowedSortOrder.join(", ")} (nhận: "${sortOrderRaw}")` };
  }

  // Map field name "name" -> originalName (DB column)
  const prismaField = sortBy === "name" ? "originalName" : sortBy;
  return { ok: true, sortBy, sortOrder, prismaField, prismaOrder: sortOrder };
}

/**
 * Parse ISO date string -> Date hoặc null.
 */
function parseDate(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

module.exports = {
  FILE_CATEGORIES,
  categoryFromMime,
  normalizeFileType,
  validateBulkIds,
  normalizeSort,
  parseDate,
};