import { SEO } from "../../shared/components/SEO";
import styles from "./placeholder.module.css";

export function PricingPage() {
  return (
    <>
      <SEO
        title="Bảng giá khóa học tiếng Trung — Zhong Ruan"
        description="Bảng học phí minh bạch cho từng khóa HSK, ưu đãi đăng ký sớm, chính sách học thử miễn phí."
      />
      <section className={styles.hero}>
        <span className={styles.badge}>Bảng giá</span>
        <h1>Bảng giá khóa học</h1>
        <p>Nội dung đang được xây dựng.</p>
      </section>
    </>
  );
}