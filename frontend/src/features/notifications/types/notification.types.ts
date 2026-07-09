/**
 * notification.types — type/interface dùng riêng cho feature notifications.
 */

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

export interface CreateNotificationPayload {
  userId: number | string;
  type?: NotificationType;
  title: string;
  message: string;
}
