import { Link } from "react-router-dom";
import styles from "./AuthMinimalHeader.module.css";

/**
 * AuthMinimalHeader — header TỐI GIẢN dùng cho LoginPage + RegisterPage.
 *
 * Lý do tách riêng (KHÔNG dùng PublicHeader):
 * - Login/Register là conversion page → KHÔNG phân tâm bằng 5 menu + 2 CTA.
 * - Chỉ có Logo (click → navigate("/")) + 1 anchor về Trang chủ bằng chữ
 *   "Về trang chủ" — đảm bảo accessibility (mobile đặc biệt cần nút này
 *   khi không có PublicHeader).
 * - KHÔNG có menu, KHÔNG có nút Đăng nhập/Đăng ký (đang ở chính 2 trang đó).
 */
export function AuthMinimalHeader() {
  return (
    <header className={styles.header} role="banner">
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label="Về trang chủ — Zhong Ruan LMS">
          <img
            src="/logo/logo-full.png"
            alt="Zhong Ruan LMS"
            className={styles.logo}
          />
        </Link>

        <Link to="/" className={styles.backLink}>
          <span className={styles.backLinkRule} aria-hidden="true" />
          <span className={styles.backLinkText}>Về trang chủ</span>
        </Link>
      </div>
    </header>
  );
}
