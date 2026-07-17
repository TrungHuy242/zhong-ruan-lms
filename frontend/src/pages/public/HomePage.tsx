import { SEO } from "../../shared/components/SEO";
import styles from "./placeholder.module.css";

export function HomePage() {
  return (
    <>
      <SEO
        title="Zhong Ruan — Học tiếng Trung trực tuyến, lộ trình HSK chuẩn"
        description="Đào tạo tiếng Trung HSK online, giáo viên bản ngữ, học thử miễn phí. Lộ trình cá nhân hoá từ HSK 1 đến HSK 6."
      />
      <section className={styles.hero}>
        <span className={styles.badge}>Trang chủ</span>
        <h1>Zhong Ruan — Tiếng Trung Online</h1>
        <p>Nội dung đang được xây dựng.</p>
      </section>
    </>
  );
}