/**
 * TeacherFormPage — trang tạo/sửa giảng viên (Admin).
 *
 * Hallmark stamp:
 *   macrostructure: form-led · genre: modern-minimal · theme: design-system-locked (DESIGN.md §10)
 *   tone: utilitarian · anchor hue: brand-red #C8102E
 *   shape: admin-radius-input 6px / control 8px · shadow: admin-control 0.08
 *   font: Be Vietnam Pro only (single-font admin shell)
 *   diversification: 5 form pages share 1 macrostructure (DEFER to §10)
 *
 * Routing:
 *   /teachers/new        → create mode
 *   /teachers/:id/edit   → edit mode
 *
 * Field count: 9 + UploadZone + 2 toggles (nhiều nhất trong 5 form page).
 * Layout: 2-col grid cho field ngắn, 1-col full cho textarea dài + UploadZone + toggles.
 *
 * Thay thế TeacherFormModal — URL bookmarkable, Back tự nhiên, full-page layout.
 */

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Link2,
  Save,
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
  createTeacher,
  getTeacher,
  getTeacherAvatarUrl,
  listTeacherUserOptions,
  updateTeacher,
  uploadTeacherAvatar,
  type Teacher,
  type TeacherUserOption,
  type UpdateTeacherPayload,
} from "../services/teacherApi";
import styles from "./TeacherFormPage.module.css";

interface FieldErrors {
  fullName?: string;
  title?: string;
  bioShort?: string;
  bio?: string;
  yearsOfExperience?: string;
  specialties?: string;
  displayOrder?: string;
  slug?: string;
  avatar?: string;
}

const MIN_BIO_SHORT = 300;
const MAX_BIO = 5000;

function slugifyClient(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function validateFullName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Vui lòng nhập họ tên";
  if (trimmed.length < 2) return "Họ tên phải có ít nhất 2 ký tự";
  if (trimmed.length > 100) return "Họ tên không quá 100 ký tự";
  return undefined;
}
function validateTitle(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Vui lòng nhập chức danh";
  if (trimmed.length > 150) return "Chức danh không quá 150 ký tự";
  return undefined;
}
function validateBioShort(value: string): string | undefined {
  if (value.length > MIN_BIO_SHORT) return `Mô tả ngắn không quá ${MIN_BIO_SHORT} ký tự`;
  return undefined;
}
function validateBio(value: string): string | undefined {
  if (value.length > MAX_BIO) return `Mô tả chi tiết không quá ${MAX_BIO} ký tự`;
  return undefined;
}
function validateYears(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 80) {
    return "Số năm kinh nghiệm phải là số nguyên 0–80";
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
function validateSlug(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const slugified = slugifyClient(value);
  if (slugified !== value) {
    return "Slug chỉ gồm chữ thường, số và dấu gạch ngang";
  }
  return undefined;
}

function parseSpecialtiesInput(raw: string): string[] {
  return raw
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function TeacherFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // returnTo: URL của list page (kèm search params) do list page truyền qua
  // navigate state. Fallback về "/teachers" nếu user vào thẳng URL này.
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo || "/teachers";
  const isEdit = Boolean(id);
  const toast = useToast();

  // ===== Page state =====
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);

  // ===== Form state =====
  const [fullName, setFullName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [title, setTitle] = useState("");
  const [bioShort, setBioShort] = useState("");
  const [bio, setBio] = useState("");
  const [yearsInput, setYearsInput] = useState("");
  const [specialtiesInput, setSpecialtiesInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [displayOrder, setDisplayOrder] = useState("0");
  const [linkedUserId, setLinkedUserId] = useState<number | "">("");
  const [teacherUserOptions, setTeacherUserOptions] = useState<TeacherUserOption[]>(
    []
  );
  const [linkedUserTouched, setLinkedUserTouched] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // ===== Load teacher (edit mode) =====
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    getTeacher(id)
      .then((t) => {
        if (cancelled) return;
        setCurrentTeacher(t);
        setFullName(t.fullName);
        setSlug(t.slug);
        setSlugTouched(false);
        setTitle(t.title);
        setBioShort(t.bioShort ?? "");
        setBio(t.bio ?? "");
        setYearsInput(
          t.yearsOfExperience != null ? String(t.yearsOfExperience) : ""
        );
        setSpecialtiesInput((t.specialties ?? []).join(", "));
        setAvatarUrl(t.avatarUrl ?? null);
        setIsFeatured(t.isFeatured);
        setIsPublished(t.isPublished);
        setDisplayOrder(String(t.displayOrder ?? 0));
        setLinkedUserId(t.linkedUserId ?? "");
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
          setNotFound(true);
        } else {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Không thể tải thông tin giảng viên."
          );
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  // ===== Load teacher-user options (1 lần) =====
  useEffect(() => {
    if (teacherUserOptions.length > 0) return;
    let cancelled = false;
    listTeacherUserOptions()
      .then((opts) => {
        if (!cancelled) setTeacherUserOptions(opts);
      })
      .catch(() => {
        // Không block UI nếu lỗi
      });
    return () => {
      cancelled = true;
    };
  }, [teacherUserOptions.length]);

  // ===== Auto-suggest slug từ fullName (chỉ create mode, khi chưa sửa tay) =====
  useEffect(() => {
    if (isEdit) return;
    if (slugTouched) return;
    setSlug(slugifyClient(fullName));
  }, [fullName, isEdit, slugTouched]);

  // ===== Document title =====
  useEffect(() => {
    document.title = isEdit
      ? `Sửa giảng viên — Zhong Ruan LMS`
      : `Thêm giảng viên — Zhong Ruan LMS`;
  }, [isEdit]);

  // ===== Navigation =====
  function handleBack() {
    if (isSubmitting) return;
    navigate(returnTo);
  }

  function validateAll(): boolean {
    const next: FieldErrors = {
      fullName: validateFullName(fullName),
      title: validateTitle(title),
      bioShort: validateBioShort(bioShort),
      bio: validateBio(bio),
      yearsOfExperience: validateYears(yearsInput),
      displayOrder: validateDisplayOrder(displayOrder),
      slug: validateSlug(slug),
    };
    if (!specialtiesInput.trim()) {
      next.specialties = "Vui lòng nhập ít nhất 1 chuyên môn";
    }
    setErrors(next);
    return !Object.values(next).some(Boolean);
  }

  async function handleAvatarUpload(file: File) {
    setErrors((p) => ({ ...p, avatar: undefined }));
    setIsUploadingAvatar(true);
    try {
      const { url } = await uploadTeacherAvatar(file);
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

  function handleSpecialtiesKeyDown(_e: KeyboardEvent<HTMLInputElement>) {
    // Cho phép nhập dấu phẩy/chấm phẩm; Enter không submit vì submit button ở footer
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      const specialties = parseSpecialtiesInput(specialtiesInput);
      const yearsNum =
        yearsInput.trim() && Number.isInteger(Number(yearsInput))
          ? Number(yearsInput)
          : null;
      const displayOrderNum =
        displayOrder.trim() && Number.isInteger(Number(displayOrder))
          ? Number(displayOrder)
          : 0;

      if (isEdit && currentTeacher) {
        const payload: UpdateTeacherPayload = {
          fullName: fullName.trim(),
          title: title.trim(),
          bioShort: bioShort.trim(),
          bio: bio.trim(),
          avatarUrl: avatarUrl ?? null,
          yearsOfExperience: yearsNum,
          specialties,
          isFeatured,
          isPublished,
          displayOrder: displayOrderNum,
        };
        if (slug.trim() && slug.trim() !== currentTeacher.slug) {
          payload.slug = slug.trim();
        }
        if (linkedUserTouched) {
          payload.linkedUserId = linkedUserId === "" ? null : linkedUserId;
        }
        await updateTeacher(currentTeacher.id, payload);
        toast.success("Đã cập nhật giảng viên");
        window.dispatchEvent(new CustomEvent("lms:teacher-updated"));
      } else {
        const payload = {
          fullName: fullName.trim(),
          title: title.trim(),
          bioShort: bioShort.trim(),
          bio: bio.trim(),
          avatarUrl: avatarUrl ?? null,
          yearsOfExperience: yearsNum,
          specialties,
          isFeatured,
          isPublished,
          displayOrder: displayOrderNum,
          linkedUserId: linkedUserId === "" ? null : linkedUserId,
          ...(slug.trim() ? { slug: slug.trim() } : {}),
        };
        await createTeacher(payload);
        toast.success("Đã tạo giảng viên");
        window.dispatchEvent(new CustomEvent("lms:teacher-created"));
      }
      navigate(returnTo);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      if (/slug/i.test(message)) {
        setErrors((prev) => ({ ...prev, slug: message }));
      } else {
        toast.error(message);
      }
      setIsSubmitting(false);
    }
  }

  // ===== Loading / 404 / error states =====
  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="rectangular" height={120} />
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
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
          <strong>Không tìm thấy giảng viên.</strong> Có thể đã bị xoá hoặc URL không hợp lệ.
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

  return (
    <div className={styles.page}>
      <PageHeader
        title={isEdit ? "Sửa giảng viên" : "Thêm giảng viên"}
        description={
          isEdit
            ? `Cập nhật thông tin cho ${currentTeacher?.fullName ?? ""}`
            : "Tạo hồ sơ giảng viên mới trong hệ thống"
        }
        breadcrumb={[
          { label: "Quản lý", to: "/dashboard" },
          { label: "Giảng viên", to: "/teachers" },
          { label: isEdit ? "Sửa" : "Thêm mới" },
        ]}
        onBack={handleBack}
      />

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        {/* Row 1: Họ tên + Slug */}
        <div className={styles.grid2}>
          <Input
            label="Họ và tên"
            placeholder="VD: Nguyễn Văn A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.fullName}
            required
            disabled={isSubmitting}
          />
          <Input
            label="Slug"
            placeholder="tu-dong-sinh-tu-ho-ten"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            error={errors.slug}
            hint={
              isEdit
                ? "Để trống nếu muốn giữ nguyên. Slug phải duy nhất."
                : "Để trống để tự sinh từ họ tên. Có thể sửa tay."
            }
            disabled={isSubmitting}
          />
        </div>

        {/* Row 2: Liên kết tài khoản */}
        <div className={styles.field}>
          <label htmlFor="teacher-linked-user" className={styles.label}>
            <Link2 size={14} aria-hidden="true" />
            <span>Liên kết tài khoản (không bắt buộc)</span>
          </label>
          <select
            id="teacher-linked-user"
            className={styles.select}
            value={linkedUserId === "" ? "" : String(linkedUserId)}
            onChange={(e) => {
              const v = e.target.value;
              setLinkedUserId(v === "" ? "" : Number(v));
              setLinkedUserTouched(true);
            }}
            disabled={isSubmitting}
          >
            <option value="">— Không liên kết —</option>
            {teacherUserOptions.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.fullName} — {u.email}
              </option>
            ))}
          </select>
          <span className={styles.hint}>
            Tham chiếu nội bộ tới User có role giáo viên — chỉ để đối chiếu nhanh.
          </span>
        </div>

        {/* Row 3: Chức danh */}
        <Input
          label="Chức danh / Học vị"
          placeholder="VD: Thạc sĩ Ngôn ngữ Trung Quốc"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          required
          disabled={isSubmitting}
        />

        {/* Row 4: Mô tả ngắn + Mô tả chi tiết */}
        <div className={styles.field}>
          <label htmlFor="teacher-bio-short" className={styles.label}>
            Mô tả ngắn
          </label>
          <textarea
            id="teacher-bio-short"
            className={styles.textareaShort}
            placeholder="1–2 câu mô tả ngắn gọn, hiển thị ở card và danh sách"
            value={bioShort}
            onChange={(e) => setBioShort(e.target.value)}
            disabled={isSubmitting}
            rows={2}
          />
          {errors.bioShort ? (
            <span className={styles.fieldError} role="alert">
              {errors.bioShort}
            </span>
          ) : (
            <span className={styles.hint}>
              Tùy chọn. Tối đa 300 ký tự. Hiển thị ở card giảng viên trên trang chủ.
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="teacher-bio" className={styles.label}>
            Mô tả chi tiết
          </label>
          <textarea
            id="teacher-bio"
            className={styles.textarea}
            placeholder="Mô tả đầy đủ về kinh nghiệm, chuyên môn, thành tích..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={isSubmitting}
            rows={4}
          />
          {errors.bio ? (
            <span className={styles.fieldError} role="alert">
              {errors.bio}
            </span>
          ) : (
            <span className={styles.hint}>Tùy chọn. Tối đa 5000 ký tự.</span>
          )}
        </div>

        {/* Row 5: Số năm + Thứ tự */}
        <div className={styles.grid2}>
          <Input
            label="Số năm kinh nghiệm"
            type="number"
            min={0}
            max={80}
            placeholder="VD: 5"
            value={yearsInput}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setYearsInput(e.target.value)
            }
            error={errors.yearsOfExperience}
            hint="Để trống nếu chưa có"
            disabled={isSubmitting}
          />
          <Input
            label="Thứ tự hiển thị"
            type="number"
            min={0}
            max={9999}
            placeholder="0"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            error={errors.displayOrder}
            hint="Số nhỏ hiển thị trước"
            disabled={isSubmitting}
          />
        </div>

        {/* Row 6: Chuyên môn */}
        <div className={styles.field}>
          <label htmlFor="teacher-specialties" className={styles.label}>
            Chuyên môn <span className={styles.required}>*</span>
          </label>
          <input
            id="teacher-specialties"
            type="text"
            className={styles.input}
            placeholder="VD: HSK 4-6, Luyện thi Đại học, Giao tiếp cơ bản"
            value={specialtiesInput}
            onChange={(e) => setSpecialtiesInput(e.target.value)}
            onKeyDown={handleSpecialtiesKeyDown}
            disabled={isSubmitting}
          />
          {errors.specialties ? (
            <span className={styles.fieldError} role="alert">
              {errors.specialties}
            </span>
          ) : (
            <span className={styles.hint}>
              Phân tách bằng dấu phẩy, chấm phẩm hoặc xuống dòng.
              {specialtiesInput.trim()
                ? ` Đã nhập: ${parseSpecialtiesInput(specialtiesInput).length} mục.`
                : ""}
            </span>
          )}
        </div>

        {/* Row 7: Avatar uploader */}
        <div className={styles.field}>
          <span className={styles.label}>Ảnh đại diện</span>
          {avatarPreviewSrc ? (
            <div className={styles.avatarPreview}>
              <img
                src={avatarPreviewSrc}
                alt="Ảnh đại diện"
                className={styles.avatarImg}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<XIcon size={14} />}
                onClick={clearAvatar}
                disabled={isSubmitting || isUploadingAvatar}
              >
                Xoá ảnh
              </Button>
            </div>
          ) : (
            <UploadZone
              multiple={false}
              showQueue={false}
              disabled={isSubmitting || isUploadingAvatar}
              description="Kéo-thả ảnh hoặc bấm để chọn. Hỗ trợ: jpg, jpeg, png. Tối đa 10MB."
              onUpload={handleAvatarUpload}
              onInvalid={(items) => {
                const first = items[0]?.error?.message;
                if (first) {
                  setErrors((p) => ({ ...p, avatar: first }));
                }
              }}
            />
          )}
          {errors.avatar ? (
            <span className={styles.fieldError} role="alert">
              {errors.avatar}
            </span>
          ) : isUploadingAvatar ? (
            <span className={styles.hint}>Đang tải ảnh lên...</span>
          ) : null}
        </div>

        {/* Row 8: Toggles */}
        <div className={styles.toggleRow}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              disabled={isSubmitting}
            />
            <span className={styles.toggleLabel}>
              <strong>Nổi bật</strong>
              <span className={styles.toggleHint}>
                Hiển thị ưu tiên ở trang chủ &amp; landing.
              </span>
            </span>
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              disabled={isSubmitting}
            />
            <span className={styles.toggleLabel}>
              <strong>Xuất bản</strong>
              <span className={styles.toggleHint}>
                Bỏ tick để ẩn khỏi trang public.
              </span>
            </span>
          </label>
        </div>

        {/* Sticky submit footer */}
        <StickyFooter>
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={isSubmitting}
            leftIcon={<XIcon size={16} />}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting || isUploadingAvatar}
            leftIcon={!isSubmitting && !isUploadingAvatar ? <Save size={16} /> : undefined}
          >
            {isEdit ? "Lưu thay đổi" : "Tạo giảng viên"}
          </Button>
        </StickyFooter>
      </form>
    </div>
  );
}

export default TeacherFormPage;
// Silence unused import warnings
void Upload;
void getTeacherAvatarUrl;