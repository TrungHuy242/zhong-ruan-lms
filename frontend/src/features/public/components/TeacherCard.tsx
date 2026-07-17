/**
 * TeacherCard — card giảng viên cho HomePage.
 */
import { BadgeCheck } from "lucide-react";
import { ImagePlaceholder } from "./ImagePlaceholder";
import type { TeacherItem } from "../data/homeContent";
import styles from "./TeacherCard.module.css";

interface TeacherCardProps {
  teacher: TeacherItem;
}

export function TeacherCard({ teacher }: TeacherCardProps) {
  return (
    <div className={styles.card}>
      <ImagePlaceholder
        label="giảng viên"
        aspectRatio="1/1"
        className={styles.avatar}
      />
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <h3 className={styles.name}>{teacher.name}</h3>
          {teacher.isVerified && (
            <BadgeCheck
              size={18}
              strokeWidth={2}
              className={styles.verifiedIcon}
              aria-label="Đã xác minh"
            />
          )}
        </div>
        <p className={styles.title}>{teacher.title}</p>
        <p className={styles.experience}>{teacher.experience}</p>
      </div>
    </div>
  );
}
