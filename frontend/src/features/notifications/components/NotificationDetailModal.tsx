import { useEffect, useState } from "react";
import { Button, Modal } from "../../../shared/components/ui";
import {
  getNotification,
  type Notification,
} from "../services/notificationApi";
import { ApiError } from "../../../shared/api";
import { useNotifications } from "../../../shared/contexts/NotificationContext";
import styles from "./NotificationDetailModal.module.css";

const TYPE_LABELS: Record<Notification["type"], string> = {
  INFO: "Thông tin",
  SUCCESS: "Thành công",
  WARNING: "Cảnh báo",
  ERROR: "Lỗi",
};

const TYPE_CLASS: Record<Notification["type"], string> = {
  INFO: styles.typeInfo ?? "",
  SUCCESS: styles.typeSuccess ?? "",
  WARNING: styles.typeWarning ?? "",
  ERROR: styles.typeError ?? "",
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export interface NotificationDetailModalProps {
  open: boolean;
  notificationId: number | string | null;
  /**
   * Khi mở modal cho notification chưa đọc, tự gọi markAsRead qua context
   * (đã có optimistic update).
   */
  autoMarkRead?: boolean;
  onClose: () => void;
}

export function NotificationDetailModal({
  open,
  notificationId,
  autoMarkRead = true,
  onClose,
}: NotificationDetailModalProps) {
  const [notif, setNotif] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { markOneRead } = useNotifications();

  useEffect(() => {
    if (!open || notificationId == null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotif(null);
    getNotification(notificationId)
      .then(async (data) => {
        if (cancelled) return;
        setNotif(data);
        if (autoMarkRead && !data.isRead) {
          // Đánh dấu đã đọc qua context (cập nhật Bell badge + recent ngay).
          await markOneRead(data.id);
          // Local state của modal cũng phản ánh đã đọc.
          setNotif((prev) => (prev ? { ...prev, isRead: true } : prev));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Không tải được thông báo";
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, notificationId, autoMarkRead, markOneRead]);

  return (
    <Modal open={open} onClose={onClose} title="Chi tiết thông báo" size="md">
      {loading ? (
        <p className={styles.placeholder}>Đang tải...</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : notif ? (
        <div className={styles.body}>
          <div className={styles.header}>
            <span
              className={[styles.typeBadge, TYPE_CLASS[notif.type]].join(" ")}
            >
              {TYPE_LABELS[notif.type]}
            </span>
            <span
              className={[
                styles.statusBadge,
                notif.isRead ? styles.statusRead : styles.statusUnread,
              ].join(" ")}
            >
              {notif.isRead ? "Đã đọc" : "Chưa đọc"}
            </span>
          </div>
          <h3 className={styles.title}>{notif.title}</h3>
          <p className={styles.message}>{notif.message}</p>
          <dl className={styles.meta}>
            <div>
              <dt>Người nhận (ID)</dt>
              <dd>{notif.userId}</dd>
            </div>
            <div>
              <dt>Ngày tạo</dt>
              <dd>{formatDateTime(notif.createdAt)}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className={styles.placeholder}>Không có dữ liệu</p>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
}