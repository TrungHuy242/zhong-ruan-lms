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

  return (
    <>
      <SEO title={course.seo.title} description={course.seo.description} />

      <Breadcrumb
        items={[
          { label: "Khóa học", to: "/khoa-hoc" },
          { label: course.name },
        ]}
      />

      {/* HERO riêng khóa */}
      <section className={styles.hero} aria-labelledby="course-hero-heading">
        <div className={styles.container}>
          <span className={styles.levelBadge}>{course.level}</span>
          <h1 id="course-hero-heading" className={styles.heading}>
            {course.name}
          </h1>
          <p className={styles.subheading}>{course.fullDescription}</p>

          <div className={styles.heroMeta}>
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

          <div className={styles.heroCta}>
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

      {/* LỘ TRÌNH HỌC */}
      <section
        className={`${styles.section} ${styles.sectionAlt}`}
        aria-labelledby="roadmap-heading"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 id="roadmap-heading" className={styles.sectionTitle}>
              Lộ Trình Học Chi Tiết
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
        className={`${styles.section} ${styles.sectionWhite}`}
        aria-labelledby="outcomes-heading"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 id="outcomes-heading" className={styles.sectionTitle}>
              Bạn Sẽ Đạt Được Gì
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

      {/* PHÙ HỢP VỚI AI */}
      <section
        className={`${styles.section} ${styles.sectionAlt}`}
        aria-labelledby="audience-heading"
      >
        <div className={styles.container}>
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
          className={`${styles.section} ${styles.sectionWhite}`}
          aria-labelledby="course-faq-heading"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 id="course-faq-heading" className={styles.sectionTitle}>
                Câu Hỏi Thường Gặp Về Khóa Này
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
            <h2 id="other-courses-heading" className={styles.sectionTitle}>
              Khóa Học Khác Bạn Có Thể Quan Tâm
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