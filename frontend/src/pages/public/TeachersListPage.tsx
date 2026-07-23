/**
 * TeachersListPage — /giang-vien
 *
 * Trang danh sách giảng viên công khai.
 *
 * Luồng:
 *  - Gọi GET /public/teachers (server-side pagination + filter)
 *  - Grid PublicTeacherCard (responsive 1/2/3/4 col)
 *  - Filter theo Specialty (dropdown lấy distinct từ data trả về)
 *  - Pagination component dùng chung
 *  - Loading: skeleton 6 card
 *  - Empty state có CTA "Liên hệ tư vấn"
 *  - Error state có retry
 *
 * Pattern tham chiếu: CoursesPage (grid + section) + AdminPagination.
 * SEO: title/description cố định cho trang list.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Button,
  Pagination,
  Skeleton,
} from "../../shared/components/ui";
import { SEO } from "../../shared/components/SEO";
import { Breadcrumb } from "../../features/public/components/Breadcrumb";
import { PublicTeacherCard } from "../../features/public/components/PublicTeacherCard";
import { CTABanner } from "../../features/public/components/CTABanner";
import { ctaBannerContent } from "../../features/public/data/homeContent";
import { ApiError } from "../../shared/api";
import {
  listPublicTeachers,
  type PublicTeacher,
} from "../../features/public/services/publicTeacherApi";
import {
  Filter,
  GraduationCap,
  RotateCcw,
  Search,
  X as XIcon,
} from "lucide-react";
import styles from "./TeachersListPage.module.css";

const PAGE_SIZE = 10; // BE whitelist: 10 | 20 | 50

export function TeachersListPage() {
  // ===== Filter state =====
  const [keyword, setKeyword] = useState("");
  const [keywordApplied, setKeywordApplied] = useState("");
  const [specialty, setSpecialty] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  // ===== Data state =====
  const [teachers, setTeachers] = useState<PublicTeacher[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  /**
   * Distinct specialties — fetch page 1 với limit lớn (50) để lấy danh sách
   * specialty distinct (BE không có endpoint riêng). Nếu total > 50 thì danh
   * sách hiển thị có thể chưa đủ, nhưng UX chấp nhận được — admin có thể bổ
   * sung endpoint /public/teachers/specialties sau nếu cần.
   */
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
  // Tăng counter để ép useEffect fetch list re-run khi user bấm "Thử lại".
  const [reloadToken, setReloadToken] = useState(0);

  // Debounce keyword input → apply sau 400ms.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setKeywordApplied((prev) => {
        if (prev === keyword) return prev;
        setPage(1);
        return keyword;
      });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [keyword]);

  // Fetch distinct specialties MỘT LẦN khi mount (không phụ thuộc filter khác).
  useEffect(() => {
    let cancelled = false;
    async function loadSpecialties() {
      setSpecialtiesLoading(true);
      try {
        const result = await listPublicTeachers({ page: 1, limit: 50 });
        if (cancelled) return;
        const set = new Set<string>();
        for (const t of result.teachers) {
          for (const s of t.specialties ?? []) {
            if (s) set.add(s);
          }
        }
        setSpecialtyOptions(Array.from(set).sort((a, b) => a.localeCompare(b, "vi")));
      } catch {
        // Không block UI — nếu fetch fail thì dropdown rỗng, vẫn dùng được
        // (người dùng vẫn có thể search keyword).
        if (!cancelled) setSpecialtyOptions([]);
      } finally {
        if (!cancelled) setSpecialtiesLoading(false);
      }
    }
    void loadSpecialties();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch list theo filter.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const result = await listPublicTeachers({
          keyword: keywordApplied || undefined,
          specialty: specialty === "ALL" ? undefined : specialty,
          page,
          limit: PAGE_SIZE,
        });
        if (cancelled) return;
        setTeachers(result.teachers);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Không tải được danh sách giảng viên";
        setLoadError(message);
        setTeachers([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [keywordApplied, specialty, page, reloadToken]);

  const isFiltered = Boolean(keywordApplied) || specialty !== "ALL";

  function clearFilters() {
    setKeyword("");
    setKeywordApplied("");
    setSpecialty("ALL");
    setPage(1);
  }

  const isEmpty = useMemo(
    () => !loading && teachers.length === 0 && !loadError,
    [loading, teachers.length, loadError]
  );

  return (
    <>
      <SEO
        title="Đội ngũ giảng viên tiếng Trung — Thạc sĩ, Tiến sĩ giàu kinh nghiệm | Zhong Ruan"
        description="Gặp gỡ đội ngũ giáo viên tiếng Trung bản ngữ và Việt Nam giàu kinh nghiệm, chứng chỉ sư phạm quốc tế. Tìm giảng viên phù hợp với trình độ và mục tiêu của bạn."
      />

      <Breadcrumb items={[{ label: "Giảng viên" }]} />

      {/* ===== Hero ===== */}
      <section className={styles.hero} aria-labelledby="teachers-hero-heading">
        <div className={styles.container}>
          <span className={styles.badge}>Đội ngũ giảng dạy</span>
          <h1 id="teachers-hero-heading" className={styles.heading}>
            Đội Ngũ Giảng Viên Zhong Ruan
          </h1>
          <p className={styles.subheading}>
            Thạc sĩ, Tiến sĩ ngôn ngữ học với nhiều năm kinh nghiệm giảng dạy
            tiếng Trung — từ giao tiếp cơ bản đến luyện thi HSK chứng chỉ quốc tế.
          </p>
        </div>
      </section>

      {/* ===== Filter bar ===== */}
      <section
        className={`${styles.section} ${styles.sectionAlt}`}
        aria-labelledby="teachers-list-heading"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 id="teachers-list-heading" className={styles.sectionTitle}>
              Giảng viên hiện có
              {!loading ? (
                <span className={styles.count} aria-live="polite">
                  {total > 0 ? ` (${total})` : ""}
                </span>
              ) : null}
            </h2>
            <p className={styles.sectionSubtitle}>
              Lọc theo chuyên môn hoặc tìm theo tên — chọn giảng viên phù hợp để
              xem hồ sơ chi tiết.
            </p>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.searchWrap}>
              <Search size={16} aria-hidden="true" className={styles.searchIcon} />
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Tìm theo tên giảng viên..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                aria-label="Tìm giảng viên theo tên"
              />
              {keyword ? (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => setKeyword("")}
                  aria-label="Xoá từ khoá"
                >
                  <XIcon size={14} />
                </button>
              ) : null}
            </div>

            <div className={styles.specialtyWrap}>
              <Filter size={16} aria-hidden="true" className={styles.filterIcon} />
              <select
                className={styles.specialtySelect}
                value={specialty}
                onChange={(e) => {
                  setSpecialty(e.target.value);
                  setPage(1);
                }}
                aria-label="Lọc theo chuyên môn"
                disabled={specialtiesLoading}
              >
                <option value="ALL">
                  {specialtiesLoading
                    ? "Đang tải chuyên môn..."
                    : "Tất cả chuyên môn"}
                </option>
                {specialtyOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {isFiltered ? (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RotateCcw size={14} />}
                onClick={clearFilters}
              >
                Đặt lại
              </Button>
            ) : null}
          </div>

          {/* ===== Error state ===== */}
          {loadError ? (
            <div className={styles.errorState} role="alert">
              <Alert variant="error" className={styles.alertSpacing}>
                {loadError}
              </Alert>
              <Button
                variant="secondary"
                size="md"
                leftIcon={<RotateCcw size={14} />}
                onClick={() => setReloadToken((n) => n + 1)}
              >
                Thử lại
              </Button>
            </div>
          ) : null}

          {/* ===== Grid / skeleton / empty ===== */}
          {loading ? (
            <div className={styles.grid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <Skeleton variant="rectangular" height={240} />
                  <div className={styles.skeletonBody}>
                    <Skeleton variant="text" width="70%" />
                    <Skeleton variant="text" width="50%" />
                    <Skeleton variant="text" width="40%" />
                  </div>
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <div className={styles.emptyState}>
              <GraduationCap size={48} aria-hidden="true" />
              <p className={styles.emptyTitle}>
                {isFiltered
                  ? "Không tìm thấy giảng viên phù hợp"
                  : "Chưa có giảng viên công khai"}
              </p>
              <p className={styles.emptyHint}>
                {isFiltered
                  ? "Thử bỏ bộ lọc hoặc đổi từ khoá tìm kiếm."
                  : "Đội ngũ giảng viên sẽ sớm được cập nhật. Vui lòng quay lại sau."}
              </p>
              {isFiltered ? (
                <Button
                  variant="secondary"
                  size="md"
                  leftIcon={<RotateCcw size={14} />}
                  onClick={clearFilters}
                >
                  Đặt lại bộ lọc
                </Button>
              ) : (
                <Link to="/lien-he" className={styles.emptyCta}>
                  Liên hệ tư vấn
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {teachers.map((t) => (
                  <PublicTeacherCard key={t.id} teacher={t} />
                ))}
              </div>

              {/* ===== Pagination + total ===== */}
              <div className={styles.footerRow}>
                <span className={styles.totalLabel}>
                  Hiển thị <b>{teachers.length}</b> / <b>{total}</b> giảng viên
                </span>
                {totalPages > 1 ? (
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                ) : null}
              </div>
            </>
          )}
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