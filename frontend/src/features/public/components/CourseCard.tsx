/**
 * CourseCard — card khóa học dùng chung cho HomePage và CoursesListPage.
 *
 * Hai variant:
 *   - "compact"  : dùng ở HomePage (mặc định). Hiển thị badge level + mô tả ngắn
 *                  + meta + giá + nút dẫn về /khoa-hoc (list).
 *   - "detailed" : dùng ở CoursesListPage. Thêm audienceLine ngắn + đổi CTA
 *                  thành "Xem lộ trình chi tiết" → /khoa-hoc/:slug.
 *
 * CourseCard backward compatible: không truyền variant thì mặc định "compact"
 * (giống cách HomePage dùng trước đó — không phải sửa HomePage).
 */
import { Link } from "react-router-dom";
import { BookOpen, Clock, ArrowRight } from "lucide-react";
import type { CourseSummary } from "../data/coursesContent";
import styles from "./CourseCard.module.css";

export interface CourseCardProps {
  course: CourseSummary;
  /** "compact" (mặc định) cho HomePage, "detailed" cho CoursesListPage */
  variant?: "compact" | "detailed";
  /** Dòng audience ngắn, chỉ hiển thị ở variant "detailed" */
  audienceLine?: string;
}

export function CourseCard({
  course,
  variant = "compact",
  audienceLine,
}: CourseCardProps) {
  const detailTo = `/khoa-hoc/${course.slug}`;
  const ctaLabel = variant === "detailed" ? "Xem lộ trình chi tiết" : "Xem chi tiết";

  return (
    <div className={`${styles.card} ${variant === "detailed" ? styles.cardDetailed : ""}`}>
      <div className={styles.levelBadge}>{course.level}</div>
      <h3 className={styles.name}>{course.name}</h3>
      <p className={styles.description}>{course.description}</p>
      {variant === "detailed" && audienceLine && (
        <p className={styles.audienceLine}>
          <strong>Phù hợp:</strong> {audienceLine}
        </p>
      )}
      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <BookOpen size={15} strokeWidth={1.8} aria-hidden="true" />
          {course.lessons} buổi
        </span>
        <span className={styles.metaItem}>
          <Clock size={15} strokeWidth={1.8} aria-hidden="true" />
          90 phút/buổi
        </span>
      </div>
      <div className={styles.footer}>
        <span className={styles.price}>{course.price}</span>
        <Link to={detailTo} className={styles.btn}>
          {ctaLabel}
          <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}