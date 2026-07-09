/**
 * trash.constants — const dùng riêng cho feature trash.
 */

import type { TrashModule } from "../types/trash.types";

export const TRASH_MODULES: TrashModule[] = ["users", "notifications", "files"];

export const TRASH_MODULE_LABELS: Record<TrashModule, string> = {
  users: "Người dùng",
  notifications: "Thông báo",
  files: "Tệp",
};

export const TRASH_LARGE_PAGE_SIZE = 1000;
