/**
 * HomePage — Zhong Ruan public homepage.
 *
 * Hallmark redesign · round 9 (bảo toàn 8 sections · editorial education).
 *
 * Ràng buộc BẮT BUỘC — tuân thủ đầy đủ:
 * 1. GIỮ NGUYÊN 8 sections: Hero → Stats → USP → Courses → Teachers →
 *    Testimonials → FAQ → CTA Banner.
 * 2. GIỮ NGUYÊN homeContent.ts — dùng trực tiếp, không viết lại data.
 * 3. Brand anchor: --brand-primary (#C8102E) và --brand-accent (#D4AF37)
 *    từ DESIGN.md là màu chủ đạo, không đổi.
 * 4. GIỮ NGUYÊN <SEO> và heading hierarchy (1 <h1>).
 * 5. GIỮ NGUYÊN logic React — useReveal, useCountUp, ImagePlaceholder.
 * 6. Responsive + prerender tương thích.
 *
 * Design brief:
 * Tone: nghiêm túc, chuyên nghiệp, đáng tin cậy — chuẩn giáo dục/
 * học thuật, KHÔNG playful, KHÔNG công nghiệp SaaS. Tin cậy + ấm áp.
 * Palette: đỏ (#C8102E) + vàng gold (#D4AF37) anchor, nền sáng,
 * dark charcoal text. Editorial typography.
 *
 * 8 sections — aesthetic bên trong mỗi section:
 *  1. Hero       — N6 masthead + asymmetric 5fr/4fr grid: headline left,
 *                    2-CTA stack right. Brand-red accent on CTA.
 *  2. Stats      — 4-col definition list: big serif numerals + small caps
 *                    labels. Different rhythm from hero.
 *  3. USP        — 2×2 asymmetric grid: large gold ordinals + serif titles
 *                    + body. No equal-padding cards.
 *  4. Courses    — 3-col asymmetric: card 1 wider (5fr), cards 2+3 equal
 *                    (3fr each). Left-aligned. No shadow cards.
 *  5. Teachers   — 4-col horizontal: narrow portrait + name stacked.
 *                    Alternating top-align. Left-aligned.
 *  6. Testimonials — 3-row stacked, alternating indent. Large opening quote.
 *  7. FAQ        — Accordion, full-width, generous padding, editorial.
 *  8. CTA Banner — Full-width dark charcoal, single centered h2 + inline
 *                    form below. Red submit.
 *
 * Files: HomePage.tsx + HomePage.module.css. Nothing else.
 */

import { useEffect, useRef, useState } from "react";
import { SEO } from "../../shared/components/SEO";
import { ImagePlaceholder } from "../../features/public/components/ImagePlaceholder";
import { BannerCarousel } from "../../features/public/components/BannerCarousel";
import {
  heroContent,
  statsContent,
  uspContent,
  featuredCoursesContent,
  teachersContent,
  testimonialsContent,
  faqContent,
  ctaBannerContent,
} from "../../features/public/data/homeContent";
import styles from "./HomePage.module.css";

// ============================================================================
// REVEAL — single opacity fade on load.
// ============================================================================

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.02 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, className: shown ? styles.revealed : styles.hidden };
}

// ============================================================================
// COUNT-UP — animated number on scroll-into-view.
// ============================================================================

function useCountUp(target: number, duration = 1600) {
  const ref = useRef<HTMLElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          setVal(Math.round(t * target));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);
  return { ref, val };
}

// ============================================================================
// SECTION 1 — HERO
// Asymmetric: headline 5fr + 2-CTA stack 4fr. Bold serif headline,
// small-caps eyebrow above, brand-red primary CTA, gold secondary.
// ============================================================================

function Hero() {
  const reveal = useReveal<HTMLElement>();

  return (
    <section
      className={`${styles.hero} ${reveal.className}`}
      ref={reveal.ref}
      aria-labelledby="hero-heading"
    >
      <div className={styles.heroInner}>
        {/* Left column: eyebrow + headline + subline */}
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowDot} aria-hidden="true" />
            {heroContent.badge}
          </p>
          <h1 id="hero-heading" className={styles.heroHeadline}>
            {heroContent.headline}
          </h1>
          <p className={styles.heroSubline}>{heroContent.subheadline}</p>
        </div>

        {/* Right column: CTA stack */}
        <div className={styles.heroActions}>
          <a
            href={heroContent.ctaPrimary.to}
            className={styles.heroCtaPrimary}
          >
            {heroContent.ctaPrimary.label}
          </a>
          <a
            href={heroContent.ctaSecondary.to}
            className={styles.heroCtaSecondary}
          >
            {heroContent.ctaSecondary.label}
          </a>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 2 — STATS COUNTER
// 4-col definition list: serif numeral + small-caps label.
// Alternating: even rows left-aligned, odd rows right-aligned for rhythm.
// ============================================================================

function StatsSection() {
  const reveal = useReveal<HTMLElement>();

  return (
    <section
      className={`${styles.stats} ${reveal.className}`}
      ref={reveal.ref}
      aria-label="Thống kê"
    >
      <div className={styles.statsInner}>
        <dl className={styles.statsGrid}>
          {statsContent.map((stat, i) => (
            <StatItem key={i} stat={stat} index={i} />
          ))}
        </dl>
      </div>
    </section>
  );
}

function StatItem({ stat, index }: { stat: (typeof statsContent)[0]; index: number }) {
  const { ref, val } = useCountUp(stat.value);
  return (
    <div className={styles.statItem} data-even={index % 2 === 0}>
      <dt className={styles.statLabel}>{stat.label}</dt>
      <dd ref={ref as React.RefObject<HTMLElement>} className={styles.statValue}>
        {val.toLocaleString("vi-VN")}
        {stat.suffix}
      </dd>
    </div>
  );
}

// ============================================================================
// SECTION 3 — USP / CAM KẾT
// 2×2 asymmetric grid with large gold ordinal numbers.
// NOT equal-padding 4-card row. Each cell has: ordinal + serif title +
// body description. Left-aligned. No border-radius cards.
// ============================================================================

function UspSection() {
  const reveal = useReveal<HTMLElement>();

  return (
    <section
      className={`${styles.usp} ${reveal.className}`}
      ref={reveal.ref}
      aria-labelledby="usp-heading"
    >
      <div className={styles.uspInner}>
        <h2 id="usp-heading" className={styles.uspTitle}>
          Cam kết của chúng tôi
        </h2>
        <ul className={styles.uspGrid}>
          {uspContent.map((item, i) => (
            <li key={i} className={styles.uspItem}>
              <span className={styles.uspOrdinal} aria-hidden="true">
                0{i + 1}
              </span>
              <h3 className={styles.uspItemTitle}>{item.title}</h3>
              <p className={styles.uspItemDesc}>{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 4 — KHÓA HỌC NỔI BẬT
// 3-col asymmetric grid: card 1 wider (5fr), cards 2+3 equal (3fr each).
// Left-aligned labels. Price in brand-red. No shadow-cards.
// ============================================================================

function CoursesSection() {
  const reveal = useReveal<HTMLElement>();

  return (
    <section
      className={`${styles.courses} ${reveal.className}`}
      ref={reveal.ref}
      aria-labelledby="courses-heading"
    >
      <div className={styles.coursesInner}>
        <header className={styles.coursesHead}>
          <span className={styles.sectionLabel}>
            <span className={styles.sectionLabelDash} aria-hidden="true">—</span>
            Chương trình học
          </span>
          <h2 id="courses-heading" className={styles.coursesTitle}>
            Khóa học nổi bật
          </h2>
          <p className={styles.coursesSub}>
            Mỗi khóa được thiết kế cho một nhóm học viên cụ thể.
            Chọn đúng cấp độ để bắt đầu.
          </p>
        </header>

        <ul className={styles.coursesGrid}>
          {featuredCoursesContent.map((course, i) => (
            <li key={course.id} className={styles.courseCard} data-featured={i === 0}>
              <div className={styles.courseCardBadge}>
                {i === 0 && (
                  <span className={styles.courseBadge}>Phổ biến nhất</span>
                )}
                <span className={styles.courseLevel}>{course.level}</span>
              </div>
              <h3 className={styles.courseName}>{course.name}</h3>
              <p className={styles.courseDesc}>{course.description}</p>
              <div className={styles.courseMeta}>
                <span className={styles.coursePrice}>
                  {course.price}
                  <span className={styles.coursePriceUnit}>/buổi</span>
                </span>
                <span className={styles.courseDuration}>{course.lessons} buổi</span>
              </div>
              <a href={`/khoa-hoc/${course.slug}`} className={styles.courseLink}>
                Xem chi tiết
                <span className={styles.courseLinkArrow} aria-hidden="true">→</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 5 — ĐỘI NGŨ GIẢNG VIÊN
// 4-column horizontal grid: narrow portrait + name/title stacked.
// Alternating border treatment per card. Left-aligned. No equal-height cards.
// ============================================================================

function TeachersSection() {
  const reveal = useReveal<HTMLElement>();

  return (
    <section
      className={`${styles.teachers} ${reveal.className}`}
      ref={reveal.ref}
      aria-labelledby="teachers-heading"
    >
      <div className={styles.teachersInner}>
        <header className={styles.teachersHead}>
          <span className={styles.sectionLabel}>
            <span className={styles.sectionLabelDash} aria-hidden="true">—</span>
            Đội ngũ
          </span>
          <h2 id="teachers-heading" className={styles.teachersTitle}>
            Giảng viên Thạc sĩ, Tiến sĩ
          </h2>
        </header>

        <ul className={styles.teachersGrid}>
          {teachersContent.map((t, i) => (
            <li key={i} className={styles.teacherCard}>
              <div className={styles.teacherImageWrap}>
                <ImagePlaceholder
                  label={t.name}
                  aspectRatio="3/4"
                  className={styles.teacherImage}
                />
                {t.isVerified && (
                  <span className={styles.teacherVerified} aria-label="Đã xác minh">
                    ✓
                  </span>
                )}
              </div>
              <div className={styles.teacherInfo}>
                <h3 className={styles.teacherName}>{t.name}</h3>
                <p className={styles.teacherTitle}>{t.title}</p>
                <p className={styles.teacherExp}>{t.experience}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className={styles.teachersFoot}>
          <a href="/giang-vien" className={styles.teachersFootLink}>
            Toàn bộ đội ngũ giảng viên →
          </a>
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 6 — TESTIMONIALS
// 3 stacked rows, alternating left/right indent.
// Large opening-quote mark in brand-red, italic attribution, body text.
// ============================================================================

function TestimonialsSection() {
  const reveal = useReveal<HTMLElement>();

  return (
    <section
      className={`${styles.testimonials} ${reveal.className}`}
      ref={reveal.ref}
      aria-labelledby="testimonials-heading"
    >
      <div className={styles.testimonialsInner}>
        <header className={styles.testimonialsHead}>
          <span className={styles.sectionLabel}>
            <span className={styles.sectionLabelDash} aria-hidden="true">—</span>
            Học viên
          </span>
          <h2 id="testimonials-heading" className={styles.testimonialsTitle}>
            Đánh giá từ học viên
          </h2>
        </header>

        <ul className={styles.testimonialsList}>
          {testimonialsContent.map((t, i) => (
            <li
              key={t.id}
              className={styles.testimonialItem}
              data-even={i % 2 === 0}
            >
              <span className={styles.testimonialQuote} aria-hidden="true">
                &ldquo;
              </span>
              <blockquote className={styles.testimonialBody}>
                <p className={styles.testimonialText}>{t.content}</p>
                <footer className={styles.testimonialMeta}>
                  <span className={styles.testimonialName}>{t.name}</span>
                  <span className={styles.testimonialLevel}>{t.level}</span>
                </footer>
              </blockquote>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 7 — FAQ
// Full-width accordion. Each item: question (toggle button) + answer panel.
// No card chrome, no border-radius, generous padding. Left-aligned.
// ============================================================================

function FaqSection() {
  const reveal = useReveal<HTMLElement>();
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <section
      className={`${styles.faq} ${reveal.className}`}
      ref={reveal.ref}
      aria-labelledby="faq-heading"
    >
      <div className={styles.faqInner}>
        <header className={styles.faqHead}>
          <span className={styles.sectionLabel}>
            <span className={styles.sectionLabelDash} aria-hidden="true">—</span>
            Giải đáp
          </span>
          <h2 id="faq-heading" className={styles.faqTitle}>
            Câu hỏi thường gặp
          </h2>
        </header>

        <ol className={styles.faqList}>
          {faqContent.map((item) => {
            const isOpen = openId === item.id;
            return (
              <li key={item.id} className={styles.faqItem}>
                <button
                  className={styles.faqQuestion}
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${item.id}`}
                >
                  <span className={styles.faqQuestionText}>{item.question}</span>
                  <span
                    className={`${styles.faqIcon} ${isOpen ? styles.faqIconOpen : ""}`}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
                <div
                  id={`faq-answer-${item.id}`}
                  className={`${styles.faqAnswer} ${isOpen ? styles.faqAnswerOpen : ""}`}
                  role="region"
                >
                  <p className={styles.faqAnswerText}>{item.answer}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ============================================================================
// SECTION 8 — CTA BANNER
// Full-width dark charcoal, single h2 centered + inline form below.
// Brand-red submit. No chunky card, no glassmorphism.
// ============================================================================

function CtaBanner() {
  const reveal = useReveal<HTMLElement>();
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitted(true);
  };

  return (
    <section
      className={`${styles.cta} ${reveal.className}`}
      ref={reveal.ref}
      aria-labelledby="cta-heading"
    >
      <div className={styles.ctaInner}>
        <h2 id="cta-heading" className={styles.ctaTitle}>
          {ctaBannerContent.headline}
        </h2>

        {submitted ? (
          <p className={styles.ctaSuccess}>
            Cảm ơn bạn — chúng tôi sẽ liên hệ trong 24 giờ.
          </p>
        ) : (
          <form className={styles.ctaForm} onSubmit={handleSubmit} noValidate>
            <div className={styles.ctaField}>
              <label htmlFor="cta-name" className={styles.ctaLabel}>
                Tên của bạn
              </label>
              <input
                id="cta-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.ctaInput}
                placeholder="Ví dụ: Minh"
                autoComplete="name"
                required
              />
            </div>
            <button type="submit" className={styles.ctaSubmit}>
              {ctaBannerContent.ctaLabel}
            </button>
          </form>
        )}

        <p className={styles.ctaNote}>
          Học thử miễn phí · Không ràng buộc · Giảng viên gọi lại trong 24 giờ
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// HOME PAGE — 8 sections, in order, untouched.
// ============================================================================

export function HomePage() {
  return (
    <>
      <SEO
        title="Zhong Ruan — Trung tâm tiếng Trung trực tuyến"
        description="Đào tạo tiếng Trung HSK online, giảng viên Thạc sĩ/Tiến sĩ, học thử miễn phí. Lộ trình cá nhân hoá từ HSK 1 đến HSK 6."
      />

      <BannerCarousel />
      <Hero />
      <StatsSection />
      <UspSection />
      <CoursesSection />
      <TeachersSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaBanner />
    </>
  );
}
