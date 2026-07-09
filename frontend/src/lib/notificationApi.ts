/**
 * notificationApi — giao tiếp với backend cho module Notification.
 *
 * Endpoint gốc: GET /api/notifications (mount trong app.js).
 *   - User thường: chỉ thấy thông báo của chính mình (BE lọc theo userId từ token).
 *   - Admin: tạo được broadcast nhưng BE chỉ nhận userId cụ thể — nên FE
 *     phải tự resolve danh sách userId (theo role hoặc tất cả) rồi gọi POST
 *     lặp nhiều lần.
 *
 * Response shape (sau apiFetch unwrap field `data`):
 *   - list:  Notification[]
 *   - get:   { notification: Notification }
 *   - mark:  { notification: Notification }
 *   - mark-all: { updated: number }
 *   - delete: { id, deletedAt, alreadyDeleted? }
 *   - create: Notification
 *
 * Lưu ý: BE trả pagination ở **field riêng** (`pagination: { page, pageSize, total }`),
 * apiFetch unwrap `data` nên client nhận Notification[] thuần. Để biết total cần
 * gọi API riêng / FE tự đếm từ client-side list (đã làm ở UserManagement).
 * Ở đây trả Paginated trực tiếp từ wrapper.
 */

import { apiFetch } from "./api";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface PaginatedNotifications {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListNotificationsParams {
  search?: string;
  isRead?: boolean;
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}

const DEFAULT_PAGE_SIZE = 10;

async function fetchAllRaw(
  params: ListNotificationsParams = {}
): Promise<Notification[]> {
  const qs = new URLSearchParams();
  if (typeof params.isRead === "boolean") qs.set("isRead", String(params.isRead));
  if (params.includeDeleted) qs.set("includeDeleted", "true");
  qs.set("pageSize", String(params.pageSize ?? 1000));
  // BE hỗ trợ search? Không — listForUser không có param search.
  const path = `/notifications${qs.toString() ? `?${qs}` : ""}`;
  // apiFetch unwrap `data` → ta nhận Notification[].
  const data = await apiFetch<Notification[]>(path);
  if (!Array.isArray(data)) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data;
}

/**
 * Loc/pagination ở FE (BE listForUser hỗ trợ isRead nhưng không search).
 * Trả về đúng shape PaginatedNotifications để UI dùng như server trả.
 */
export async function listNotifications(
  params: ListNotificationsParams = {}
): Promise<PaginatedNotifications> {
  const items = await fetchAllRaw(params);

  let filtered = items;
  const search = (params.search ?? "").trim().toLowerCase();
  if (search) {
    filtered = filtered.filter(
      (n) =>
        n.title.toLowerCase().includes(search) ||
        n.message.toLowerCase().includes(search)
    );
  }

  const total = filtered.length;
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  const start = (page - 1) * pageSize;
  const sliced = filtered.slice(start, start + pageSize);

  return { items: sliced, total, page, pageSize };
}

export const NOTIFICATION_PAGE_SIZE = DEFAULT_PAGE_SIZE;

/**
 * Tạo 1 notification cho 1 userId. Admin-only ở BE.
 */
export async function createNotification(payload: {
  userId: number | string;
  type?: NotificationType;
  title: string;
  message: string;
}): Promise<Notification> {
  const data = await apiFetch<{ notification: Notification }>("/notifications", {
    method: "POST",
    body: payload,
  });
  if (!data || !data.notification) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.notification;
}

/**
 * Lấy chi tiết notification theo id (của chính user đang gọi).
 */
export async function getNotification(id: number | string): Promise<Notification> {
  const data = await apiFetch<{ notification: Notification }>(`/notifications/${id}`);
  if (!data || !data.notification) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.notification;
}

/**
 * Đánh dấu 1 notification là đã đọc. PUT /notifications/:id/read.
 */
export async function markAsRead(id: number | string): Promise<Notification> {
  const data = await apiFetch<{ notification: Notification }>(`/notifications/${id}/read`, {
    method: "PUT",
  });
  if (!data || !data.notification) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.notification;
}

/**
 * Đánh dấu tất cả đã đọc. PUT /notifications/read-all.
 */
export async function markAllAsRead(): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>("/notifications/read-all", { method: "PUT" });
}

/**
 * Xoá mềm notification. DELETE /notifications/:id.
 */
export async function deleteNotification(
  id: number | string
): Promise<{ id: number; deletedAt: string; alreadyDeleted?: boolean }> {
  return apiFetch(`/notifications/${id}`, { method: "DELETE" });
}

/**
 * Đếm số notification chưa đọc — dùng cho Bell badge.
 * Lấy list isRead=false rồi count (BE không có endpoint riêng).
 */
export async function getUnreadCount(): Promise<number> {
  const items = await fetchAllRaw({ isRead: false, pageSize: 1000 });
  return items.length;
}

/**
 * Lấy tối đa N notification gần nhất (cho Bell dropdown).
 * includeDeleted=false để không hiển thị thông báo đã xoá.
 */
export async function getRecentNotifications(limit = 7): Promise<Notification[]> {
  const items = await fetchAllRaw({ pageSize: limit });
  return items;
}