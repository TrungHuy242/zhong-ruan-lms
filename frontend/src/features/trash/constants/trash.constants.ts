/**
 * trash.constants — const dùng riêng cho feature trash.
 */

import type { TrashModule } from "../types/trash.types";

export const TRASH_MODULES: TrashModule[] = [
  "users",
  "notifications",
  "files",
  "settings",
];

export const TRASH_MODULE_LABELS: Record<TrashModule, string> = {
  users: "Người dùng",
  notifications: "Thông báo",
  files: "Tệp",
  settings: "Cấu hình",
};

export const TRASH_LARGE_PAGE_SIZE = 1000;

export const TRASH_PAGE_SIZE_DEFAULT = 20;
export const TRASH_PAGE_SIZE_MAX = 100;