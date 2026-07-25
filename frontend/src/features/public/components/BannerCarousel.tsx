/**
 * BannerCarousel — hiển thị banners trên Homepage.
 *
 * Logic:
 * - Gọi GET /api/public/banners (BE đã filter: published, not deleted, in date range)
 * - ≥2 banners → carousel với auto-play 5s, prev/next, dot indicators, pause on hover
 * - 1 banner → hiển thị tĩnh, không controls
 * - 0 banners → ẩn hoàn toàn (return null), không khoảng trắng
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getPublicBanners } from "../services/publicBannerApi";
import type { Banner } from "../../banners/types/banner.types";
import styles from "./BannerCarousel.module.css";

const AUTOPLAY_MS = 5000;

export function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getPublicBanners()
      .then((data) => {
        setBanners(data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrent(((index % banners.length) + banners.length) % banners.length);
  }, [banners.length]);

  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-play
  useEffect(() => {
    if (banners.length < 2 || paused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    timerRef.current = setTimeout(goNext, AUTOPLAY_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, paused, banners.length, goNext]);

  if (loading) return null;
  if (banners.length === 0) return null;

  return (
    <div
      className={styles.root}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-label="Banner carousel"
    >
      <div className={styles.track}>
        <div
          className={styles.slidePanel}
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((b, i) => (
            <div
              key={b.id}
              className={styles.slidePanelInner}
              aria-hidden={i !== current}
              role="tabpanel"
              aria-label={`Banner ${i + 1} của ${banners.length}`}
            >
              <div className={styles.slide}>
                <img
                  src={b.imageUrl}
                  alt={b.title}
                  className={styles.slideBg}
                  loading="lazy"
                />
                <div className={styles.slideOverlay} />
                <div className={styles.slideContent}>
                  {b.badgeText && (
                    <span className={styles.badge}>{b.badgeText}</span>
                  )}
                  <h2 className={styles.slideTitle}>{b.title}</h2>
                  {b.subtitle && (
                    <p className={styles.slideSubtitle}>{b.subtitle}</p>
                  )}
                  {b.ctaText && b.ctaLink && (
                    <a href={b.ctaLink} className={styles.slideCta}>
                      {b.ctaText}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows — only show when ≥2 banners */}
      {banners.length >= 2 && (
        <>
          <button
            className={`${styles.nav} ${styles.navPrev}`}
            onClick={goPrev}
            aria-label="Banner trước"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className={`${styles.nav} ${styles.navNext}`}
            onClick={goNext}
            aria-label="Banner tiếp"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>

          <div className={styles.dots} role="tablist" aria-label="Điều hướng banner">
            {banners.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === current}
                aria-label={`Banner ${i + 1}`}
                className={`${styles.dot} ${i === current ? styles.active : ""}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
