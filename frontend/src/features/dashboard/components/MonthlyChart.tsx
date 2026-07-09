import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./MonthlyChart.module.css";

/**
 * 1 điểm dữ liệu cho 1 tháng trong 3 chuỗi time-series.
 * `month` dạng "YYYY-MM" (sẽ được format ngắn gọn "MM/YYYY" trên trục X).
 */
export interface MonthlyDataPoint {
  month: string;
  users: number;
  files: number;
  notifications: number;
}

export interface MonthlyChartProps {
  /** Tất cả 3 chuỗi dữ liệu gộp vào 1 mảng. */
  data: MonthlyDataPoint[];
  /** Chuỗi nào đang được chọn để vẽ (mặc định "users"). */
  series?: "users" | "files" | "notifications";
  /** Có đang loading hay không (chỉ hiện skeleton, không render chart). */
  loading?: boolean;
  /** Có dữ liệu hay không (rỗng). */
  empty?: boolean;
  /** Có lỗi hay không. */
  error?: string | null;
}

const SERIES_META: Record<
  "users" | "files" | "notifications",
  { label: string; color: string; accessor: keyof MonthlyDataPoint }
> = {
  users: {
    label: "User đăng ký",
    color: "var(--brand-primary)",
    accessor: "users",
  },
  files: {
    label: "File upload",
    color: "var(--brand-accent-hover)",
    accessor: "files",
  },
  notifications: {
    label: "Notification",
    color: "var(--color-info)",
    accessor: "notifications",
  },
};

/**
 * Format tháng "YYYY-MM" → "MM/YYYY" cho trục X.
 * VD: "2026-07" → "07/2026".
 */
function formatMonth(value: string): string {
  if (!value || value.length < 7) return value;
  return `${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

export function MonthlyChart({
  data,
  series = "users",
  loading = false,
  empty = false,
  error = null,
}: MonthlyChartProps) {
  const meta = SERIES_META[series];
  const accessor = meta.accessor;
  const colorVar = meta.color;

  if (loading) {
    return (
      <div className={styles.wrapper} aria-busy="true">
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.errorText}>{error}</p>
      </div>
    );
  }

  if (empty || data.length === 0) {
    return (
      <div className={styles.wrapper}>
        <p className={styles.emptyText}>Chưa có dữ liệu thống kê theo tháng</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 16, bottom: 0, left: -10 }}
        >
          <defs>
            <linearGradient id={`fill-${series}`} x1="0" y1="0" x2="0" y2="1">
              {/* Color được truyền qua CSS var (resolved tại runtime bởi SVG). */}
              <stop offset="0%" stopColor={colorVar} stopOpacity={0.35} />
              <stop offset="100%" stopColor={colorVar} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--border-default)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
            stroke="var(--border-default)"
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
            stroke="var(--border-default)"
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              boxShadow: "var(--shadow-card)",
            }}
            labelFormatter={(label) => formatMonth(String(label))}
            formatter={(value) => [
              new Intl.NumberFormat("vi-VN").format(Number(value) || 0),
              meta.label,
            ]}
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey={accessor as string}
            stroke={colorVar}
            strokeWidth={2.5}
            fill={`url(#fill-${series})`}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--bg-surface)" }}
            isAnimationActive
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}