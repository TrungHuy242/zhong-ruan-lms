import { ReactNode } from "react";
import styles from "./StatCard.module.css";

/**
 * Tone để phối màu icon badge.
 *  - "primary": icon brand-primary trên nền brand-primary-light
 *  - "accent":  icon brand-accent-hover trên nền brand-accent-light
 *  - "info":    icon info trên nền info-bg
 *  - "success": icon success trên nền success-bg
 *  - "warning": icon warning trên nền warning-bg
 *  - "neutral": icon text-secondary trên nền surface-alt
 */
export type StatCardTone =
  | "primary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "neutral";

export interface StatCardProps {
  /** Icon hiển thị trong badge tròn (kích thước ~28-32px). */
  icon: ReactNode;
  /** Số liệu chính — render bằng text H2 weight 700, có dấu phẩy nghìn. */
  value: number | string;
  /** Nhãn mô tả số liệu, hiển thị dưới value. */
  label: ReactNode;
  /** Tone màu cho icon badge. Mặc định "primary". */
  tone?: StatCardTone;
  /** Class bổ sung nếu muốn custom kích thước. */
  className?: string;
  /** Bật skeleton cho value — khi loading. */
  loading?: boolean;
}

function classNames(
  ...values: Array<string | false | undefined | null>
): string {
  return values.filter(Boolean).join(" ");
}

export function StatCard({
  icon,
  value,
  label,
  tone = "primary",
  className,
  loading = false,
}: StatCardProps) {
  return (
    <div className={classNames(styles.card, className)}>
      <div className={classNames(styles.iconBadge, styles[`tone_${tone}`])}>
        {icon}
      </div>
      {loading ? (
        <>
          <span className={classNames(styles.value, styles.skeletonBox, styles.skeletonValue)} aria-hidden="true" />
          <span className={classNames(styles.label, styles.skeletonBox, styles.skeletonLabel)} aria-hidden="true" />
        </>
      ) : (
        <>
          <p className={styles.value}>{value}</p>
          <p className={styles.label}>{label}</p>
        </>
      )}
    </div>
  );
}
