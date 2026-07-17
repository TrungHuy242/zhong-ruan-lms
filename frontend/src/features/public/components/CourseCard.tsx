/**
 * CourseCard — card khóa học nổi bật cho HomePage.
 */
import { Link } from "react-router-dom";
import { BookOpen, Clock } from "lucide-react";
import type { CourseItem } from "../data/homeContent";
import styles from "./CourseCard.module.css";

interface CourseCardProps {
  course: CourseItem;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.levelBadge}>{course.level}</div>
      <h3 className={styles.name}>{course.name}</h3>
      <p className={styles.description}>{course.description}</p>
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
        <Link to={course.to} className={styles.btn}>
          Xem chi tiết
        </Link>
      </div>
    </div>
  );
}
