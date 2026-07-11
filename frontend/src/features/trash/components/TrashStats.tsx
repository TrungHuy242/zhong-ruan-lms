/**
 * TrashStats — KPI cards cho Trash Manager.
 *
 * Hiển thị:
 *   - Tổng bản ghi đã xoá
 *   - Theo từng module (4 module)
 *   - Hôm nay
 *   - 7 ngày gần nhất
 *
 * Tái sử dụng StatCard từ shared/components/ui (đã có sẵn tone primary/accent/info/success/warning/neutral).
 */
import { Bell, CalendarDays, Clock, FileText, Settings as SettingsIcon, Trash2, User as UserIcon } from "lucide-react";
import { StatCard } from "../../../shared/components/ui";
import { TRASH_MODULE_LABELS } from "../constants/trash.constants";
import type { TrashModule, TrashStats as TrashStatsData } from "../types/trash.types";
import styles from "./TrashStats.module.css";

const MODULE_ICONS: Record<TrashModule, React.ReactNode> = {
  users: <UserIcon size={20} aria-hidden="true" />,
  notifications: <Bell size={20} aria-hidden="true" />,
  files: <FileText size={20} aria-hidden="true" />,
  settings: <SettingsIcon size={20} aria-hidden="true" />,
};

// Tone cho từng module — giữ mapping riêng để không phụ thuộc vào StatCard mặc định.
const MODULE_TONE: Record<TrashModule, React.ComponentProps<typeof StatCard>["tone"]> = {
  users: "primary",
  notifications: "warning",
  files: "info",
  settings: "accent",
};

export interface TrashStatsProps {
  data: TrashStatsData | null;
  loading?: boolean;
}

const MODULES_ORDER: TrashModule[] = ["users", "notifications", "files", "settings"];

/**
 * TrashStats — render lưới StatCard.
 *
 * - Khi loading: hiển thị 6 StatCard với `loading=true` (skeleton đã có sẵn).
 * - Khi data null (lỗi / chưa load): hiển thị 6 card = 0, không skeleton (UX
 *   rõ "không có dữ liệu" hơn là loading mãi).
 *
 * Cấu trúc: 2 hàng × 3 cột
 *   Hàng 1: Tổng · Hôm nay · 7 ngày
 *   Hàng 2: 4 module (cuộn ngang trên mobile)
 */
export function TrashStats({ data, loading = false }: TrashStatsProps) {
  return (
    <div className={styles.grid}>
      {/* Hàng 1 — KPI tổng quan */}
      <StatCard
        icon={<Trash2 size={20} aria-hidden="true" />}
        value={data?.total ?? 0}
        label="Tổng bản ghi đã xoá"
        tone="primary"
        loading={loading}
      />
      <StatCard
        icon={<Clock size={20} aria-hidden="true" />}
        value={data?.today ?? 0}
        label="Hôm nay"
        tone="warning"
        loading={loading}
      />
      <StatCard
        icon={<CalendarDays size={20} aria-hidden="true" />}
        value={data?.last7Days ?? 0}
        label="7 ngày gần nhất"
        tone="info"
        loading={loading}
      />

      {/* Hàng 2 — Per module */}
      {MODULES_ORDER.map((mod) => (
        <StatCard
          key={mod}
          icon={MODULE_ICONS[mod]}
          value={data?.byModule?.[mod]?.total ?? 0}
          label={TRASH_MODULE_LABELS[mod]}
          tone={MODULE_TONE[mod]}
          loading={loading}
        />
      ))}
    </div>
  );
}
