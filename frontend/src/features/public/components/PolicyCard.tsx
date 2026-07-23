/**
 * PolicyCard — card hiển thị chính sách trên trang Bảng giá.
 *
 * Props:
 *   - icon: icon name
 *   - title: tiêu đề chính sách
 *   - description: mô tả ngắn
 */
import { RefreshCw, Archive, Calendar } from "lucide-react";
import type { PolicyItem } from "../data/policiesContent";
import styles from "./PolicyCard.module.css";

const ICON_MAP = {
  refresh: RefreshCw,
  archive: Archive,
  calendar: Calendar,
} as const;

interface PolicyCardProps extends Omit<PolicyItem, "icon"> {
  icon: PolicyItem["icon"];
}

export function PolicyCard({ icon, title, description }: PolicyCardProps) {
  const IconComponent = ICON_MAP[icon];

  return (
    <div className={styles.card}>
      <div className={styles.iconWrap}>
        <IconComponent size={24} strokeWidth={2} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
    </div>
  );
}
