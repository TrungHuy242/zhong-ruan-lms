/**
 * PublicTeacherCard — card giảng viên cho trang public list/detail.
 *
 * Khác TeacherCard (HomePage dùng data tĩnh):
 *   - Nhận data từ API PublicTeacher (đầy đủ field: slug, avatarUrl, specialties, yearsOfExperience...)
 *   - Có nút "Xem hồ sơ" → /giang-vien/:slug
 *   - Hiển thị specialties tag list + số năm KN + avatar thật (nếu có)
 *
 * Khi avatarUrl null → dùng ImagePlaceholder (line-art, an toàn bản quyền).
 */
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, GraduationCap } from "lucide-react";
import { ImagePlaceholder } from "./ImagePlaceholder";
import type { PublicTeacher } from "../services/publicTeacherApi";
import styles from "./PublicTeacherCard.module.css";

export interface PublicTeacherCardProps {
  teacher: PublicTeacher;
  /**
   * Hiển thị nút "Xem hồ sơ" ở dưới (mặc định true).
   * Set false nếu dùng cho mục đích không cần CTA (VD: hover preview).
   */
  showCta?: boolean;
}

function formatExperience(years: number | null | undefined): string {
  if (years == null) return "Chưa cập nhật";
  if (years < 1) return "Dưới 1 năm";
  return `${years} năm kinh nghiệm`;
}

export function PublicTeacherCard({
  teacher,
  showCta = true,
}: PublicTeacherCardProps) {
  return (
    <article className={styles.card}>
      <Link
        to={`/giang-vien/${teacher.slug}`}
        className={styles.media}
        aria-label={`Xem hồ sơ của ${teacher.fullName}`}
      >
        {teacher.avatarUrl ? (
          <img
            src={teacher.avatarUrl}
            alt={`Ảnh giảng viên ${teacher.fullName}`}
            className={styles.avatar}
            loading="lazy"
            onError={(e) => {
              // Fallback khi URL lỗi: ẩn ảnh, để lộ gradient nền card
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
          <span className={styles.featuredBadge} aria-label="Giảng viên nổi bật">
            <BadgeCheck size={14} strokeWidth={2.5} />
            Nổi bật
          </span>
        ) : null}
      </Link>

      <div className={styles.body}>
        <div className={styles.nameRow}>
          <h3 className={styles.name}>
            <Link to={`/giang-vien/${teacher.slug}`} className={styles.nameLink}>
              {teacher.fullName}
            </Link>
          </h3>
        </div>

        <p className={styles.title}>{teacher.title}</p>

        <p className={styles.experience}>
          <GraduationCap size={14} aria-hidden="true" />
          <span>{formatExperience(teacher.yearsOfExperience)}</span>
        </p>

        {teacher.specialties && teacher.specialties.length > 0 ? (
          <div className={styles.tags} aria-label="Chuyên môn">
            {teacher.specialties.slice(0, 3).map((s) => (
              <span key={s} className={styles.tag}>
                {s}
              </span>
            ))}
            {teacher.specialties.length > 3 ? (
              <span className={styles.tagMore}>
                +{teacher.specialties.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}

        {showCta ? (
          <Link
            to={`/giang-vien/${teacher.slug}`}
            className={styles.cta}
            aria-label={`Xem hồ sơ của ${teacher.fullName}`}
          >
            Xem hồ sơ
            <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        ) : null}
      </div>
    </article>
  );
}