/**
 * notificationApi — giao tiếp với backend cho module Notification.
 *
 * Endpoint gốc: GET /api/notifications (mount trong app.js).
 *   - User thường: chỉ thấy thông báo của chính mình (BE lọc theo userId từ token).
 *   - Admin: tạo được broadcast nhưng BE chỉ nhận userId cụ thể — nên FE
 *     phải tự resolve danh sách userId (theo role hoặc tất cả) rồi gọi POST
 *     lặp nhiều lần.
 *
 * Lưu ý quan trọng về BE capabilities:
 *   - BE listForUser hỗ trợ param `isRead` (server-side filter).
 *   - BE KHÔNG hỗ trợ param `search` — search phải làm client-side.
 *   - Phân trang server-side: page + pageSize.
 *
 * Để infinite scroll vừa có search vừa có filter tab:
 *   1. Gọi server-side filter theo `isRead` (chỉ lấy đúng tập cần).
 *   2. Client-side filter theo `search` trên tập đã lọc.
 *   3. Slice theo (page, pageSize) trên tập đã search.
 *
 * Nhược điểm: tải nhiều (pageSize=1000) rồi filter client → OK vì panel không
 * cần data lịch sử rất sâu; nếu sau này BE hỗ trợ search thì chỉ cần đổi 1 chỗ.
 */

import { apiFetch } from "../../../shared/api";
import { NOTIFICATION_PAGE_SIZE } from "../constants/notification.constants";
import type {
  ListNotificationsParams,
  Notification,
  PaginatedNotifications,
} from "../types/notification.types";

export type {
  CreateNotificationPayload,
  ListNotificationsParams,
  Notification,
  NotificationType,
  PaginatedNotifications,
} from "../types/notification.types";
export {
  NOTIFICATION_PAGE_SIZE,
  NOTIFICATION_TYPE_LABELS,
} from "../constants/notification.constants";

/** Tab filter trên UI. */
export type NotificationStatusFilter = "ALL" | "READ" | "UNREAD";

/**
 * Fetch nguyên bản từ server, KHÔNG filter/search — dùng cho các nơi cần raw data
 * (vd: Bell badge polling, catch-up REST sau khi socket reconnect).
 */
async function fetchAllRaw(
  params: ListNotificationsParams = {}
): Promise<Notification[]> {
  const qs = new URLSearchParams();
  if (typeof params.isRead === "boolean") qs.set("isRead", String(params.isRead));
  if (params.includeDeleted) qs.set("includeDeleted", "true");
  qs.set("pageSize", String(params.pageSize ?? 1000));
  const path = `/notifications${qs.toString() ? `?${qs}` : ""}`;
  const data = await apiFetch<Notification[]>(path);
  if (!Array.isArray(data)) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data;
}

/**
 * Lấy 1 page đã được filter `isRead` ở server + filter `search` ở client.
 * Dùng cho infinite scroll: mỗi lần gọi trả về items của (page, pageSize) trên
 * tập đã lọc.
 *
 * Lưu ý về hiệu năng: server trả tối đa 1000 record / call, sau đó FE slice theo
 * page. Vì panel chỉ hiển thị gần đây (mặc định pageSize=20 → tối đa ~50 page),
 * thực tế FE luôn đủ dữ liệu trong 1 call. Đây là cách Bell cũ cũng đã làm.
 */
export async function listNotifications(
  params: ListNotificationsParams = {}
): Promise<PaginatedNotifications> {
  const isRead = typeof params.isRead === "boolean" ? params.isRead : undefined;

  // Gọi server-side filter theo isRead (giảm payload thật).
  const items = await fetchAllRaw({
    isRead,
    pageSize: 1000,
    includeDeleted: false,
  });

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
  const pageSize = params.pageSize ?? NOTIFICATION_PAGE_SIZE;
  const start = (page - 1) * pageSize;
  const sliced = filtered.slice(start, start + pageSize);

  return { items: sliced, total, page, pageSize };
}

/**
 * Tạo 1 notification cho 1 userId. Admin-only ở BE.
 */
export async function createNotification(
  payload: import("../types/notification.types").CreateNotificationPayload
): Promise<Notification> {
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
 * Lấy tối đa N notification gần nhất (cho Bell badge + context).
 * includeDeleted=false để không hiển thị thông báo đã xoá.
 */
export async function getRecentNotifications(limit = 7): Promise<Notification[]> {
  const items = await fetchAllRaw({ pageSize: limit });
  return items;
}

/**
 * Build 1 Notification từ socket payload (BE `notification:new`).
 *
 * Socket chỉ gửi contentPreview (≤120 ký tự), không có message đầy đủ và
 * userId (vì BE đã resolve target = current user rồi). Trả về Notification
 * "rỗng" vừa đủ cho UI prepend — khi user click vào item, NotificationDetail
 * Modal sẽ fetch full data qua REST getNotification(id).
 */
export function notificationFromSocketPayload(
  payload: import("../../../shared/hooks/useNotificationSocket").SocketNewNotificationPayload
): Notification {
  const preview =
    typeof payload.contentPreview === "string" ? payload.contentPreview : "";
  return {
    id: payload.id,
    // Socket không kèm userId của recipient — đặt 0 đánh dấu là "self-derived".
    // UI chỉ cần id/title/content/type để render.
    userId: 0,
    type: payload.type,
    title: payload.title,
    message: preview,
    isRead: !!payload.isRead,
    createdAt: payload.createdAt,
    updatedAt: payload.createdAt,
    deletedAt: null,
  };
}