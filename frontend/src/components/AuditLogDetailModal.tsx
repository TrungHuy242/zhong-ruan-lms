import { Button, Modal } from "./ui";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_GROUP_LABELS,
  type AuditLog,
  type AuditActionGroup,
} from "../lib/auditLogApi";
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

export interface AuditLogDetailModalProps {
  open: boolean;
  log: AuditLog | null;
  onClose: () => void;
}

export function AuditLogDetailModal({
  open,
  log,
  onClose,
}: AuditLogDetailModalProps) {
  if (!log) {
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

  // Look up action label by reverse-mapping or fallback to code.
  const actionLabel =
    AUDIT_ACTION_LABELS[log.action as keyof typeof AUDIT_ACTION_LABELS] ?? log.action;

  // Compute group from action.
  let group: AuditActionGroup = "other";
  for (const [code, grp] of Object.entries({
    AUTH_LOGIN_SUCCESS: "auth",
    AUTH_LOGIN_FAIL: "auth",
    AUTH_LOGOUT_SUCCESS: "auth",
    AUTH_REGISTER_SUCCESS: "auth",
    AUTH_REGISTER_FAIL: "auth",
    AUTH_CHANGE_PASSWORD_SUCCESS: "auth",
    ADMIN_USER_CREATED: "create",
    ADMIN_USER_UPDATED: "update",
    USER_SOFT_DELETE: "delete",
    USER_RESTORE: "restore",
    USER_FORCE_DELETE: "delete",
    NOTIFICATION_SOFT_DELETE: "delete",
    NOTIFICATION_RESTORE: "restore",
    NOTIFICATION_FORCE_DELETE: "delete",
  } as Record<string, AuditActionGroup>)) {
    if (code === log.action) {
      group = grp;
      break;
    }
  }

  const actor = log.user;

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
              {log.userId != null ? ` (ID: ${log.userId})` : ""}
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
            <code className={styles.actionCode}>{log.action}</code>
          </div>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Đối tượng tác động</h4>
          <p className={styles.value}>{log.target ?? "—"}</p>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Thời gian</h4>
          <p className={styles.value}>{formatDateTime(log.createdAt)}</p>
        </section>

        {log.ip ? (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Địa chỉ IP</h4>
            <p className={styles.value}>{log.ip}</p>
          </section>
        ) : null}

        {log.userAgent ? (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>User-Agent</h4>
            <p className={[styles.value, styles.userAgent].join(" ")}>
              {log.userAgent}
            </p>
          </section>
        ) : null}

        {log.meta ? (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Dữ liệu chi tiết (meta)</h4>
            <pre className={styles.metaBlock}>{formatMeta(log.meta)}</pre>
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