/**
 * HomePage — trang chủ public với 8 section đầy đủ nội dung.
 *
 * 1. Hero Section
 * 2. Trust Bar / Stats Counter
 * 3. USP / Cam kết
 * 4. Khóa học nổi bật
 * 5. Đội ngũ giảng viên
 * 6. Testimonial (placeholder)
 * 7. FAQ Accordion
 * 8. CTA Banner cuối trang
 *
 * Animation: fade-in + slide-up nhẹ khi mỗi section vào viewport.
 * SEO: chỉ 1 <h1> duy nhất (Hero), heading hierarchy đúng.
 */
import { Link } from "react-router-dom";
import { SEO } from "../../shared/components/SEO";
import {
  statsContent,
  uspContent,
  featuredCoursesContent,
  teachersContent,
  testimonialsContent,
  faqContent,
  ctaBannerContent,
} from "../../features/public/data/homeContent";
import { HeroSection } from "../../features/public/components/HeroSection";
import { StatCounter } from "../../features/public/components/StatCounter";
import { UspCard } from "../../features/public/components/UspCard";
import { CourseCard } from "../../features/public/components/CourseCard";
import { TeacherCard } from "../../features/public/components/TeacherCard";
import { TestimonialCard } from "../../features/public/components/TestimonialCard";
import { FAQAccordion } from "../../features/public/components/FAQAccordion";
import { CTABanner } from "../../features/public/components/CTABanner";
import styles from "./HomePage.module.css";

export function HomePage() {
  return (
    <>
      <SEO
        title="Zhong Ruan — Học tiếng Trung trực tuyến, lộ trình HSK chuẩn"
        description="Đào tạo tiếng Trung HSK online, giáo viên bản ngữ, học thử miễn phí. Lộ trình cá nhân hoá từ HSK 1 đến HSK 6."
      />

      {/* ========== 1. HERO ========== */}
      <HeroSection />

      <main>
        {/* ========== 2. STATS COUNTER ========== */}
        <section
          className={`${styles.section} ${styles.sectionAlt}`}
          aria-labelledby="stats-heading"
        >
          <div className={styles.container}>
            {/* Visually hidden — chỉ dùng cho screen reader */}
            <h2 id="stats-heading" className={styles.visuallyHidden}>
              Số liệu nổi bật
            </h2>
            <StatCounter stats={statsContent} />
          </div>
        </section>

        {/* ========== 3. USP / CAM KẾT ========== */}
        <section
          className={`${styles.section} ${styles.sectionWhite}`}
          aria-labelledby="usp-heading"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 id="usp-heading" className={styles.sectionTitle}>
                Cam Kết Chất Lượng
              </h2>
              <p className={styles.sectionSubtitle}>
                Những gì chúng tôi đảm bảo khi bạn đăng ký học tại Zhong Ruan
              </p>
            </div>
            <div className={styles.grid4}>
              {uspContent.map((item, i) => (
                <UspCard key={i} item={item} />
              ))}
            </div>
          </div>
        </section>

        {/* ========== 4. KHÓA HỌC NỔI BẬT ========== */}
        <section
          className={`${styles.section} ${styles.sectionAlt}`}
          aria-labelledby="courses-heading"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 id="courses-heading" className={styles.sectionTitle}>
                Lộ Trình Học Phù Hợp Mọi Trình Độ
              </h2>
              <p className={styles.sectionSubtitle}>
                Từ người chưa biết gì đến chứng chỉ HSK — có lộ trình rõ ràng
              </p>
            </div>
            <div className={styles.grid3}>
              {featuredCoursesContent.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
            <div className={styles.viewAllWrap}>
              <Link to="/khoa-hoc" className={styles.viewAllLink}>
                Xem tất cả khóa học
              </Link>
            </div>
          </div>
        </section>

        {/* ========== 5. ĐỘI NGŨ GIẢNG VIÊN ========== */}
        <section
          className={`${styles.section} ${styles.sectionWhite}`}
          aria-labelledby="teachers-heading"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 id="teachers-heading" className={styles.sectionTitle}>
                Đội Ngũ Giảng Viên
              </h2>
              <p className={styles.sectionSubtitle}>
                Thạc sĩ, Tiến sĩ ngôn ngữ học với nhiều năm kinh nghiệm giảng dạy
              </p>
            </div>
            <div className={styles.grid4}>
              {teachersContent.map((teacher, i) => (
                <TeacherCard key={i} teacher={teacher} />
              ))}
            </div>
            <div className={styles.viewAllWrap}>
              <Link to="/giang-vien" className={styles.viewAllLink}>
                Xem toàn bộ đội ngũ
              </Link>
            </div>
          </div>
        </section>

        {/* ========== 6. TESTIMONIAL ========== */}
        <section
          className={`${styles.section} ${styles.sectionAlt}`}
          aria-labelledby="testimonial-heading"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 id="testimonial-heading" className={styles.sectionTitle}>
                Học Viên Nói Gì Về Zhong Ruan
              </h2>
              <p className={styles.sectionSubtitle}>
                Những đánh giá từ học viên đã hoàn thành khóa học
              </p>
            </div>
            <div className={styles.grid3}>
              {testimonialsContent.map((t) => (
                <TestimonialCard key={t.id} testimonial={t} />
              ))}
            </div>
          </div>
        </section>

        {/* ========== 7. FAQ ========== */}
        <section
          className={`${styles.section} ${styles.sectionWhite}`}
          aria-labelledby="faq-heading"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 id="faq-heading" className={styles.sectionTitle}>
                Câu Hỏi Thường Gặp
              </h2>
              <p className={styles.sectionSubtitle}>
                Giải đáp nhanh những thắc mắc phổ biến trước khi đăng ký
              </p>
            </div>
            <FAQAccordion items={faqContent} />
          </div>
        </section>

        {/* ========== 8. CTA BANNER ========== */}
        <CTABanner
          headline={ctaBannerContent.headline}
          ctaLabel={ctaBannerContent.ctaLabel}
          ctaTo={ctaBannerContent.ctaTo}
        />
      </main>
    </>
  );
}
