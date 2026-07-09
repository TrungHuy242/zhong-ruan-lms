/**
 * notification.constants — const dùng riêng cho feature notifications.
 */

export const NOTIFICATION_PAGE_SIZE = 10;

/** Label tiếng Việt cho từng notification type (dùng cho badge màu). */
export const NOTIFICATION_TYPE_LABELS: Record<
  "INFO" | "SUCCESS" | "WARNING" | "ERROR",
  string
> = {
  INFO: "Thông tin",
  SUCCESS: "Thành công",
  WARNING: "Cảnh báo",
  ERROR: "Lỗi",
};
