/**
 * TrashStats — KPI cards cho Trash Manager.
 *
 * Hiển thị:
 *   - Tổng bản ghi đã xoá
 *   - Theo từng module (8 module)
 *   - Hôm nay
 *   - 7 ngày gần nhất
 *
 * Tái sử dụng StatCard từ shared/components/ui (đã có sẵn tone primary/accent/info/success/warning/neutral).
 */
import {
  Bell,
  CalendarClock,
  CalendarDays,
  Clock,
  FileText,
  MessageSquare,
  Settings as SettingsIcon,
  Tag,
  Trash2,
  User as UserIcon,
  Users,
} from "lucide-react";
import { StatCard } from "../../../shared/components/ui";
import { TRASH_MODULE_LABELS, TRASH_MODULES } from "../constants/trash.constants";
import type { TrashModule, TrashStats as TrashStatsData } from "../types/trash.types";
import styles from "./TrashStats.module.css";

const MODULE_ICONS: Record<TrashModule, React.ReactNode> = {
  users: <UserIcon size={20} aria-hidden="true" />,
  notifications: <Bell size={20} aria-hidden="true" />,
  files: <FileText size={20} aria-hidden="true" />,
  settings: <SettingsIcon size={20} aria-hidden="true" />,
  teachers: <Users size={20} aria-hidden="true" />,
  pricingplans: <Tag size={20} aria-hidden="true" />,
  contactrequests: <MessageSquare size={20} aria-hidden="true" />,
  enrollmentschedules: <CalendarClock size={20} aria-hidden="true" />,
};

// Tone cho từng module — giữ mapping riêng để không phụ thuộc vào StatCard mặc định.
// Tuân theo semantic palette trong DESIGN.md §1 (success/error/warning/info/brand-primary/brand-accent).
const MODULE_TONE: Record<TrashModule, React.ComponentProps<typeof StatCard>["tone"]> = {
  users: "primary",
  notifications: "warning",
  files: "info",
  settings: "accent",
  teachers: "success",
  pricingplans: "primary",
  contactrequests: "info",
  enrollmentschedules: "warning",
};

export interface TrashStatsProps {
  data: TrashStatsData | null;
  loading?: boolean;
}

/**
 * TrashStats — render lưới StatCard.
 *
 * - Khi loading: hiển thị 3 KPI tổng quan + 8 StatCard module với `loading=true`
 *   (skeleton đã có sẵn).
 * - Khi data null (lỗi / chưa load): hiển thị card = 0, không skeleton (UX
 *   rõ "không có dữ liệu" hơn là loading mãi).
 *
 * Cấu trúc: 2 hàng
 *   Hàng 1: Tổng · Hôm nay · 7 ngày
 *   Hàng 2: 8 module (cuộn ngang trên mobile)
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
      {TRASH_MODULES.map((mod) => (
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
