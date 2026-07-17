/**
 * UspCard — card USP/Cam kết cho HomePage.
 */
import {
  ShieldCheck,
  Archive,
  Video,
  Gift,
  type LucideIcon,
} from "lucide-react";
import styles from "./UspCard.module.css";

export interface UspItem {
  icon: "shield-check" | "archive" | "video" | "gift";
  title: string;
  description: string;
}

const iconMap: Record<UspItem["icon"], LucideIcon> = {
  "shield-check": ShieldCheck,
  archive: Archive,
  video: Video,
  gift: Gift,
};

interface UspCardProps {
  item: UspItem;
}

export function UspCard({ item }: UspCardProps) {
  const Icon = iconMap[item.icon];
  return (
    <div className={styles.card}>
      <div className={styles.iconWrap}>
        <Icon size={24} strokeWidth={1.8} className={styles.icon} />
      </div>
      <h3 className={styles.title}>{item.title}</h3>
      <p className={styles.description}>{item.description}</p>
    </div>
  );
}
