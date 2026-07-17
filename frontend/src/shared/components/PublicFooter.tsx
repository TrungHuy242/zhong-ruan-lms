/**
 * PublicFooter — footer đỏ đậm cho 5 trang marketing.
 *
 * 4 cột desktop (CSS Grid), stack dọc mobile.
 * Cột 1: logo + mô tả thương hiệu.
 * Cột 2: liên kết nhanh (NavLink).
 * Cột 3: thông tin liên hệ (MapPin/Phone/Mail icon từ lucide-react).
 * Cột 4: mạng xã hội (Facebook/Youtube từ lucide, Zalo là SVG inline custom).
 */
import { Link, NavLink } from "react-router-dom";
import { MapPin, Phone, Mail } from "lucide-react";
import styles from "./PublicFooter.module.css";

interface FooterLink {
  label: string;
  to: string;
}

const QUICK_LINKS: FooterLink[] = [
  { label: "Trang chủ", to: "/" },
  { label: "Khóa học", to: "/khoa-hoc" },
  { label: "Giảng viên", to: "/giang-vien" },
  { label: "Bảng giá", to: "/bang-gia" },
  { label: "Liên hệ", to: "/lien-he" },
];

export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Cột 1: Brand */}
          <div className={styles.brandCol}>
            <Link to="/" className={styles.logo}>
              <img src="/logo/logo-full.png" alt="Zhong Ruan" />
            </Link>
            <p className={styles.brandDesc}>
              Trung tâm tiếng Trung trực tuyến Zhong Ruan — đào tạo HSK chất
              lượng cao, lộ trình cá nhân hoá.
            </p>
          </div>

          {/* Cột 2: Liên kết nhanh */}
          <div className={styles.col}>
            <h4 className={styles.colTitle}>Liên kết nhanh</h4>
            <ul className={styles.linkList}>
              {QUICK_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === "/"}
                    className={styles.link}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 3: Liên hệ */}
          <div className={styles.col}>
            <h4 className={styles.colTitle}>Liên hệ</h4>
            <ul className={styles.contactList}>
              <li className={styles.contactItem}>
                <MapPin size={18} aria-hidden="true" />
                <span>123 Nguyễn Văn A, Q.X, TP.HCM</span>
              </li>
              <li className={styles.contactItem}>
                <Phone size={18} aria-hidden="true" />
                <a href="tel:+84000000000" className={styles.link}>
                  +84 xxx xxx xxx
                </a>
              </li>
              <li className={styles.contactItem}>
                <Mail size={18} aria-hidden="true" />
                <a href="mailto:info@zhongruan.vn" className={styles.link}>
                  info@zhongruan.vn
                </a>
              </li>
            </ul>
          </div>

          {/* Cột 4: Mạng xã hội */}
          <div className={styles.col}>
            <h4 className={styles.colTitle}>Mạng xã hội</h4>
            <div className={styles.socials}>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook Zhong Ruan"
                className={styles.socialBtn}
              >
                {/* Facebook SVG inline — lucide-react@1.23.0 chưa có icon này */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                </svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Youtube Zhong Ruan"
                className={styles.socialBtn}
              >
                {/* Youtube SVG inline — lucide-react@1.23.0 chưa có icon này */}
                <svg
                  width="22"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M23.5 6.2c-.3-1-1.1-1.8-2.1-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.4.5C1.6 4.4.8 5.2.5 6.2 0 8 0 12 0 12s0 4 .5 5.8c.3 1 1.1 1.8 2.1 2.1 1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5c1-.3 1.8-1.1 2.1-2.1.5-1.8.5-5.8.5-5.8s0-4-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
                </svg>
              </a>
              <a
                href="https://zalo.me"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Zalo Zhong Ruan"
                className={styles.socialBtn}
              >
                {/* Zalo không có icon trong lucide-react nên dùng SVG inline custom.
                    Chữ "Z" trong ô bo tròn màu thương hiệu Zalo #0068FF. */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect width="24" height="24" rx="6" fill="#0068FF" />
                  <path
                    d="M7.5 8h7.2c1.2 0 2 .8 2 1.9 0 .7-.4 1.3-1 1.5.8.3 1.3 1 1.3 1.9 0 1.2-.9 2-2.2 2H7.5V8zm2 5h5c.4 0 .7-.3.7-.7s-.3-.7-.7-.7h-5v1.4zm0-3.4v1.3h4.5c.4 0 .7-.3.7-.7s-.3-.6-.7-.6H9.5z"
                    fill="#FFFFFF"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>© 2026 Zhong Ruan. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}