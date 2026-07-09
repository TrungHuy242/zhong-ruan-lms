import { Modal, Button } from "../../shared/components/ui";
import { getUser, type User, type UserRole, type UserStatus } from "./userApi";
import { useEffect, useState } from "react";
import { ApiError } from "../../shared/lib/api";
import styles from "./UserDetailModal.module.css";

export interface UserDetailModalProps {
  open: boolean;
  /** Khi open=true, BE tải chi tiết theo userId. */
  userId: number | string | null;
  onClose: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giáo viên",
  STUDENT: "Học viên",
};

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Chưa kích hoạt",
  SUSPENDED: "Đã khoá",
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

export function UserDetailModal({
  open,
  userId,
  onClose,
}: UserDetailModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || userId == null) return;
    setLoading(true);
    setError(null);
    setUser(null);
    getUser(userId)
      .then((data) => setUser(data))
      .catch((err) => {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Không tải được thông tin người dùng";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [open, userId]);

  return (
    <Modal open={open} onClose={onClose} title="Chi tiết người dùng" size="md">
      {loading ? (
        <p className={styles.placeholder}>Đang tải...</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : user ? (
        <dl className={styles.list}>
          <div className={styles.row}>
            <dt>Họ tên</dt>
            <dd>{user.fullName}</dd>
          </div>
          <div className={styles.row}>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className={styles.row}>
            <dt>Số điện thoại</dt>
            <dd>{user.phone || "—"}</dd>
          </div>
          <div className={styles.row}>
            <dt>Vai trò</dt>
            <dd>{ROLE_LABELS[user.role] ?? user.role}</dd>
          </div>
          <div className={styles.row}>
            <dt>Trạng thái</dt>
            <dd>{STATUS_LABELS[user.status] ?? user.status}</dd>
          </div>
          <div className={styles.row}>
            <dt>Ngày tạo</dt>
            <dd>{formatDateTime(user.createdAt)}</dd>
          </div>
          {user.updatedAt ? (
            <div className={styles.row}>
              <dt>Cập nhật lần cuối</dt>
              <dd>{formatDateTime(user.updatedAt)}</dd>
            </div>
          ) : null}
          {user.deletedAt ? (
            <div className={styles.row}>
              <dt>Đã xoá lúc</dt>
              <dd>{formatDateTime(user.deletedAt)}</dd>
            </div>
          ) : null}
        </dl>
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
