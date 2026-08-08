/**
 * TestimonialFormPage — trang tạo/sửa đánh giá/feedback học viên (Admin).
 *
 * Hallmark stamp:
 *   macrostructure: form-led · genre: modern-minimal · theme: design-system-locked (DESIGN.md §10)
 *   tone: utilitarian · anchor hue: brand-red #C8102E
 *   shape: admin-radius-input 6px / control 8px · shadow: admin-control 0.08
 *   font: Be Vietnam Pro only (single-font admin shell)
 *   diversification: 6 form pages share 1 macrostructure (DEFER to §10)
 *
 * Routing:
 *   /testimonials/new         → create mode
 *   /testimonials/:id/edit    → edit mode
 *
 * Field count: 9 — gồm star picker cho Rating + UploadZone cho avatar.
 * Layout: 2-col grid cho field ngắn, 1-col full cho textarea dài + UploadZone + toggles.
 *
 * Thay thế FormModal — URL bookmarkable, Back tự nhiên, full-page layout.
 */

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Star,
  Upload,
  X as XIcon,
} from "lucide-react";
import {
  Alert,
  Button,
  Input,
  Skeleton,
  UploadZone,
} from "../../../shared/components/ui";
import {
  PageHeader,
  StickyFooter,
} from "../../../shared/components/layout";
import { useToast } from "../../../shared/contexts/ToastContext";
import { ApiError } from "../../../shared/api";
import {
  createTestimonial,
  getTestimonial,
  updateTestimonial,
  uploadTestimonialAvatar,
  type Testimonial,
} from "../services/testimonialApi";
import styles from "./TestimonialFormPage.module.css";

interface FieldErrors {
  studentName?: string;
  content?: string;
  rating?: string;
  displayOrder?: string;
  avatar?: string;
  courseInfo?: string;
  source?: string;
}

const MIN_RATING = 1;
const MAX_RATING = 5;
const MAX_STUDENT_NAME = 100;
const MAX_CONTENT = 5000;
const MAX_COURSE_INFO = 50;
const MAX_SOURCE = 50;

function validateStudentName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Vui lòng nhập họ tên";
  if (trimmed.length < 2) return "Họ tên phải có ít nhất 2 ký tự";
  if (trimmed.length > MAX_STUDENT_NAME) {
    return `Họ tên không quá ${MAX_STUDENT_NAME} ký tự`;
  }
  return undefined;
}
function validateContent(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Vui lòng nhập nội dung đánh giá";
  if (trimmed.length > MAX_CONTENT) {
    return `Nội dung không quá ${MAX_CONTENT} ký tự`;
  }
  return undefined;
}
function validateRating(value: number): string | undefined {
  if (!Number.isInteger(value) || value < MIN_RATING || value > MAX_RATING) {
    return `Đánh giá phải là số nguyên ${MIN_RATING}-${MAX_RATING}`;
  }
  return undefined;
}
function validateDisplayOrder(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 9999) {
    return "Thứ tự phải là số nguyên 0–9999";
  }
  return undefined;
}
function validateCourseInfo(value: string): string | undefined {
  if (!value.trim()) return undefined;
  if (value.trim().length > MAX_COURSE_INFO) {
    return `Khóa học không quá ${MAX_COURSE_INFO} ký tự`;
  }
  return undefined;
}
function validateSource(value: string): string | undefined {
  if (!value.trim()) return undefined;
  if (value.trim().length > MAX_SOURCE) {
    return `Nguồn không quá ${MAX_SOURCE} ký tự`;
  }
  return undefined;
}

export function TestimonialFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // returnTo: URL của list page (kèm search params) do list page truyền qua
  // navigate state. Fallback về "/testimonials" nếu user vào thẳng URL này.
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ||
    "/testimonials";
  const isEdit = Boolean(id);
  const toast = useToast();

  // ===== Page state =====
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [current, setCurrent] = useState<Testimonial | null>(null);

  // ===== Form state =====
  const [studentName, setStudentName] = useState("");
  const [courseInfo, setCourseInfo] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [displayOrder, setDisplayOrder] = useState("0");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // ===== Load testimonial (edit mode) =====
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    getTestimonial(id)
      .then((t) => {
        if (cancelled) return;
        setCurrent(t);
        setStudentName(t.studentName);
        setCourseInfo(t.courseInfo ?? "");
        setContent(t.content);
        setRating(t.rating);
        setAvatarUrl(t.avatarUrl ?? null);
        setSource(t.source ?? "");
        setIsFeatured(t.isFeatured);
        setIsPublished(t.isPublished);
        setDisplayOrder(String(t.displayOrder ?? 0));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (
          err instanceof ApiError &&
          (err.status === 404 || err.status === 400)
        ) {
          setNotFound(true);
        } else {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Không thể tải thông tin đánh giá."
          );
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  // ===== Document title =====
  useEffect(() => {
    document.title = isEdit
      ? "Sửa đánh giá — Zhong Ruan LMS"
      : "Thêm đánh giá — Zhong Ruan LMS";
  }, [isEdit]);

  // ===== Navigation =====
  function handleBack() {
    if (isSubmitting) return;
    navigate(returnTo);
  }

  function validateAll(): boolean {
    const next: FieldErrors = {
      studentName: validateStudentName(studentName),
      content: validateContent(content),
      rating: validateRating(rating),
      displayOrder: validateDisplayOrder(displayOrder),
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  }

  async function handleAvatarUpload(file: File) {
    setErrors((p) => ({ ...p, avatar: undefined }));
    setIsUploadingAvatar(true);
    try {
      const { url } = await uploadTestimonialAvatar(file);
      setAvatarUrl(url);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Upload ảnh thất bại";
      setErrors((p) => ({ ...p, avatar: message }));
      throw err;
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  function clearAvatar() {
    setAvatarUrl(null);
    setErrors((p) => ({ ...p, avatar: undefined }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      const displayOrderNum = Number(displayOrder) || 0;
      if (isEdit && current) {
        await updateTestimonial(current.id, {
          studentName: studentName.trim(),
          courseInfo: courseInfo.trim() ? courseInfo.trim() : null,
          content: content.trim(),
          rating,
          avatarUrl: avatarUrl ?? null,
          source: source.trim() ? source.trim() : null,
          isFeatured,
          isPublished,
          displayOrder: displayOrderNum,
        });
        toast.success("Đã cập nhật đánh giá");
      } else {
        await createTestimonial({
          studentName: studentName.trim(),
          courseInfo: courseInfo.trim() ? courseInfo.trim() : null,
          content: content.trim(),
          rating,
          avatarUrl: avatarUrl ?? null,
          source: source.trim() ? source.trim() : null,
          isFeatured,
          isPublished,
          displayOrder: displayOrderNum,
        });
        toast.success("Đã tạo đánh giá");
      }
      navigate(returnTo);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      toast.error(message);
      setIsSubmitting(false);
    }
  }

  // ===== Loading / 404 / error states =====
  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="rectangular" height={120} />
        <div
          style={{
            marginTop: 24,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="text" height={20} />
          ))}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className={styles.page}>
        <Alert variant="error">
          <strong>Không tìm thấy đánh giá.</strong> Có thể đã bị xoá hoặc URL
          không hợp lệ.
        </Alert>
        <div className={styles.actionsRow}>
          <Button
            variant="primary"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => navigate(returnTo)}
          >
            Về danh sách
          </Button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <Alert variant="error">
          <strong>Lỗi:</strong> {loadError}
        </Alert>
        <div className={styles.actionsRow}>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Tải lại
          </Button>
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => navigate(returnTo)}
          >
            Về danh sách
          </Button>
        </div>
      </div>
    );
  }

  // ===== Main form =====
  const avatarPreviewSrc = avatarUrl ?? null;
  const showRatingHint =
    validateRating(rating) !== undefined || rating === 0;

  return (
    <div className={styles.page}>
      <PageHeader
        title={isEdit ? "Sửa đánh giá" : "Thêm đánh giá"}
        description={
          isEdit
            ? `Cập nhật phản hồi của ${current?.studentName ?? ""}`
            : "Tạo đánh giá mới từ học viên để hiển thị trên trang chủ và trang công khai."
        }
        breadcrumb={[
          { label: "Quản lý", to: "/dashboard" },
          { label: "Đánh giá", to: "/testimonials" },
          { label: isEdit ? "Sửa" : "Thêm mới" },
        ]}
        onBack={handleBack}
      />

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        {/* Row 1: Họ tên + Khóa học */}
        <div className={styles.grid2}>
          <Input
            label="Họ và tên"
            placeholder="VD: Nguyễn Văn A"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            error={errors.studentName}
            maxLength={MAX_STUDENT_NAME}
            required
            disabled={isSubmitting}
          />
          <Input
            label="Khóa học (không bắt buộc)"
            placeholder="VD: TC1, HSSV, HSK 4"
            value={courseInfo}
            onChange={(e) => {
              setCourseInfo(e.target.value);
              setErrors((p) => ({
                ...p,
                courseInfo: validateCourseInfo(e.target.value),
              }));
            }}
            error={errors.courseInfo}
            hint="Lớp/khóa học học viên đang theo học."
            maxLength={MAX_COURSE_INFO}
            disabled={isSubmitting}
          />
        </div>

        {/* Row 2: Nội dung đánh giá (full-width textarea) */}
        <div className={styles.field}>
          <label htmlFor="testimonial-content" className={styles.label}>
            Nội dung đánh giá <span className={styles.required}>*</span>
          </label>
          <textarea
            id="testimonial-content"
            className={styles.textarea}
            rows={5}
            placeholder="Nhập trích dẫn phản hồi của học viên..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            maxLength={MAX_CONTENT}
            aria-invalid={errors.content ? true : undefined}
            aria-describedby={
              errors.content ? "testimonial-content-error" : undefined
            }
          />
          {errors.content ? (
            <span
              id="testimonial-content-error"
              className={styles.fieldError}
              role="alert"
            >
              {errors.content}
            </span>
          ) : (
            <span className={styles.hint}>
              {content.length} / {MAX_CONTENT} ký tự
            </span>
          )}
        </div>

        {/* Row 3: Rating star picker */}
        <div className={styles.field}>
          <label className={styles.label}>
            Đánh giá <span className={styles.required}>*</span>
          </label>
          <div
            className={styles.starPicker}
            role="radiogroup"
            aria-label="Chọn mức đánh giá từ 1 đến 5 sao"
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const active =
                hoverRating !== null ? star <= hoverRating : star <= rating;
              return (
                <button
                  key={star}
                  type="button"
                  className={[
                    styles.starBtn,
                    active ? styles.starBtnActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={`${star} sao`}
                  aria-checked={rating === star}
                  role="radio"
                  disabled={isSubmitting}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onFocus={() => setHoverRating(star)}
                  onBlur={() => setHoverRating(null)}
                  onClick={() => {
                    setRating(star);
                    setErrors((p) => ({ ...p, rating: undefined }));
                  }}
                >
                  <Star
                    size={28}
                    className={active ? styles.starIconActive : styles.starIcon}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
            <span className={styles.ratingValue}>
              {hoverRating ?? rating} / {MAX_RATING}
            </span>
          </div>
          {errors.rating ? (
            <span className={styles.fieldError} role="alert">
              {errors.rating}
            </span>
          ) : showRatingHint ? null : (
            <span className={styles.hint}>
              Click vào sao để chọn mức đánh giá.
            </span>
          )}
        </div>

        {/* Row 4: Avatar (UploadZone) + Preview */}
        <div className={styles.field}>
          <label className={styles.label}>
            <Upload size={14} aria-hidden="true" />
            <span>Ảnh đại diện (không bắt buộc)</span>
          </label>
          <div className={styles.avatarRow}>
            <div className={styles.avatarPreview}>
              {avatarPreviewSrc ? (
                <>
                  <img
                    src={avatarPreviewSrc}
                    alt="Xem trước ảnh đại diện"
                    className={styles.avatarImg}
                  />
                  <button
                    type="button"
                    className={styles.avatarClearBtn}
                    onClick={clearAvatar}
                    disabled={isSubmitting || isUploadingAvatar}
                    aria-label="Xoá ảnh đại diện"
                  >
                    <XIcon size={14} />
                  </button>
                </>
              ) : (
                <span className={styles.avatarEmpty}>
                  Chưa có ảnh đại diện
                </span>
              )}
            </div>
            <div className={styles.avatarUploadWrap}>
              <UploadZone
                onUpload={handleAvatarUpload}
                multiple={false}
                showQueue={false}
                disabled={isSubmitting || isUploadingAvatar}
                description={
                  <span>
                    Kéo thả hoặc bấm để chọn ảnh. JPG/PNG/WEBP, tối đa 5MB.
                  </span>
                }
              />
              {errors.avatar ? (
                <span className={styles.fieldError} role="alert">
                  {errors.avatar}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Row 5: Nguồn (optional) */}
        <Input
          label="Nguồn (không bắt buộc)"
          placeholder="Facebook Messenger"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setErrors((p) => ({
              ...p,
              source: validateSource(e.target.value),
            }));
          }}
          error={errors.source}
          hint="Kênh thu thập phản hồi — VD: Facebook Messenger, Zalo, Email..."
          maxLength={MAX_SOURCE}
          disabled={isSubmitting}
        />

        {/* Row 6: Toggles + display order */}
        <div className={styles.grid3}>
          <label className={styles.toggleField}>
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              disabled={isSubmitting}
            />
            <span className={styles.toggleLabel}>
              <Star size={14} aria-hidden="true" />
              <strong>Nổi bật</strong>
              <small>Ưu tiên hiển thị ở trang chủ.</small>
            </span>
          </label>

          <label className={styles.toggleField}>
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              disabled={isSubmitting}
            />
            <span className={styles.toggleLabel}>
              <Upload size={14} aria-hidden="true" />
              <strong>Xuất bản</strong>
              <small>Hiển thị công khai trên trang public.</small>
            </span>
          </label>

          <Input
            label="Thứ tự hiển thị"
            type="number"
            value={displayOrder}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setDisplayOrder(e.target.value)
            }
            error={errors.displayOrder}
            hint="Số nhỏ hiển thị trước."
            min={0}
            max={9999}
            disabled={isSubmitting}
          />
        </div>

        {/* Sticky submit footer */}
        <StickyFooter>
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={!isSubmitting ? <Save size={16} /> : undefined}
          >
            {isEdit ? "Lưu thay đổi" : "Tạo đánh giá"}
          </Button>
        </StickyFooter>
      </form>
    </div>
  );
}

export default TestimonialFormPage;