import { SEO } from "../../shared/components/SEO";
import styles from "./placeholder.module.css";

export function TeachersPage() {
  return (
    <>
      <SEO
        title="Đội ngũ giảng viên bản ngữ — Zhong Ruan"
        description="Gặp gỡ đội ngũ giáo viên tiếng Trung bản ngữ và Việt Nam giàu kinh nghiệm, chứng chỉ sư phạm quốc tế."
      />
      <section className={styles.hero}>
        <span className={styles.badge}>Giảng viên</span>
        <h1>Đội ngũ giảng viên</h1>
        <p>Nội dung đang được xây dựng.</p>
      </section>
    </>
  );
}