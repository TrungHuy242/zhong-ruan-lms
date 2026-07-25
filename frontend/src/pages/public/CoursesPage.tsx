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

      {/* Masthead — tên chương trình (KHÔNG phải hero bán hàng) */}
      <section className={styles.masthead} aria-labelledby="courses-hero-heading">
        <div className={styles.mastheadInner}>
          <span className={styles.eyebrow}>Chương trình đào tạo</span>
          <h1 id="courses-hero-heading" className={styles.heading}>
            Lộ Trình Học Tiếng Trung Từ Cơ Bản Đến{" "}
            <span className={styles.headingAccent}>Nâng Cao</span>
          </h1>
          <p className={styles.subheading}>
            3 cấp độ HSK được thiết kế rõ ràng theo mục tiêu — từ người mất gốc
            đến luyện thi chứng chỉ quốc tế, du học, công việc chuyên môn.
          </p>

          {/* Three-stage hairline — 3 chấm kể "chặng" 1.0 → 2.0 → 3.0 */}
          <div className={styles.stageRule} aria-hidden="true">
            <span className={styles.stageRuleItem}>
              <span className={styles.stageRuleDot} />
              1.0 — Sơ cấp
            </span>
            <span className={styles.stageRuleLine} />
            <span className={styles.stageRuleItem}>
              <span className={styles.stageRuleDot} />
              2.0 — Trung cấp
            </span>
            <span className={styles.stageRuleLine} />
            <span className={styles.stageRuleItem}>
              <span className={styles.stageRuleDot} />
              3.0 — Cao cấp
            </span>
          </div>
        </div>
      </section>

      {/* Danh sách 3 CourseCard — 3 chặng của narrative workflow */}
      <section
        className={`${styles.section} ${styles.sectionAlt}`}
        aria-labelledby="courses-list-heading"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Ba chặng</span>
            <h2 id="courses-list-heading" className={styles.sectionTitle}>
              3 Khóa Học — Một Lộ Trình{" "}
              <span className={styles.sectionTitleAccent}>liền mạch</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Mỗi chặng xây trên nền tảng chặng trước — chọn mức phù hợp với
              năng lực hiện tại, đi đến đích mà không lạc hướng.
            </p>
          </div>
          <div className={styles.grid3}>
            {summaries.map((c, i) => (
              <div key={c.slug} className={styles.stageCell}>
                <span className={styles.stageIndex}>
                  {String(i + 1).padStart(2, "0")} · chặng {i + 1}.0
                </span>
                <CourseCard
                  course={c}
                  variant="detailed"
                  audienceLine={audienceBySlug[c.slug]}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bảng so sánh nhanh — hiển thị 3 chặng side-by-side */}
      <section
        className={`${styles.section} ${styles.sectionIvory}`}
        aria-labelledby="comparison-heading"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>So sánh</span>
            <h2 id="comparison-heading" className={styles.sectionTitle}>
              So Sánh Nhanh{" "}
              <span className={styles.sectionTitleAccent}>3 Lộ Trình</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Giúp bạn chọn khóa phù hợp mà không cần đọc hết chi tiết từng trang
            </p>
          </div>
          <div className={styles.tableFrame}>
            <CourseComparisonTable />
          </div>
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