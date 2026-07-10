import { useEffect, useState } from "react";
import { Button, Modal } from "../../../shared/components/ui";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_GROUP_LABELS,
  getAuditLog,
  type AuditLog,
  type AuditActionGroup,
} from "../services/auditLogApi";
import styles from "./AuditLogDetailModal.module.css";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giáo viên",
  STUDENT: "Học viên",
};

const GROUP_CLASS: Record<AuditActionGroup, string> = {
  create: styles.badgeCreate ?? "",
  update: styles.badgeUpdate ?? "",
  delete: styles.badgeDelete ?? "",
  auth: styles.badgeAuth ?? "",
  restore: styles.badgeRestore ?? "",
  other: styles.badgeOther ?? "",
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
      second: "2-digit",
    });
  } catch {
    return value;
  }
}

function formatMeta(value: unknown): string {
  if (value === null || value === undefined) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const GROUP_BY_ACTION: Record<string, AuditActionGroup> = {
  AUTH_LOGIN_SUCCESS: "auth",
  AUTH_LOGIN_FAIL: "auth",
  AUTH_LOGOUT_SUCCESS: "auth",
  AUTH_REGISTER_SUCCESS: "auth",
  AUTH_REGISTER_FAIL: "auth",
  AUTH_CHANGE_PASSWORD_SUCCESS: "auth",
  ADMIN_USER_CREATED: "create",
  ADMIN_USER_UPDATED: "update",
  USER_SOFT_DELETE: "delete",
  USER_SOFT_DELETE_BULK: "delete",
  USER_STATUS_BULK_UPDATE: "update",
  USER_RESTORE: "restore",
  USER_FORCE_DELETE: "delete",
  NOTIFICATION_SOFT_DELETE: "delete",
  NOTIFICATION_RESTORE: "restore",
  NOTIFICATION_FORCE_DELETE: "delete",
};

export interface AuditLogDetailModalProps {
  open: boolean;
  log: AuditLog | null;
  onClose: () => void;
}

/**
 * Modal chi tiết.
 *
 * - Nhận `log` từ list (giữ UX cũ — admin click vào row → modal mở ngay).
 * - Song song fetch `GET /admin/audit-logs/:id` để có bản đầy đủ (đặc biệt `meta`
 *   dài mà list có thể bị truncate, dù schema hiện tại không truncate — nhưng
 *   đây là điểm mở rộng an toàn khi sau này BE thêm chính sách này).
 * - Nếu `getAuditLog` trả null (404) → fallback dùng `log` từ list.
 * - Meta đã được BE redact ở cả list và detail → tránh trường hợp hiển thị
 *   field nhạy cảm kể cả khi list được gọi từ cache cũ (lý do bảo mật:
 *   redact sống tập trung tại BE).
 */
export function AuditLogDetailModal({
  open,
  log,
  onClose,
}: AuditLogDetailModalProps) {
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !log) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getAuditLog(log.id)
      .then((res) => {
        if (cancelled) return;
        setDetail(res);
      })
      .catch(() => {
        if (cancelled) return;
        setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, log?.id]);

  const view = detail ?? log;

  if (!view) {
    return (
      <Modal open={open} onClose={onClose} title="Chi tiết nhật ký" size="md">
        <p className={styles.placeholder}>Không có dữ liệu</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </Modal>
    );
  }

  const actionLabel =
    AUDIT_ACTION_LABELS[view.action as keyof typeof AUDIT_ACTION_LABELS] ?? view.action;

  const group: AuditActionGroup = GROUP_BY_ACTION[view.action] ?? "other";

  const actor = view.user;

  return (
    <Modal open={open} onClose={onClose} title="Chi tiết nhật ký" size="md">
      <div className={styles.body}>
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Người thực hiện</h4>
          {actor ? (
            <div className={styles.actor}>
              <span className={styles.avatar}>
                {actor.fullName
                  .trim()
                  .split(/\s+/)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <div className={styles.actorInfo}>
                <span className={styles.actorName}>{actor.fullName}</span>
                <span className={styles.actorEmail}>{actor.email}</span>
                <span className={styles.actorMeta}>
                  ID: {actor.id} ·{" "}
                  {ROLE_LABELS[actor.role] ?? actor.role}
                </span>
              </div>
            </div>
          ) : (
            <p className={styles.placeholder}>
              Không có thông tin người thực hiện
              {view.userId != null ? ` (ID: ${view.userId})` : ""}
            </p>
          )}
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Hành động</h4>
          <div className={styles.actionRow}>
            <span className={[styles.badge, GROUP_CLASS[group]].join(" ")}>
              {AUDIT_GROUP_LABELS[group]}
            </span>
            <span className={styles.actionLabel}>{actionLabel}</span>
            <code className={styles.actionCode}>{view.action}</code>
          </div>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Đối tượng tác động</h4>
          <p className={styles.value}>{view.target ?? "—"}</p>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Thời gian</h4>
          <p className={styles.value}>{formatDateTime(view.createdAt)}</p>
        </section>

        {view.ip ? (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Địa chỉ IP</h4>
            <p className={styles.value}>{view.ip}</p>
          </section>
        ) : null}

        {view.userAgent ? (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>User-Agent</h4>
            <p className={[styles.value, styles.userAgent].join(" ")}>
              {view.userAgent}
            </p>
          </section>
        ) : null}

        {loading && !detail ? (
          <p className={styles.placeholder}>Đang tải chi tiết...</p>
        ) : null}

        {view.meta ? (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Dữ liệu chi tiết (meta)</h4>
            <pre className={styles.metaBlock}>{formatMeta(view.meta)}</pre>
          </section>
        ) : null}
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
}
