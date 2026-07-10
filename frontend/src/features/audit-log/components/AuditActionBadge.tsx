import { AUDIT_ACTION_BADGES, AUDIT_TONE_LABELS, type AuditActionTone } from "../constants/audit.constants";
import type { AuditAction } from "../types/audit.types";
import styles from "./AuditActionBadge.module.css";

export interface AuditActionBadgeProps {
  /** Action code (VD: "ADMIN_USER_CREATED"). */
  action: string;
  /**
   * Render label ngắn trên badge (mặc định = AUDIT_TONE_LABELS[tone]).
   * Set `false` để ẩn label (chỉ dùng cho tone color chip — tuỳ ngữ cảnh).
   */
  showLabel?: boolean;
  /** Class thêm cho ngoại lệ layout. */
  className?: string;
}

function classNames(...values: Array<string | false | undefined | null>): string {
  return values.filter(Boolean).join(" ");
}

/**
 * AuditActionBadge — chip màu theo tone của action.
 *
 * Tone map (đồng bộ với DESIGN.md semantic colors):
 *   create  → success  (xanh lá)
 *   update  → warning  (vàng/cam)
 *   delete  → danger   (đỏ)
 *   login   → info     (xanh dương)
 *   logout  → neutral  (xám)
 *   restore → warning  (cam — reuse)
 *   fail    → danger   (đỏ)
 *   neutral → neutral  (xám)
 *
 * Không hard-code màu — dùng class CSS module trỏ vào var(--color-*) của DESIGN.md.
 */
export function AuditActionBadge({
  action,
  showLabel = true,
  className,
}: AuditActionBadgeProps) {
  const tone = (AUDIT_ACTION_BADGES[action as AuditAction] ?? "neutral") as AuditActionTone;
  const label = AUDIT_TONE_LABELS[tone];

  return (
    <span className={classNames(styles.badge, styles[`tone_${tone}`], className)}>
      <span className={styles.dot} aria-hidden="true" />
      {showLabel ? <span className={styles.label}>{label}</span> : null}
    </span>
  );
}