import { SEO } from "../../shared/components/SEO";
import styles from "./placeholder.module.css";

export function CoursesPage() {
  return (
    <>
      <SEO
        title="Khóa học tiếng Trung — HSK 1 đến HSK 6 | Zhong Ruan"
        description="Khám phá các khóa học tiếng Trung HSK từ cơ bản đến nâng cao, kèm lộ trình luyện thi chứng chỉ quốc tế."
      />
      <section className={styles.hero}>
        <span className={styles.badge}>Khóa học</span>
        <h1>Khóa học tiếng Trung HSK</h1>
        <p>Nội dung đang được xây dựng.</p>
      </section>
    </>
  );
}