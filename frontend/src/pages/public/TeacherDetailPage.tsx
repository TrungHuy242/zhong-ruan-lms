/**
 * TeacherDetailPage — /giang-vien/:slug
 *
 * Trang hồ sơ chi tiết 1 giảng viên công khai.
 *
 * Luồng:
 *  - Gọi GET /public/teachers/:slug (BE trả 404 nếu không tồn tại hoặc chưa publish)
 *  - Breadcrumb: Trang chủ / Giảng viên / {Tên}
 *  - Hero: ảnh lớn + tên + chức danh + số năm KN nổi bật + tags chuyên môn
 *  - Mô tả chi tiết (bio, full)
 *  - Nếu 404 → "Không tìm thấy giảng viên" + nút về /giang-vien
 *  - CTA "Đăng ký học thử với giáo viên này" → /register?ref=teacher&slug=...
 *
 * SEO: title/description động theo data.
 *   title: `Giảng viên ${fullName} — ${title} | Zhong Ruan`
 *   description: `${bioShort}` (fallback về bio cắt 160 ký tự).
 *
 * Pattern tham chiếu: CourseDetailPage (breadcrumb + hero + 404 fallback).
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert } from "../../shared/components/ui";
import { SEO } from "../../shared/components/SEO";
import { Breadcrumb } from "../../features/public/components/Breadcrumb";
import { CTABanner } from "../../features/public/components/CTABanner";
import { ImagePlaceholder } from "../../features/public/components/ImagePlaceholder";
import { ApiError } from "../../shared/api";
import {
  getPublicTeacherBySlug,
  type PublicTeacher,
} from "../../features/public/services/publicTeacherApi";
import {
  ArrowLeft,
  BadgeCheck,
  GraduationCap,
  Sparkles,
  Star,
} from "lucide-react";
import styles from "./TeacherDetailPage.module.css";

const SITE_NAME = "Zhong Ruan";
const REGISTER_PATH = "/register";

function buildTitle(t: PublicTeacher): string {
  return `Giảng viên ${t.fullName} — ${t.title} | ${SITE_NAME}`;
}

function buildDescription(t: PublicTeacher): string {
  const base = (t.bioShort || t.bio || "").trim();
  if (!base) return `Hồ sơ giảng viên ${t.fullName} tại ${SITE_NAME}.`;
  // Cắt còn ~160 ký tự cho meta description.
  if (base.length <= 160) return base;
  return `${base.slice(0, 157).trimEnd()}…`;
}

function formatExperience(years: number | null | undefined): string {
  if (years == null) return "Chưa cập nhật";
  if (years < 1) return "Dưới 1 năm";
  return `${years}+ năm`;
}

export function TeacherDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const [teacher, setTeacher] = useState<PublicTeacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setNotFound(false);
      setError(null);
      try {
        const result = await getPublicTeacherBySlug(slug);
        if (cancelled) return;
        setTeacher(result);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          const message =
            err instanceof ApiError
              ? err.message
              : err instanceof Error
              ? err.message
              : "Không tải được hồ sơ giảng viên";
          setError(message);
        }
        setTeacher(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ===== 404 state =====
  if (notFound) {
    return (
      <>
        <SEO
          title="Không tìm thấy giảng viên | Zhong Ruan"
          description="Giảng viên bạn đang tìm không tồn tại hoặc đã được ẩn. Xem danh sách giảng viên hiện có tại Zhong Ruan."
        />
        <Breadcrumb
          items={[
            { label: "Giảng viên", to: "/giang-vien" },
            { label: "Không tìm thấy" },
          ]}
        />
        <section className={styles.notFound}>
          <div className={styles.notFoundInner}>
            <GraduationCap size={64} className={styles.notFoundIcon} aria-hidden="true" />
            <h1 className={styles.notFoundTitle}>Không tìm thấy giảng viên</h1>
            <p className={styles.notFoundText}>
              Giảng viên bạn đang tìm không tồn tại, đã bị ẩn hoặc đường dẫn không
              chính xác. Vui lòng xem danh sách giảng viên hiện có.
            </p>
            <Link to="/giang-vien" className={styles.notFoundBtn}>
              <ArrowLeft size={16} />
              Xem danh sách giảng viên
            </Link>
          </div>
        </section>
      </>
    );
  }

  // ===== Error state =====
  if (error && !loading) {
    return (
      <>
        <SEO
          title="Lỗi tải hồ sơ | Zhong Ruan"
          description="Đã có lỗi xảy ra khi tải hồ sơ giảng viên. Vui lòng thử lại sau."
        />
        <Breadcrumb items={[{ label: "Giảng viên", to: "/giang-vien" }]} />
        <section className={styles.notFound}>
          <div className={styles.notFoundInner}>
            <Alert variant="error">{error}</Alert>
            <Link to="/giang-vien" className={styles.notFoundBtn}>
              <ArrowLeft size={16} />
              Quay lại danh sách
            </Link>
          </div>
        </section>
      </>
    );
  }

  // ===== Loading skeleton =====
  if (loading || !teacher) {
    return (
      <>
        <SEO
          title="Đang tải hồ sơ giảng viên... | Zhong Ruan"
          description="Đang tải thông tin giảng viên."
        />
        <Breadcrumb items={[{ label: "Giảng viên", to: "/giang-vien" }]} />
        <section className={styles.loadingWrap}>
          <div className={styles.loadingAvatar} aria-hidden="true" />
          <div className={styles.loadingBody}>
            <div className={styles.loadingTitle} aria-hidden="true" />
            <div className={styles.loadingSubtitle} aria-hidden="true" />
            <div className={styles.loadingLines}>
              <div className={styles.loadingLine} aria-hidden="true" />
              <div className={styles.loadingLine} aria-hidden="true" />
              <div className={styles.loadingLine} aria-hidden="true" />
            </div>
          </div>
        </section>
      </>
    );
  }

  // ===== Main render =====
  const registerHref = `${REGISTER_PATH}?ref=teacher&slug=${encodeURIComponent(teacher.slug)}`;

  return (
    <>
      <SEO title={buildTitle(teacher)} description={buildDescription(teacher)} />

      <Breadcrumb
        items={[
          { label: "Giảng viên", to: "/giang-vien" },
          { label: teacher.fullName },
        ]}
      />

      {/* ===== HERO ===== */}
      <section className={styles.hero} aria-labelledby="teacher-hero-heading">
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.avatarWrap}>
              {teacher.avatarUrl ? (
                <img
                  src={teacher.avatarUrl}
                  alt={`Ảnh giảng viên ${teacher.fullName}`}
                  className={styles.avatar}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <ImagePlaceholder
                  label="giảng viên"
                  aspectRatio="1/1"
                  className={styles.avatar}
                />
              )}
              {teacher.isFeatured ? (
                <span className={styles.featuredBadge}>
                  <Star size={14} strokeWidth={2.5} />
                  Giảng viên nổi bật
                </span>
              ) : null}
            </div>

            <div className={styles.heroInfo}>
              {teacher.isFeatured ? (
                <span className={styles.kicker}>
                  <Sparkles size={14} aria-hidden="true" />
                  Giảng viên nổi bật
                </span>
              ) : null}

              <h1 id="teacher-hero-heading" className={styles.name}>
                {teacher.fullName}
                <BadgeCheck
                  size={26}
                  strokeWidth={2.5}
                  className={styles.verifiedIcon}
                  aria-label="Đã xác minh"
                />
              </h1>

              <p className={styles.title}>{teacher.title}</p>

              {teacher.bioShort ? (
                <p className={styles.bioShort}>{teacher.bioShort}</p>
              ) : null}

              {teacher.yearsOfExperience != null ? (
                <div className={styles.expCard}>
                  <div className={styles.expIcon}>
                    <GraduationCap size={28} aria-hidden="true" />
                  </div>
                  <div className={styles.expBody}>
                    <span className={styles.expLabel}>Kinh nghiệm giảng dạy</span>
                    <strong className={styles.expValue}>
                      {formatExperience(teacher.yearsOfExperience)}
                    </strong>
                  </div>
                </div>
              ) : null}

              {teacher.specialties && teacher.specialties.length > 0 ? (
                <div className={styles.tags} aria-label="Chuyên môn">
                  <span className={styles.tagsLabel}>Chuyên môn:</span>
                  {teacher.specialties.map((s) => (
                    <span key={s} className={styles.tag}>
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className={styles.ctaRow}>
                <Link to={registerHref} className={styles.primaryCta}>
                  Đăng ký học thử với giáo viên này
                </Link>
                <Link to="/giang-vien" className={styles.secondaryCta}>
                  <ArrowLeft size={16} />
                  Xem giảng viên khác
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BIO chi tiết ===== */}
      {teacher.bio ? (
        <section
          className={`${styles.section} ${styles.sectionAlt}`}
          aria-labelledby="bio-heading"
        >
          <div className={styles.container}>
            <div className={styles.bioCard}>
              <h2 id="bio-heading" className={styles.bioTitle}>
                Về {teacher.fullName}
              </h2>
              <div className={styles.bioContent}>
                {teacher.bio.split(/\n\n+/).map((paragraph, idx) => (
                  <p key={idx} className={styles.bioParagraph}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== CTA Banner ===== */}
      <CTABanner
        headline={`Sẵn sàng học cùng ${teacher.fullName}?`}
        ctaLabel="Đăng ký học thử miễn phí"
        ctaTo={registerHref}
      />
    </>
  );
}