/**
 * SettingsSidebar — Sidebar nhóm cấu hình bên trái.
 *
 * Props:
 *   - selected: group đang được chọn ("All" | SettingGroup | null)
 *   - onSelect: callback khi click chọn
 *   - counts: { total, byGroup: Record<SettingGroup|null, number> }
 *
 * Đếm count theo group từ data hiện tại (không phải BE).
 */

import {
  Bell,
  Folder,
  Layers,
  Lock,
  Settings as SettingsIcon,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { SettingGroup } from "../services/settingApi";
import styles from "./SettingsSidebar.module.css";

export type GroupFilter = "All" | SettingGroup | "Ungrouped";

const GROUP_META: Record<SettingGroup, { label: string; icon: LucideIcon }> = {
  General: { label: "Chung", icon: SettingsIcon },
  Security: { label: "Bảo mật", icon: Lock },
  Upload: { label: "Tải lên", icon: Upload },
  Notification: { label: "Thông báo", icon: Bell },
  System: { label: "Hệ thống", icon: Layers },
};

export interface SettingsSidebarCounts {
  total: number;
  byGroup: Record<SettingGroup, number>;
  ungrouped: number;
}

export interface SettingsSidebarProps {
  selected: GroupFilter;
  onSelect: (g: GroupFilter) => void;
  counts: SettingsSidebarCounts;
}

export function SettingsSidebar({ selected, onSelect, counts }: SettingsSidebarProps) {
  const items: Array<{
    key: GroupFilter;
    label: string;
    count: number;
    icon?: LucideIcon;
  }> = [
    { key: "All", label: "Tất cả", count: counts.total, icon: Folder },
    { key: "General", label: GROUP_META.General.label, count: counts.byGroup.General, icon: GROUP_META.General.icon },
    { key: "Security", label: GROUP_META.Security.label, count: counts.byGroup.Security, icon: GROUP_META.Security.icon },
    { key: "Upload", label: GROUP_META.Upload.label, count: counts.byGroup.Upload, icon: GROUP_META.Upload.icon },
    { key: "Notification", label: GROUP_META.Notification.label, count: counts.byGroup.Notification, icon: GROUP_META.Notification.icon },
    { key: "System", label: GROUP_META.System.label, count: counts.byGroup.System, icon: GROUP_META.System.icon },
    { key: "Ungrouped", label: "Chưa phân nhóm", count: counts.ungrouped },
  ];

  return (
    <aside className={styles.sidebar} aria-label="Bộ lọc nhóm cấu hình">
      <h3 className={styles.heading}>Nhóm cấu hình</h3>
      <ul className={styles.list}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = selected === item.key;
          return (
            <li key={item.key} style={{ display: "contents" }}>
              <button
                type="button"
                className={[styles.item, active ? styles.itemActive : ""].join(" ")}
                onClick={() => onSelect(item.key)}
                aria-pressed={active}
              >
                <span className={styles.itemLabel}>
                  {Icon ? <Icon size={16} className={styles.itemIcon} /> : null}
                  <span>{item.label}</span>
                </span>
                <span className={styles.count}>{item.count}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.footer}>
        <div className={styles.footerStat}>
          <span>Tổng cấu hình</span>
          <span className={styles.footerStatValue}>{counts.total}</span>
        </div>
      </div>
    </aside>
  );
}