/**
 * CoursesListPage — /khoa-hoc
 *
 * Trang danh sách 3 khóa học với:
 *  - Hero nhỏ đầu trang
 *  - 3 CourseCard (variant "detailed")
 *  - Bảng so sánh nhanh 3 lộ trình
 *  - CTA Banner cuối trang
 */
import { SEO } from "../../shared/components/SEO";
import { Breadcrumb } from "../../features/public/components/Breadcrumb";
import { CourseCard } from "../../features/public/components/CourseCard";
import { CourseComparisonTable } from "../../features/public/components/CourseComparisonTable";
import { CTABanner } from "../../features/public/components/CTABanner";
import { ctaBannerContent } from "../../features/public/data/homeContent";
import { coursesContent } from "../../features/public/data/coursesContent";
import { getCourseSummaries } from "../../features/public/data/coursesContent";
import styles from "./CoursesPage.module.css";

export function CoursesPage() {
  const summaries = getCourseSummaries();
  // Map slug → audienceLine rút gọn
  const audienceBySlug: Record<string, string> = {};
  for (const c of coursesContent) {
    audienceBySlug[c.slug] = c.targetAudience;
  }

  return (
    <>
      <SEO
        title="Khóa học tiếng Trung — HSK 1 đến HSK 6 | Zhong Ruan"
        description="Khám phá các khóa học tiếng Trung HSK từ cơ bản đến nâng cao, kèm lộ trình luyện thi chứng chỉ quốc tế."
      />

      <Breadcrumb items={[{ label: "Khóa học" }]} />

      {/* Hero nhỏ */}
      <section className={styles.hero} aria-labelledby="courses-hero-heading">
        <div className={styles.container}>
          <span className={styles.badge}>Chương trình đào tạo</span>
          <h1 id="courses-hero-heading" className={styles.heading}>
            Lộ Trình Học Tiếng Trung Từ Cơ Bản Đến Nâng Cao
          </h1>
          <p className={styles.subheading}>
            3 cấp độ HSK được thiết kế rõ ràng theo mục tiêu — từ người mất gốc
            đến luyện thi chứng chỉ quốc tế, du học, công việc chuyên môn.
          </p>
        </div>
      </section>

      {/* Danh sách 3 CourseCard */}
      <section
        className={`${styles.section} ${styles.sectionAlt}`}
        aria-labelledby="courses-list-heading"
      >
        <div className={styles.container}>
          <h2 id="courses-list-heading" className={styles.sectionTitle}>
            3 Khóa Học Hiện Có
          </h2>
          <div className={styles.grid3}>
            {summaries.map((c) => (
              <CourseCard
                key={c.slug}
                course={c}
                variant="detailed"
                audienceLine={audienceBySlug[c.slug]}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Bảng so sánh nhanh */}
      <section
        className={`${styles.section} ${styles.sectionWhite}`}
        aria-labelledby="comparison-heading"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 id="comparison-heading" className={styles.sectionTitle}>
              So Sánh Nhanh 3 Lộ Trình
            </h2>
            <p className={styles.sectionSubtitle}>
              Giúp bạn chọn khóa phù hợp mà không cần đọc hết chi tiết từng trang
            </p>
          </div>
          <CourseComparisonTable />
        </div>
      </section>

      {/* CTA */}
      <CTABanner
        headline={ctaBannerContent.headline}
        ctaLabel={ctaBannerContent.ctaLabel}
        ctaTo={ctaBannerContent.ctaTo}
      />
    </>
  );
}