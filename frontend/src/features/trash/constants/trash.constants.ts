/**
 * trash.constants — const dùng riêng cho feature trash.
 */

import type { TrashModule } from "../types/trash.types";

/**
 * Thứ tự hiển thị trong dropdown filter và KPI cards.
 * Thứ tự nhóm theo luồng nghiệp vụ:
 *   1. Quản lý chính (người dùng, thông báo, tệp)
 *   2. Cấu hình + nội dung public (settings, teachers, pricing, schedules, contact)
 *
 * Phải khớp 1-1 với MODULES ở backend/src/modules/trash/trash.service.js.
 */
export const TRASH_MODULES: TrashModule[] = [
  "users",
  "notifications",
  "files",
  "settings",
  "teachers",
  "pricingplans",
  "contactrequests",
  "enrollmentschedules",
  "testimonials",
];

/**
 * Nhãn tiếng Việt — nhất quán với tên menu trong Sidebar.
 */
export const TRASH_MODULE_LABELS: Record<TrashModule, string> = {
  users: "Người dùng",
  notifications: "Thông báo",
  files: "Tệp",
  settings: "Cấu hình",
  teachers: "Giảng viên",
  pricingplans: "Gói học phí",
  contactrequests: "Yêu cầu tư vấn",
  enrollmentschedules: "Lịch khai giảng",
  testimonials: "Cảm nhận học viên",
};

export const TRASH_LARGE_PAGE_SIZE = 1000;

export const TRASH_PAGE_SIZE_DEFAULT = 20;
export const TRASH_PAGE_SIZE_MAX = 100;
