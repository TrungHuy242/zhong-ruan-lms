/**
 * HeroSection — section đầu tiên của HomePage.
 *
 * Layout 2 cột desktop (text trái, ảnh phải), mobile xếp dọc.
 * Nền --hero-gradient với hoạ tiết trang trí nhẹ (SVG circles).
 */
import { Link } from "react-router-dom";
import { heroContent } from "../data/homeContent";
import { ImagePlaceholder } from "./ImagePlaceholder";
import styles from "./HeroSection.module.css";

export function HeroSection() {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      {/* Hoạ tiết trang trí nền */}
      <div className={styles.decorCircle1} aria-hidden="true" />
      <div className={styles.decorCircle2} aria-hidden="true" />
      <div className={styles.decorCircle3} aria-hidden="true" />

      <div className={styles.container}>
        {/* Cột text */}
        <div className={styles.textCol}>
          <span className={styles.badge}>{heroContent.badge}</span>
          <h1 id="hero-heading" className={styles.headline}>
            {heroContent.headline}
          </h1>
          <p className={styles.subheadline}>{heroContent.subheadline}</p>
          <div className={styles.actions}>
            <Link
              to={heroContent.ctaPrimary.to}
              className={styles.ctaPrimary}
            >
              {heroContent.ctaPrimary.label}
            </Link>
            <Link
              to={heroContent.ctaSecondary.to}
              className={styles.ctaSecondary}
            >
              {heroContent.ctaSecondary.label}
            </Link>
          </div>
        </div>

        {/* Cột ảnh minh hoạ */}
        <div className={styles.imageCol}>
          <ImagePlaceholder
            label="lớp học trực tuyến"
            aspectRatio="4/3"
            className={styles.heroImage}
          />
        </div>
      </div>
    </section>
  );
}
