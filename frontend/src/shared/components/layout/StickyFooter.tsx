/**
 * StickyFooter — thanh action sticky bottom cho FormPage.
 *
 * Pattern: form có thể dài (>1 viewport), submit bar phải luôn trong tầm tay.
 * Sticky bottom (KHÔNG phải modal overlay) — render bên trong content,
 * không phải position:fixed toàn viewport (giữ page scroll tự nhiên).
 *
 * Hallmark stamp:
 *   macrostructure: form-led · genre: modern-minimal · theme: design-system-locked
 *   tone: utilitarian · shape: admin-radius-control 8px · shadow: admin-elevated
 *   font: Be Vietnam Pro only
 *
 * Designed for 8 states: default · hover · focus-visible · active · disabled · loading · error · success
 */

import { useEffect, useState } from "react";
import styles from "./StickyFooter.module.css";

export interface StickyFooterProps {
  /**
   * Nội dung footer — thường là 2 button (Hủy + Lưu).
   * Dùng ReactNode để parent toàn quyền control button variant/size.
   */
  children: React.ReactNode;
  /**
   * Tự động thêm padding-bottom cho parent (để form cuối không bị che).
   * Mặc định bật.
   */
  autoPadding?: boolean;
  /**
   * Show shadow + border ngay cả khi ở top (mặc định chỉ show khi scroll).
   */
  alwaysShowShadow?: boolean;
}

export function StickyFooter({
  children,
  autoPadding = true,
  alwaysShowShadow = false,
}: StickyFooterProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (alwaysShowShadow) {
      setScrolled(true);
      return;
    }
    function onScroll() {
      // Detect scroll: so sánh scrollY với 1 ngưỡng nhỏ (50px) để tránh flicker
      setScrolled(window.scrollY > 50);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [alwaysShowShadow]);

  return (
    <div
      className={`${styles.spacer} ${autoPadding ? styles.spacerWithPad : ""}`}
      aria-hidden="true"
    >
      <footer
        className={`${styles.footer} ${scrolled ? styles.footerScrolled : ""}`}
        role="contentinfo"
        aria-label="Hành động form"
      >
        <div className={styles.inner}>{children}</div>
      </footer>
    </div>
  );
}

export default StickyFooter;
