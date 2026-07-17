/**
 * CTABanner — banner kêu gọi hành động cuối trang.
 */
import { Link } from "react-router-dom";
import styles from "./CTABanner.module.css";

interface CTABannerProps {
  headline: string;
  ctaLabel: string;
  ctaTo: string;
}

export function CTABanner({ headline, ctaLabel, ctaTo }: CTABannerProps) {
  return (
    <section className={styles.banner} aria-labelledby="cta-heading">
      <div className={styles.container}>
        <h2 id="cta-heading" className={styles.headline}>
          {headline}
        </h2>
        <Link to={ctaTo} className={styles.ctaBtn}>
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
