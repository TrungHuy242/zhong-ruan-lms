/**
 * CourseDetailPage — /khoa-hoc/:slug
 *
 * Cấu trúc:
 *  - Breadcrumb
 *  - Hero riêng khóa
 *  - Lộ trình học (timeline)
 *  - Bạn sẽ đạt được gì (Check icons)
 *  - Phù hợp với ai
 *  - FAQ riêng (nếu có)
 *  - 2 khóa học khác (internal linking SEO)
 *  - CTA Banner
 *
 * SEO: mỗi slug có title + description riêng lấy từ coursesContent.ts.
 * Nếu slug không khớp → render "Không tìm thấy" + nút về /khoa-hoc.
 */
import { Link, useParams } from "react-router-dom";
import { Check, BookOpen, Clock, GraduationCap } from "lucide-react";
import { SEO } from "../../shared/components/SEO";
import { Breadcrumb } from "../../features/public/components/Breadcrumb";
import { CourseRoadmap } from "../../features/public/components/CourseRoadmap";
import { FAQAccordion } from "../../features/public/components/FAQAccordion";
import { CourseCard } from "../../features/public/components/CourseCard";
import { CTABanner } from "../../features/public/components/CTABanner";
import { ctaBannerContent } from "../../features/public/data/homeContent";
import {
  getCourseBySlug,
  getCourseSummaries,
} from "../../features/public/data/coursesContent";
import styles from "./CourseDetailPage.module.css";

export function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const course = slug ? getCourseBySlug(slug) : undefined;

  // Slug không hợp lệ
  if (!course) {
    return (
      <>
        <SEO
          title="Không tìm thấy khóa học | Zhong Ruan"
          description="Khóa học bạn đang tìm không tồn tại. Xem tất cả khóa học tiếng Trung tại Zhong Ruan."
        />
        <Breadcrumb items={[{ label: "Khóa học", to: "/khoa-hoc" }, { label: "Không tìm thấy" }]} />
        <section className={styles.notFound}>
          <div className={styles.notFoundInner}>
            <p className={styles.notFoundNumeral}>404</p>
            <h1 className={styles.notFoundTitle}>Không tìm thấy khóa học</h1>
            <p className={styles.notFoundText}>
              Khóa học bạn đang tìm không tồn tại hoặc đã bị xoá. Vui lòng xem
              danh sách các khóa học hiện có.
            </p>
            <Link to="/khoa-hoc" className={styles.notFoundBtn}>
              Xem tất cả khóa học
            </Link>
          </div>
        </section>
      </>
    );
  }

  // 2 khóa còn lại (không phải khóa đang xem) — internal linking SEO
  const allSummaries = getCourseSummaries();
  const otherCourses = allSummaries.filter((c) => c.slug !== course.slug);

  // Stage number cho narrative workflow (1.0 / 2.0 / 3.0)
  const stageNumber: Record<string, string> = {
    "hsk-1-2": "1.0",
    "hsk-3-4": "2.0",
    "hsk-5-6": "3.0",
  };
  const stageNum = stageNumber[course.slug] ?? "—";
  const stageFullLabel: Record<string, string> = {
    "hsk-1-2": "Sơ cấp — Người mới bắt đầu",
    "hsk-3-4": "Trung cấp — Học viên có nền tảng",
    "hsk-5-6": "Cao cấp — Du học & Chuyên môn",
  };
  const stageFull = stageFullLabel[course.slug] ?? course.level;

  return (
    <>
      <SEO title={course.seo.title} description={course.seo.description} />

      <Breadcrumb
        items={[
          { label: "Khóa học", to: "/khoa-hoc" },
          { label: course.name },
        ]}
      />

      {/* MASTHEAD — Ivory, không gradient đỏ. "Stage N.0" + heading */}
      <section
        className={styles.masthead}
        aria-labelledby="course-hero-heading"
      >
        <div className={styles.mastheadInner}>
          <span className={styles.stageLabel}>
            Chặng {stageNum} · {stageFull}
          </span>
          <span className={styles.levelBadge}>{course.level}</span>
          <h1 id="course-hero-heading" className={styles.heading}>
            {course.name}
          </h1>
          <p className={styles.subheading}>{course.fullDescription}</p>

          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <BookOpen size={18} aria-hidden="true" />
              <span>{course.lessons} buổi</span>
            </div>
            <div className={styles.metaItem}>
              <Clock size={18} aria-hidden="true" />
              <span>{course.durationLabel}</span>
            </div>
            <div className={styles.metaItem}>
              <GraduationCap size={18} aria-hidden="true" />
              <span>Giảng viên Thạc sĩ/Tiến sĩ</span>
            </div>
          </div>

          <div className={styles.cta}>
            <div className={styles.priceBox}>
              <span className={styles.priceLabel}>Học phí</span>
              <strong className={styles.price}>{course.price}</strong>
              {course.priceNote && (
                <span className={styles.priceNote}>{course.priceNote}</span>
              )}
            </div>
            <Link to="/register" className={styles.ctaBtn}>
              Đăng ký học thử miễn phí
            </Link>
          </div>
        </div>
      </section>

      {/* LỘ TRÌNH HỌC — 4 giai đoạn trong narrative workflow */}
      <section
        className={`${styles.section} ${styles.sectionAlt}`}
        aria-labelledby="roadmap-heading"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>
              Bốn giai đoạn · {course.roadmap.length} chặng nhỏ
            </span>
            <h2 id="roadmap-heading" className={styles.sectionTitle}>
              Lộ Trình Học <span className={styles.sectionTitleAccent}>Chi Tiết</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              {course.lessons} buổi học chia thành {course.roadmap.length} giai
              đoạn rõ ràng, có đánh giá năng lực sau mỗi giai đoạn.
            </p>
          </div>
          <CourseRoadmap items={course.roadmap} />
        </div>
      </section>

      {/* BẠN SẼ ĐẠT ĐƯỢC GÌ */}
      <section
        className={`${styles.section} ${styles.sectionIvory}`}
        aria-labelledby="outcomes-heading"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Đầu ra rõ ràng</span>
            <h2 id="outcomes-heading" className={styles.sectionTitle}>
              Bạn Sẽ <span className={styles.sectionTitleAccent}>Đạt Được Gì</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Mục tiêu đầu ra rõ ràng cho khóa {course.name}
            </p>
          </div>
          <ul className={styles.outcomesList}>
            {course.outcomes.map((outcome, i) => (
              <li key={i} className={styles.outcomeItem}>
                <span className={styles.outcomeIcon}>
                  <Check size={18} strokeWidth={2.5} aria-hidden="true" />
                </span>
                <span className={styles.outcomeText}>{outcome}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PHÙ HỢP VỚI AI — ivory card với brand-red rule */}
      <section
        className={`${styles.section} ${styles.sectionAlt}`}
        aria-labelledby="audience-heading"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Dành cho ai</span>
          </div>
          <div className={styles.audienceCard}>
            <h2 id="audience-heading" className={styles.audienceTitle}>
              Phù Hợp Với Ai
            </h2>
            <p className={styles.audienceText}>{course.targetAudience}</p>
          </div>
        </div>
      </section>

      {/* FAQ RIÊNG (nếu có) */}
      {course.faq && course.faq.length > 0 && (
        <section
          className={`${styles.section} ${styles.sectionIvory}`}
          aria-labelledby="course-faq-heading"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionEyebrow}>Hỏi — đáp</span>
              <h2 id="course-faq-heading" className={styles.sectionTitle}>
                Câu Hỏi <span className={styles.sectionTitleAccent}>Thường Gặp</span>
              </h2>
            </div>
            <FAQAccordion items={course.faq} />
          </div>
        </section>
      )}

      {/* 2 KHÓA KHÁC */}
      <section
        className={`${styles.section} ${styles.sectionAlt}`}
        aria-labelledby="other-courses-heading"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Tiếp tục hành trình</span>
            <h2 id="other-courses-heading" className={styles.sectionTitle}>
              Khóa Học Khác <span className={styles.sectionTitleAccent}>Bạn Có Thể Quan Tâm</span>
            </h2>
          </div>
          <div className={styles.grid2}>
            {otherCourses.map((c) => (
              <CourseCard key={c.slug} course={c} variant="compact" />
            ))}
          </div>
        </div>
      </section>

      <CTABanner
        headline={ctaBannerContent.headline}
        ctaLabel={ctaBannerContent.ctaLabel}
        ctaTo={ctaBannerContent.ctaTo}
      />
    </>
  );
}