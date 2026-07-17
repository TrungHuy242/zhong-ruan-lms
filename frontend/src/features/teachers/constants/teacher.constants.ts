/**
 * teacher.constants — const/enum dùng riêng cho feature teachers (admin).
 */

export const TEACHER_PAGE_SIZE = 10;

/** Label tiếng Việt cho từng sortable key. */
export const TEACHER_SORT_LABELS: Record<string, string> = {
  fullName: "Họ tên",
  title: "Chức danh",
  isFeatured: "Nổi bật",
  isPublished: "Trạng thái",
  displayOrder: "Thứ tự",
  createdAt: "Ngày tạo",
  updatedAt: "Ngày cập nhật",
};

/** Các filter advanced có thể bật/tắt hiển thị cột (locked = luôn hiện). */
export const TEACHER_LOCKED_COLUMN_KEYS = ["fullName"] as const;
export const TEACHER_AVAILABLE_COLUMN_KEYS = [
  "title",
  "yearsOfExperience",
  "specialties",
  "isFeatured",
  "isPublished",
  "displayOrder",
  "createdAt",
] as const;