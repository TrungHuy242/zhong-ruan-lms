import { useEffect, useState } from "react";
import {
  LogIn,
  UserPlus,
  Edit3,
  Trash2,
  RotateCcw,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import {
  getRecentAuditLogs,
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_GROUPS,
  AUDIT_GROUP_LABELS,
  type AuditLog,
} from "../../audit-log/services/auditLogApi";
import { AuditLogDetailModal } from "../../audit-log/components/AuditLogDetailModal";
import { ApiError } from "../../../shared/api";
import styles from "./RecentActivities.module.css";

export interface RecentActivitiesProps {
  /** Số hoạt động lấy về (mặc định 10). */
  limit?: number;
  /**
   * Setter báo cho parent biết đang load (để disable nút refresh toàn trang
   * nếu cần). Không bắt buộc.
   */
  onLoadingChange?: (loading: boolean) => void;
  /**
   * Callback khi 1 row được click — parent có thể mở trang Audit Log full
   * thay vì modal chi tiết (mặc định mở modal).
   */
  onItemClick?: (log: AuditLog) => void;
}

const GROUP_ICON: Record<string, LucideIcon> = {
  auth: LogIn,
  create: UserPlus,
  update: Edit3,
  delete: Trash2,
  restore: RotateCcw,
  other: ScrollText,
};

function relativeTime(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const diffMs = Date.now() - new Date(value).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Vừa xong";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} giờ trước`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD} ngày trước`;
    return new Date(value).toLocaleDateString("vi-VN");
  } catch {
    return "";
  }
}

function actorLabel(log: AuditLog): string {
  if (!log.user) return log.userId != null ? `ID: ${log.userId}` : "Hệ thống";
  return log.user.fullName;
}

/**
 * RecentActivities — widget hiển thị các hoạt động gần nhất trên Dashboard.
 *
 * - Gọi GET /admin/audit-logs/recent?limit=N — BE trả đúng N hoạt động mới nhất
 *   (createdAt desc). Không cần sort/slice phía FE (fix P0-01).
 * - Click 1 dòng → mở AuditLogDetailModal (re-use từ màn Audit Log).
 */
export function RecentActivities({
  limit = 10,
  onLoadingChange,
}: RecentActivitiesProps) {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const load = async () => {
    setLoading(true);
    onLoadingChange?.(true);
    setError(null);
    try {
      // Endpoint chuyên dụng: BE trả đúng N bản ghi mới nhất (sort createdAt desc),
      // không phụ thuộc pageSize cap của list endpoint.
      const recent = await getRecentAuditLogs(limit);
      setItems(recent);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được nhật ký hoạt động";
      setError(message);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  return (
    <div className={styles.wrapper}>
      {loading ? (
        <ul className={styles.list} aria-busy="true">
          {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
            <li key={i} className={styles.item}>
              <span className={styles.iconSkeleton} aria-hidden="true" />
              <div className={styles.body}>
                <span className={`${styles.line} ${styles.skeleton}`} />
                <span className={`${styles.subline} ${styles.skeleton}`} />
              </div>
            </li>
          ))}
        </ul>
      ) : error ? (
        <p className={styles.errorText}>{error}</p>
      ) : items.length === 0 ? (
        <p className={styles.emptyText}>Chưa có hoạt động nào được ghi nhận</p>
      ) : (
        <ul className={styles.list}>
          {items.map((log) => {
            const group =
              AUDIT_ACTION_GROUPS[log.action as keyof typeof AUDIT_ACTION_GROUPS] ?? "other";
            const Icon = GROUP_ICON[group] ?? ScrollText;
            const actionLabel =
              AUDIT_ACTION_LABELS[log.action as keyof typeof AUDIT_ACTION_LABELS] ??
              log.action;
            return (
              <li key={log.id}>
                <button
                  type="button"
                  className={styles.item}
                  onClick={() => setDetailLog(log)}
                  aria-label={`Xem chi tiết hoạt động: ${actionLabel}`}
                >
                  <span
                    className={`${styles.icon} ${styles[`tone_${group}`] ?? ""}`}
                    aria-hidden="true"
                  >
                    <Icon size={16} />
                  </span>
                  <div className={styles.body}>
                    <span className={styles.title}>{actionLabel}</span>
                    <span className={styles.meta}>
                      {actorLabel(log)}
                      {log.target ? ` · ${log.target}` : ""} ·{" "}
                      {relativeTime(log.createdAt)}
                    </span>
                  </div>
                  <span className={styles.groupBadge} aria-hidden="true">
                    {AUDIT_GROUP_LABELS[group]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <AuditLogDetailModal
        open={Boolean(detailLog)}
        log={detailLog}
        onClose={() => setDetailLog(null)}
      />
    </div>
  );
}