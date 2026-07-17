import { SEO } from "../../shared/components/SEO";
import styles from "./placeholder.module.css";

export function ContactPage() {
  return (
    <>
      <SEO
        title="Liên hệ tư vấn khóa học — Zhong Ruan"
        description="Liên hệ Zhong Ruan để được tư vấn lộ trình học tiếng Trung phù hợp. Hỗ trợ qua Zalo, hotline, email."
      />
      <section className={styles.hero}>
        <span className={styles.badge}>Liên hệ</span>
        <h1>Liên hệ tư vấn</h1>
        <p>Nội dung đang được xây dựng.</p>
      </section>
    </>
  );
}