/**
 * file.constants — const dùng riêng cho feature files.
 */

export const FILE_PAGE_SIZE = 12;

/** LocalStorage key cho lựa chọn view (table | grid). */
export const FILE_VIEW_MODE_STORAGE_KEY = "zrlms_file_view_mode";

/**
 * 4 category mà API BE hỗ trợ cho filter `fileType`.
 * (Khác taxonomy `FileKind` phía FE = image | pdf | word | other —
 *  category API dùng nội bộ cho filter + storage-stats, không đụng UI component.)
 */
export const FILE_API_CATEGORIES = ["image", "document", "video", "audio"] as const;
export type FileApiCategory = (typeof FILE_API_CATEGORIES)[number];

/**
 * Map API category → label tiếng Việt hiển thị trong dropdown + storage stats.
 */
export const FILE_CATEGORY_LABELS: Record<FileApiCategory, string> = {
  image: "Ảnh",
  document: "Tài liệu",
  video: "Video",
  audio: "Audio",
};

/** Màu semantic cho 4 category trong StorageStatsCard (dùng CSS var từ DESIGN.md). */
export const FILE_CATEGORY_COLOR_VAR: Record<FileApiCategory, string> = {
  image: "var(--color-info)",
  document: "var(--brand-primary)",
  video: "var(--brand-accent)",
  audio: "var(--color-success)",
};

/** MIME/extension whitelist — giữ đồng bộ với backend upload.middleware. */
export const FILE_UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.pdf,.doc,.docx";

/** Max dung lượng 1 file (bytes) — 10MB, giống upload.middleware.js. */
export const FILE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;