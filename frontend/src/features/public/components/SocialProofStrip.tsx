/**
 * SocialProofStrip — khối "Theo dõi Zhong Ruan trên mạng xã hội".
 *
 * Hallmark stamp:
 *   macrostructure: editorial-emphasis · genre: editorial · theme: design-system-locked §9
 *   tone: editorial-restraint · anchor hue: brand-red #C8102E
 *   shape: 0 radius · hairline 1px border · NO shadow · image thumbnail ≤320px
 *   font: Source Serif 4 (H2 heading) + Be Vietnam Pro (body/sub)
 *   diversification: section mới nằm giữa FAQ (paper) và CTA (paper-dark) —
 *                    bg surface trắng tạo nhịp 2-tone nhẹ trước khi đổi sang dark CTA.
 *   restraint: chỉ 2 ảnh thumbnail, hover overlay mỏng — KHÔNG carousel,
 *              KHÔNG chiếm viewport lớn.
 *
 * Behavior:
 *   - 2 ảnh từ /temp-assets/ (biaa.png, bia-web-1.png) hiển thị cạnh nhau
 *     (desktop), xếp dọc (mobile). Mỗi ảnh wrap trong <a href="..." target="_blank">.
 *   - Hover: overlay nền tối mờ + icon Facebook trắng centered.
 *   - Click: mở link Facebook (lấy từ PublicFooter — cùng domain).
 *
 * Audit checklist (DESIGN.md §9.2 + responsive.md):
 *   - 0 border-radius khác 0 ✓
 *   - 0 box-shadow ✓
 *   - 0 italic trên heading ✓
 *   - 0 transform scale/translateY trên hover ✓ (chỉ opacity overlay)
 *   - image-bearing grid dùng minmax(0, 1fr) ✓
 *   - heading có overflow-wrap: anywhere + min-width: 0 ✓
 */

import styles from "./SocialProofStrip.module.css";

const FACEBOOK_URL = "https://facebook.com"; // đồng bộ với PublicFooter

interface ThumbItem {
  src: string;
  alt: string;
  href: string;
}

const THUMBS: ThumbItem[] = [
  {
    src: "/temp-assets/bia-web-1.png",
    alt: "Bìa chương trình HSK trên Facebook Zhong Ruan",
    href: FACEBOOK_URL,
  },
  {
    src: "/temp-assets/biaa.png",
    alt: "Bìa ưu đãi học phí trên Facebook Zhong Ruan",
    href: FACEBOOK_URL,
  },
];

export function SocialProofStrip() {
  return (
    <section
      className={styles.strip}
      aria-labelledby="social-proof-heading"
    >
      <div className={styles.inner}>
        <header className={styles.head}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDash} aria-hidden="true">—</span>
            Mạng xã hội
          </span>
          <h2 id="social-proof-heading" className={styles.title}>
            Theo dõi Zhong Ruan trên mạng xã hội
          </h2>
          <p className={styles.sub}>
            Cập nhật ưu đãi và hoạt động mới nhất.
          </p>
        </header>

        <ul className={styles.thumbs}>
          {THUMBS.map((thumb) => (
            <li key={thumb.src} className={styles.thumbItem}>
              <a
                href={thumb.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.thumbLink}
                aria-label={`Mở ${thumb.alt} trong tab mới`}
              >
                <img
                  src={thumb.src}
                  alt={thumb.alt}
                  className={styles.thumbImg}
                  loading="lazy"
                />
                <span className={styles.overlay} aria-hidden="true">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={styles.overlayIcon}
                  >
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                  </svg>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}