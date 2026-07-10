import styles from "./NotificationPanel.module.css";

export type NotificationTimeGroup =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "OLDER";

export const NOTIFICATION_TIME_GROUP_LABEL: Record<NotificationTimeGroup, string> = {
  TODAY: "Hôm nay",
  YESTERDAY: "Hôm qua",
  LAST_7_DAYS: "7 ngày trước",
  OLDER: "Cũ hơn",
};

/**
 * Tính nhóm thời gian cho 1 notification dựa trên createdAt.
 * - Hôm nay      : cùng ngày dương lịch với hiện tại.
 * - Hôm qua      : cách 1 ngày dương lịch.
 * - 7 ngày trước : trong khoảng 2–7 ngày trước.
 * - Cũ hơn       : > 7 ngày.
 */
export function getNotificationTimeGroup(
  createdAt: string | Date,
  now: Date = new Date()
): NotificationTimeGroup {
  const t = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  if (Number.isNaN(t.getTime())) return "OLDER";

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // inclusive range 7 days

  if (t >= startOfToday) return "TODAY";
  if (t >= startOfYesterday) return "YESTERDAY";
  if (t >= sevenDaysAgo) return "LAST_7_DAYS";
  return "OLDER";
}

/** Thứ tự render các nhóm. */
export const NOTIFICATION_TIME_GROUP_ORDER: NotificationTimeGroup[] = [
  "TODAY",
  "YESTERDAY",
  "LAST_7_DAYS",
  "OLDER",
];

export interface NotificationGroupHeaderProps {
  group: NotificationTimeGroup;
}

/**
 * Label phân nhóm ngày — dùng như sticky header trong panel list.
 */
export function NotificationGroupHeader({ group }: NotificationGroupHeaderProps) {
  return (
    <div className={styles.groupHeader} role="presentation">
      <span className={styles.groupHeaderLabel}>
        {NOTIFICATION_TIME_GROUP_LABEL[group]}
      </span>
    </div>
  );
}