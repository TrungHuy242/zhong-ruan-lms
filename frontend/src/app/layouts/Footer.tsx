import styles from "./Footer.module.css";

/**
 * Footer tối giản cho Admin shell — 1 dòng, gọn, không phân tâm.
 * Trái: copyright · Phải: trạng thái hệ thống + version (info vận hành, không spam).
 */
export function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.copy}>
        © 2026 Zhong Ruan LMS — Trung tâm Trung Quốc học
      </span>
      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <span className={styles.metaDot} aria-hidden="true" />
          Hệ thống hoạt động bình thường
        </span>
        <span className={styles.metaItem}>v1.0.0</span>
      </div>
    </footer>
  );
}
