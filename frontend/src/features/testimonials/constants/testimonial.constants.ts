/**
 * testimonial.constants — cấu hình tĩnh cho module Testimonial (Admin).
 */

export const TESTIMONIAL_PAGE_SIZE = 10;

export const TESTIMONIAL_SORT_LABELS: Record<string, string> = {
  studentName: "Họ tên",
  rating: "Đánh giá",
  displayOrder: "Thứ tự hiển thị",
  createdAt: "Ngày tạo",
  updatedAt: "Ngày cập nhật",
};

/** Available (toggleable) columns cho table visibility. */
export const TESTIMONIAL_AVAILABLE_COLUMN_KEYS = [
  "courseInfo",
  "isFeatured",
  "isPublished",
  "displayOrder",
  "createdAt",
] as const;

/** Columns luôn hiển thị — không thể ẩn. */
export const TESTIMONIAL_LOCKED_COLUMN_KEYS = [
  "studentName",
  "rating",
  "content",
  "actions",
] as const;