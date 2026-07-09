import { ReactNode } from "react";
import { Info } from "lucide-react";
import styles from "./KpiCard.module.css";
import { useCountUp } from "../../../shared/hooks/useCountUp";

/**
 * Tone để phối màu icon badge — đồng bộ với StatCard để không phá chỗ khác
 * đang dùng StatCard. KpiCard có thêm "size" cho icon khi hover.
 */
export type KpiCardTone =
  | "primary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "neutral";

export interface KpiCardProps {
  /** Icon hiển thị trong badge tròn. */
  icon: ReactNode;
  /** Số liệu chính — sẽ được animate đếm lên khi thay đổi. */
  value: number;
  /** Nhãn mô tả số liệu. */
  label: ReactNode;
  /** Tone màu icon badge. Mặc định "primary". */
  tone?: KpiCardTone;
  /** Bật skeleton (lần tải đầu). */
  loading?: boolean;
  /** Class bổ sung. */
  className?: string;

  /**
   * So sánh tăng/giảm so với kỳ trước.
   * - Nếu có: hiện mũi tên ↑/↓ với % ở dưới số chính.
   * - prev = null: ẩn khối này (không có dữ liệu so sánh).
   */
  previousValue?: number | null;

  /**
   * Tooltip giải thích chỉ số — icon (i) nhỏ cạnh tiêu đề card,
   * hover hiện text ngắn. CSS thuần :hover, không cần lib.
   */
  hint?: string;
}

function classNames(
  ...values: Array<string | false | undefined | null>
): string {
  return values.filter(Boolean).join(" ");
}

export function KpiCard({
  icon,
  value,
  label,
  tone = "primary",
  loading = false,
  className,
  previousValue = null,
  hint,
}: KpiCardProps) {
  // Animation đếm số (chỉ chạy khi !loading để tránh giật với skeleton).
  const animatedValue = useCountUp(loading ? 0 : value);

  // Format số với dấu phẩy ngăn hàng nghìn (1,234).
  const numberFormatter = new Intl.NumberFormat("vi-VN");

  // Tính % thay đổi so với kỳ trước.
  let trendPercent: number | null = null;
  let trendDirection: "up" | "down" | "flat" = "flat";
  if (previousValue != null && !loading) {
    if (previousValue === 0) {
      // Tránh chia cho 0. Nếu value > 0 thì coi như +100% (không hoàn toàn
      // chính xác nhưng đủ để truyền tải "tăng mạnh").
      trendPercent = value > 0 ? 100 : 0;
    } else {
      trendPercent = ((value - previousValue) / previousValue) * 100;
    }
    if (trendPercent > 0.5) trendDirection = "up";
    else if (trendPercent < -0.5) trendDirection = "down";
    else trendDirection = "flat";
  }

  const trendText =
    trendPercent == null
      ? null
      : trendDirection === "up"
        ? `+${trendPercent.toFixed(1)}%`
        : trendDirection === "down"
          ? `${trendPercent.toFixed(1)}%`
          : "0%";

  return (
    <div className={classNames(styles.card, className)}>
      <div className={styles.header}>
        <div className={classNames(styles.iconBadge, styles[`tone_${tone}`])}>
          {icon}
        </div>
        {hint ? (
          <span className={styles.hintWrap} tabIndex={0} aria-label={hint}>
            <Info size={14} aria-hidden="true" />
            <span className={styles.hintTooltip} role="tooltip">
              {hint}
            </span>
          </span>
        ) : null}
      </div>

      {loading ? (
        <>
          <span
            className={classNames(styles.value, styles.skeletonBox, styles.skeletonValue)}
            aria-hidden="true"
          />
          <span
            className={classNames(styles.label, styles.skeletonBox, styles.skeletonLabel)}
            aria-hidden="true"
          />
        </>
      ) : (
        <>
          <p className={styles.value}>
            {numberFormatter.format(Math.round(animatedValue))}
          </p>
          <p className={styles.label}>{label}</p>
          {trendText != null ? (
            <p
              className={classNames(
                styles.trend,
                trendDirection === "up" && styles.trendUp,
                trendDirection === "down" && styles.trendDown,
                trendDirection === "flat" && styles.trendFlat
              )}
              aria-label={`So với kỳ trước: ${trendText}`}
            >
              <span className={styles.trendArrow} aria-hidden="true">
                {trendDirection === "up" ? "↑" : trendDirection === "down" ? "↓" : "→"}
              </span>
              {trendText}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}