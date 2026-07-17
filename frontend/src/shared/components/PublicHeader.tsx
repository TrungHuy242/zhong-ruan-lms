/**
 * PublicHeader — header sticky cho 5 trang marketing.
 *
 * - Desktop: logo + 5 NavLink (Trang chủ / Khóa học / Giảng viên / Bảng giá / Liên hệ) + CTA "Đăng ký học thử miễn phí".
 * - Mobile (≤768px): ẩn menu ngang + CTA, hiện hamburger → drawer trượt từ trên xuống full-width.
 *
 * Shadow xuất hiện khi scrollY > 8 để tạo điểm nhấn nhẹ khi user cuộn.
 */
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import styles from "./PublicHeader.module.css";

interface NavItem {
  label: string;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Trang chủ", to: "/" },
  { label: "Khóa học", to: "/khoa-hoc" },
  { label: "Giảng viên", to: "/giang-vien" },
  { label: "Bảng giá", to: "/bang-gia" },
  { label: "Liên hệ", to: "/lien-he" },
];

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Đổi shadow khi cuộn qua 8px.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Khóa scroll nền khi drawer mở + ESC để đóng.
  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  return (
    <header
      className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}
    >
      <div className={styles.container}>
        <Link to="/" className={styles.logo} onClick={() => setMobileOpen(false)}>
          <img src="/logo/logo-full.png" alt="Zhong Ruan — Tiếng Trung Online" />
        </Link>

        {/* Desktop nav */}
        <nav className={styles.desktopNav} aria-label="Điều hướng chính">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link to="/login" className={styles.loginLink}>
            Đăng nhập
          </Link>
          <Link to="/register" className={styles.ctaButton}>
            Đăng ký học thử miễn phí
          </Link>
        </div>

        {/* Hamburger - chỉ hiện mobile */}
        <button
          type="button"
          className={styles.hamburger}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile drawer — slide từ trên xuống, full-width */}
      <div
        className={`${styles.drawer} ${mobileOpen ? styles.drawerOpen : ""}`}
        aria-hidden={!mobileOpen}
      >
        <nav className={styles.drawerNav} aria-label="Điều hướng di động">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link
            to="/login"
            className={styles.drawerLink}
            onClick={() => setMobileOpen(false)}
          >
            Đăng nhập
          </Link>
          <Link
            to="/register"
            className={styles.drawerCta}
            onClick={() => setMobileOpen(false)}
          >
            Đăng ký học thử miễn phí
          </Link>
        </nav>
      </div>

      {/* Backdrop mờ phía sau drawer khi mở */}
      <div
        className={`${styles.backdrop} ${mobileOpen ? styles.backdropVisible : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
    </header>
  );
}