/**
 * HomePage — Zhong Ruan public homepage.
 *
 * Hallmark redesign · round 9 (bảo toàn sections gốc · editorial education).
 *
 * Ràng buộc BẮT BUỘC — tuân thủ đầy đủ:
 * 1. Sections theo thứ tự: Hero → Stats → USP → EnrollmentSchedule → Courses
 *    → Teachers → Testimonials → FAQ → SocialProof → CTA Banner.
 * 2. Testimonials fetch động từ GET /api/public/testimonials?limit=3.
 *    Ẩn hoàn toàn section nếu BE trả rỗng (Admin ẩn hết).
 * 3. GIỮ NGUYÊN phần còn lại của homeContent.ts — testimonial placeholder đã
 *    xóa (round 10).
 * 4. Brand anchor: --brand-primary (#C8102E) và --brand-accent (#D4AF37)
 *    từ DESIGN.md là màu chủ đạo, không đổi.
 * 5. GIỮ NGUYÊN <SEO> và heading hierarchy (1 <h1>).
 * 6. GIỮ NGUYÊN logic React — useReveal, useCountUp, ImagePlaceholder.
 * 7. Responsive + prerender tương thích.
 *
 * Design brief:
 * Tone: nghiêm túc, chuyên nghiệp, đáng tin cậy — chuẩn giáo dục/
 * học thuật, KHÔNG playful, KHÔNG công nghiệp SaaS. Tin cậy + ấm áp.
 * Palette: đỏ (#C8102E) + vàng gold (#D4AF37) anchor, nền sáng,
 * dark charcoal text. Editorial typography.
 *
 * 10 sections — aesthetic bên trong mỗi section:
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
 *                    DATA FETCH ĐỘNG từ API. Loading/empty/error states.
 *  7. FAQ        — Accordion, full-width, generous padding, editorial.
 *  8. SocialProof — 2 thumbnail nhỏ, hairline border, hover overlay.
 *                    Điểm nhấn phụ — không kéo dài trang.
 *  9. CTA Banner — Full-width dark charcoal, single centered h2 + inline
 *                    form below. Red submit.
 *  10. Enrollment Schedule (singleton) — Banner lịch khai giảng render
 *                    giữa USP và Courses; tự ẩn nếu BE trả null (không
 *                    để khoảng trắng).
 *
 * Files: HomePage.tsx + HomePage.module.css. Nothing else.
 */

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { SEO } from "../../shared/components/SEO";
import { ImagePlaceholder } from "../../features/public/components/ImagePlaceholder";
import { EnrollmentScheduleBanner } from "../../features/public/components/EnrollmentScheduleBanner";
import { SocialProofStrip } from "../../features/public/components/SocialProofStrip";
import { getPublicTestimonials } from "../../features/public/services/publicTestimonialApi";
import type { Testimonial } from "../../features/testimonials/types/testimonial.types";
import {
  heroContent,
  statsContent,
  uspContent,
  featuredCoursesContent,
  teachersContent,
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

        {/* Right column: CTA stack + ảnh minh hoạ tạm */}
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
// SECTION 6 — TESTIMONIALS (dynamic fetch từ BE)
// 3 stacked rows, alternating left/right indent.
// Large opening-quote mark in brand-red, italic attribution, body text.
//
// Fetch: GET /api/public/testimonials?limit=3
//   - Loading: 3 skeleton rows trong cùng layout.
//   - Empty (Admin ẩn hết): return null — section biến mất hoàn toàn.
//   - Error: inline alert nhỏ + nút "Thử lại" — vẫn render layout card.
// ============================================================================

const SKELETON_KEYS = ["s1", "s2", "s3"] as const;

function TestimonialsSection() {
  const reveal = useReveal<HTMLElement>();
  const [testimonials, setTestimonials] = useState<Testimonial[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    setTestimonials(null);
    getPublicTestimonials(3)
      .then((list) => {
        setTestimonials(list.slice(0, 3));
      })
      .catch((e) => {
        setError(e?.message || "Không tải được đánh giá");
        setTestimonials([]); // mark as loaded-but-empty so error block can show
      });
  };

  useEffect(() => {
    load();
  }, []);

  // Empty thật sự (BE trả []) → ẩn hoàn toàn section để không khoảng trắng xấu.
  if (testimonials && testimonials.length === 0 && !error) {
    return null;
  }
  // Lỗi nhưng không có data → vẫn ẩn section (không hiện alert lỗi trống).
  if (error && (!testimonials || testimonials.length === 0)) {
    return null;
  }

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

        {/* Loading skeleton — 3 rows placeholder */}
        {testimonials === null && !error && (
          <ul className={styles.testimonialsList} aria-busy="true" aria-label="Đang tải đánh giá">
            {SKELETON_KEYS.map((k) => (
              <li key={k} className={`${styles.testimonialItem} ${styles.testimonialSkeleton}`} aria-hidden="true">
                <span className={styles.testimonialQuote}>&ldquo;</span>
                <div className={styles.testimonialBody}>
                  <div className={styles.skeletonText} />
                  <div className={styles.skeletonTextShort} />
                  <div className={styles.skeletonMeta} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Error inline — compact, vẫn giữ layout */}
        {error && testimonials && testimonials.length > 0 && (
          <div className={styles.testimonialError} role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
            <button type="button" className={styles.testimonialRetry} onClick={load}>
              Thử lại
            </button>
          </div>
        )}

        {/* Data */}
        {testimonials && testimonials.length > 0 && (
          <ul className={styles.testimonialsList}>
            {testimonials.map((t, i) => (
              <li
                key={t.id}
                className={styles.testimonialItem}
                data-even={i % 2 === 0}
              >
                <span className={styles.testimonialQuote} aria-hidden="true">
                  &ldquo;
                </span>
                <div className={styles.testimonialBody}>
                  {/* Avatar + name + course + source row */}
                  <div className={styles.testimonialPerson}>
                    {t.avatarUrl ? (
                      <img
                        src={t.avatarUrl}
                        alt={`Ảnh đại diện của ${t.studentName}`}
                        className={styles.testimonialAvatar}
                        loading="lazy"
                      />
                    ) : (
                      <span
                        className={styles.testimonialAvatarPlaceholder}
                        aria-hidden="true"
                        title={`Ảnh đại diện ${t.studentName}`}
                      >
                        {getInitials(t.studentName)}
                      </span>
                    )}
                    <div className={styles.testimonialPersonMeta}>
                      <span className={styles.testimonialName}>{t.studentName}</span>
                      <span className={styles.testimonialMetaRow}>
                        {t.courseInfo && (
                          <>
                            <span className={styles.testimonialLevel}>{t.courseInfo}</span>
                            <span className={styles.testimonialDot} aria-hidden="true">·</span>
                          </>
                        )}
                        <span className={styles.testimonialRating} aria-label={`Đánh giá ${t.rating} trên 5 sao`}>
                          {renderStars(t.rating)}
                        </span>
                      </span>
                      {t.source && (
                        <span className={styles.testimonialSource}>{t.source}</span>
                      )}
                    </div>
                  </div>

                  {/* Quote text — italic cho testimonial body (DESIGN.md §9 carve-out) */}
                  <blockquote className={styles.testimonialQuoteBlock}>
                    <p className={styles.testimonialText}>{t.content}</p>
                  </blockquote>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// Helper: lấy chữ cái đầu của tên — fallback cho avatar khi BE trả null.
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Helper: render 5 sao (filled/empty) dựa trên rating 1-5.
function renderStars(rating: number): string {
  const safe = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(safe) + "☆".repeat(5 - safe);
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
// HOME PAGE — 9 sections, in order, untouched.
// ============================================================================

export function HomePage() {
  return (
    <>
      <SEO
        title="Zhong Ruan — Trung tâm tiếng Trung trực tuyến"
        description="Đào tạo tiếng Trung HSK online, giảng viên Thạc sĩ/Tiến sĩ, học thử miễn phí. Lộ trình cá nhân hoá từ HSK 1 đến HSK 6."
      />

      <Hero />
      <StatsSection />
      <UspSection />
      <EnrollmentScheduleBanner />
      <CoursesSection />
      <TeachersSection />
      <TestimonialsSection />
      <FaqSection />
      <SocialProofStrip />
      <CtaBanner />
    </>
  );
}
