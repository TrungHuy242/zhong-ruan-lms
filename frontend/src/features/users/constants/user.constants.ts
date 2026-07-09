/**
 * user.constants — const/enum dùng riêng cho feature users.
 */

export const USER_PAGE_SIZE = 10;

/** Label tiếng Việt cho từng role để hiển thị trên UI. */
export const USER_ROLE_LABELS: Record<"ADMIN" | "TEACHER" | "STUDENT", string> = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giáo viên",
  STUDENT: "Học viên",
};

/** Label tiếng Việt cho từng status. */
export const USER_STATUS_LABELS: Record<"ACTIVE" | "INACTIVE" | "SUSPENDED", string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngừng hoạt động",
  SUSPENDED: "Tạm khoá",
};
