import { Fragment } from "react";
import { AuditActionBadge } from "./AuditActionBadge";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_MODULE_LABELS,
} from "../constants/audit.constants";
import type {
  AuditAction,
  AuditLog,
  AuditModule,
} from "../services/auditLogApi";
import { Calendar, ChevronRight, Clock } from "lucide-react";
import styles from "./AuditTimeline.module.css";

export interface AuditTimelineProps {
  items: AuditLog[];
  loading?: boolean;
  skeletonCount?: number;
  onOpenDetail: (log: AuditLog) => void;
}

/**
 * Group các audit log theo ngày (YYYY-MM-DD theo local timezone).
 * Items đã được BE sort createdAt desc → group theo thứ tự này tự nhiên.
 */
function groupByDay(items: AuditLog[]): Array<{ day: string; logs: AuditLog[] }> {
  const map = new Map<string, AuditLog[]>();
  for (const log of items) {
    if (!log.createdAt) continue;
    const d = new Date(log.createdAt);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const arr = map.get(dayKey) ?? [];
    arr.push(log);
    map.set(dayKey, arr);
  }
  // Map giữ insertion order → sort giảm dần theo key ngày.
  const entries = Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  return entries.map(([day, logs]) => ({ day, logs }));
}

/** Format nhãn ngày tiếng Việt: "Hôm nay", "Hôm qua", "10/07/2026". */
function formatDayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (dayKey === todayKey) return "Hôm nay";
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  const yKey = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(yest.getDate()).padStart(2, "0")}`;
  if (dayKey === yKey) return "Hôm qua";
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function classNames(...values: Array<string | false | undefined | null>): string {
  return values.filter(Boolean).join(" ");
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

/** Parse target dạng "Module:id" → { module, id } hoặc null. */
function parseTarget(target: string | null): { module: AuditModule; id: string } | null {
  if (!target) return null;
  const idx = target.indexOf(":");
  if (idx <= 0) return null;
  const mod = target.slice(0, idx) as AuditModule;
  const id = target.slice(idx + 1);
  return { module: mod, id };
}

/**
 * AuditTimeline — hiển thị log theo thời gian, group theo ngày.
 *
 * Mỗi entry gồm:
 *   - Cột trái: dot màu theo tone + đường kẻ dọc + thời gian HH:mm
 *   - Cột phải: card chứa avatar actor + tên + email + action label + target + nút "Xem"
 *
 * Click card → mở detail modal.
 */
export function AuditTimeline({
  items,
  loading,
  skeletonCount = 6,
  onOpenDetail,
}: AuditTimelineProps) {
  if (loading) {
    return (
      <div className={styles.timeline}>
        {Array.from({ length: skeletonCount }).map((_, idx) => (
          <div key={`s-${idx}`} className={styles.entry}>
            <div className={styles.leftCol}>
              <span className={classNames(styles.dot, styles.dotSkeleton)} />
              <span className={styles.line} />
            </div>
            <div className={styles.card}>
              <div className={styles.cardRow}>
                <span className={classNames(styles.skeleton, styles.skelWide)} />
              </div>
              <div className={styles.cardRow}>
                <span className={classNames(styles.skeleton, styles.skelNarrow)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const groups = groupByDay(items);

  return (
    <div className={styles.timeline}>
      {groups.map((group, gIdx) => (
        <Fragment key={group.day}>
          <div className={styles.dayHeader}>
            <span className={styles.dayChip}>
              <Calendar size={14} aria-hidden="true" />
              <span>{formatDayLabel(group.day)}</span>
            </span>
            <span className={styles.dayCount}>
              {group.logs.length} hoạt động
            </span>
          </div>

          {group.logs.map((log, idx) => {
            const isLastInDay =
              gIdx === groups.length - 1 && idx === group.logs.length - 1;
            const target = parseTarget(log.target);
            const moduleLabel = target
              ? AUDIT_MODULE_LABELS[target.module] ?? target.module
              : null;

            return (
              <div key={log.id} className={styles.entry}>
                <div className={styles.leftCol}>
                  <span className={styles.dot} aria-hidden="true" />
                  {!isLastInDay ? <span className={styles.line} /> : null}
                  <span className={styles.time}>
                    <Clock size={11} aria-hidden="true" />
                    {formatTime(log.createdAt)}
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.card}
                  onClick={() => onOpenDetail(log)}
                  aria-label={`Xem chi tiết hoạt động ${AUDIT_ACTION_LABELS[log.action as AuditAction] ?? log.action}`}
                >
                  <div className={styles.cardHeader}>
                    <span className={styles.avatar} aria-hidden="true">
                      {getInitials(log.user?.fullName)}
                    </span>
                    <div className={styles.cardActor}>
                      <span className={styles.actorName}>
                        {log.user?.fullName ?? "Không xác định"}
                      </span>
                      <span className={styles.actorEmail}>
                        {log.user?.email ?? `ID: ${log.userId ?? "—"}`}
                      </span>
                    </div>
                    <AuditActionBadge action={log.action} className={styles.badge} />
                  </div>

                  <div className={styles.cardBody}>
                    <span className={styles.actionLabel}>
                      {AUDIT_ACTION_LABELS[log.action as AuditAction] ?? log.action}
                    </span>
                    {target ? (
                      <span className={styles.targetInline}>
                        <span className={styles.targetModule}>{moduleLabel}</span>
                        <code className={styles.targetId}>{target.id}</code>
                      </span>
                    ) : null}
                  </div>

                  <div className={styles.cardFooter}>
                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                      className={styles.chevron}
                    />
                  </div>
                </button>
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}