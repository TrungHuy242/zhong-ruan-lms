/**
 * UserActivityTimeline — dạng Timeline (không phải Table) hiển thị lịch sử hoạt động
 * của 1 user, gọi GET /api/admin/audit-logs?userId={id}.
 *
 * Có phân trang + nút "Xem thêm" để tránh load 1 lúc quá nhiều log.
 * Map action code → label tiếng Việt qua AUDIT_ACTION_LABELS,
 * icon theo group (create/update/delete/restore/auth/other) qua lucide-react.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
} from "../../../shared/components/ui";
import {
  AUDIT_ACTION_GROUPS,
  AUDIT_ACTION_LABELS,
  AUDIT_GROUP_LABELS,
  type AuditAction,
  type AuditActionGroup,
  type AuditLog,
} from "../../audit-log";
import { listAuditLogs } from "../../audit-log/services/auditLogApi";
import { ApiError } from "../../../shared/api";
import {
  Activity,
  CheckCircle2,
  KeyRound,
  LogIn,
  Pencil,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  UserX,
} from "lucide-react";
import styles from "./UserActivityTimeline.module.css";

export interface UserActivityTimelineProps {
  userId: number | string;
  /** Trang đầu lấy bao nhiêu entry — mặc định 10. */
  pageSize?: number;
}

const GROUP_ICON: Record<AuditActionGroup, typeof Activity> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  restore: RotateCcw,
  auth: LogIn,
  other: Activity,
};

const GROUP_TONE: Record<AuditActionGroup, string> = {
  create: "toneCreate",
  update: "toneUpdate",
  delete: "toneDelete",
  restore: "toneRestore",
  auth: "toneAuth",
  other: "toneOther",
};

function formatTime(value: string | null | undefined): string {
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

function relativeTime(value: string | null | undefined): string {
  if (!value) return "";
  const ms = Date.now() - new Date(value).getTime();
  if (ms < 60_000) return "vừa xong";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} ngày trước`;
  return formatTime(value);
}

export function UserActivityTimeline({
  userId,
  pageSize = 10,
}: UserActivityTimelineProps) {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await listAuditLogs({
          userId: Number(userId),
          page: pageToLoad,
          pageSize,
        });
        setTotal(result.total);
        setItems((prev) =>
          append ? [...prev, ...result.items] : result.items
        );
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Không tải được lịch sử hoạt động";
        setError(message);
      } finally {
        setLoadingMore(false);
        setLoading(false);
      }
    },
    [userId, pageSize]
  );

  useEffect(() => {
    setItems([]);
    setPage(1);
    setTotal(0);
    load(1, false);
  }, [load]);

  const hasMore = items.length < total;

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    load(next, true);
  }

  const headerSummary = useMemo(() => {
    if (loading) return "Đang tải...";
    if (total === 0) return "Chưa có hoạt động nào";
    return `${total} hoạt động được ghi nhận`;
  }, [loading, total]);

  return (
    <section className={styles.timelineSection} aria-label="Lịch sử hoạt động">
      <header className={styles.header}>
        <h3 className={styles.title}>Lịch sử hoạt động</h3>
        <span className={styles.subtitle}>{headerSummary}</span>
      </header>

      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : loading ? (
        <div className={styles.loading}>Đang tải lịch sử...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <Activity size={36} aria-hidden="true" />
          <p className={styles.emptyText}>
            Chưa có hoạt động nào được ghi nhận cho người dùng này.
          </p>
        </div>
      ) : (
        <>
          <ol className={styles.list}>
            {items.map((log) => {
              const group =
                AUDIT_ACTION_GROUPS[log.action as AuditAction] ?? "other";
              const Icon = GROUP_ICON[group];
              const toneClass =
                styles[GROUP_TONE[group]] ?? styles.toneOther;
              const label =
                AUDIT_ACTION_LABELS[log.action as AuditAction] ?? log.action;
              const meta = log.meta as Record<string, unknown> | null;
              const metaText = buildMetaSummary(log.action, meta);

              return (
                <li key={log.id} className={styles.entry}>
                  <div className={`${styles.iconWrap} ${toneClass}`}>
                    <Icon size={14} aria-hidden="true" />
                  </div>
                  <div className={styles.content}>
                    <div className={styles.entryTop}>
                      <span className={styles.actionLabel}>{label}</span>
                      <span
                        className={`${styles.groupBadge} ${toneClass}`}
                        title={AUDIT_GROUP_LABELS[group]}
                      >
                        {AUDIT_GROUP_LABELS[group]}
                      </span>
                    </div>
                    {metaText ? (
                      <p className={styles.meta}>{metaText}</p>
                    ) : null}
                    <div className={styles.entryBottom}>
                      <time
                        className={styles.time}
                        dateTime={log.createdAt}
                        title={formatTime(log.createdAt)}
                      >
                        {relativeTime(log.createdAt)}
                      </time>
                      {log.ip ? (
                        <span className={styles.ip}>IP: {log.ip}</span>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {hasMore ? (
            <div className={styles.loadMoreWrap}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLoadMore}
                isLoading={loadingMore}
                loadingText="Đang tải..."
              >
                Xem thêm ({total - items.length} hoạt động)
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

/**
 * Build 1 câu mô tả meta ngắn gọn (tiếng Việt) cho từng action để user hiểu
 * nhanh action đó làm gì mà không cần đọc JSON meta.
 */
function buildMetaSummary(
  action: string,
  meta: Record<string, unknown> | null
): string | null {
  if (!meta) return null;
  const parts: string[] = [];

  if (typeof meta.email === "string") parts.push(`email: ${meta.email}`);
  if (typeof meta.role === "string") parts.push(`vai trò: ${meta.role}`);
  if (typeof meta.fullName === "string" && !parts.some((p) => p.includes(meta.fullName as string))) {
    parts.push(`tên: ${meta.fullName}`);
  }

  if (action === "USER_STATUS_BULK_UPDATE") {
    const from = meta.fromStatus;
    const to = meta.toStatus;
    if (typeof from === "string" && typeof to === "string") {
      parts.push(`trạng thái: ${from} → ${to}`);
    }
    if (typeof meta.bulkSize === "number") parts.push(`(${meta.bulkSize} user)`);
  } else if (action === "USER_SOFT_DELETE_BULK") {
    if (typeof meta.bulkSize === "number") parts.push(`(${meta.bulkSize} user)`);
  } else if (action === "ADMIN_USER_UPDATED" && meta.changes && typeof meta.changes === "object") {
    const changes = meta.changes as Record<string, unknown>;
    const changedKeys = Object.keys(changes);
    if (changedKeys.length > 0) {
      parts.push(`đổi: ${changedKeys.join(", ")}`);
    }
  }

  if (typeof meta.ip === "string") parts.push(`IP: ${meta.ip}`);

  // Loại bỏ các key đã hiển thị để tránh trùng
  const finalParts = parts.filter((p) => p.trim().length > 0);
  if (finalParts.length === 0) return null;
  return finalParts.join(" • ");
}

// Tránh TypeScript coi CheckCircle2, KeyRound, ShieldAlert, UserX là không dùng
// (giữ sẵn cho extension khi cần icon riêng theo action cụ thể).
void CheckCircle2;
void KeyRound;
void ShieldAlert;
void UserX;