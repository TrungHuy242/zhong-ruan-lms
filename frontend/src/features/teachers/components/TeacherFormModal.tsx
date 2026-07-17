/**
 * TeacherFormModal — form tạo/sửa giảng viên (Admin).
 *
 * Pattern: giống UserFormModal (Modal + form stack + Alert + 2 nút footer).
 *
 * - `teacher=null` → chế độ thêm mới.
 * - `teacher!=null` → chế độ sửa.
 *
 * Đặc thù Teacher:
 *   - Slug: tự động sinh từ fullName khi tạo mới (placeholder gợi ý);
 *     nếu user tự sửa tay → BE sẽ check unique và trả lỗi nếu trùng.
 *   - Avatar: dùng lại UploadZone + upload qua API file chung
 *     (POST /upload). Lưu URL trả về vào field `avatarUrl`. KHÔNG viết
 *     upload logic riêng.
 *   - Specialties: input nhập danh sách (mỗi tag 1 dòng hoặc phân tách dấu phẩy).
 *   - Display order: input số, mặc định 0.
 */
import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useState,
} from "react";
import { Alert, Button, Input, Modal, UploadZone } from "../../../shared/components/ui";
import {
  createTeacher,
  getTeacherAvatarUrl,
  listTeacherUserOptions,
  updateTeacher,
  uploadTeacherAvatar,
  type CreateTeacherPayload,
  type Teacher,
  type TeacherUserOption,
  type UpdateTeacherPayload,
} from "../services/teacherApi";
import { ApiError } from "../../../shared/api";
import { ImageIcon, Link2, X as XIcon } from "lucide-react";
import styles from "./TeacherFormModal.module.css";

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

interface TeacherFormModalProps {
  open: boolean;
  teacher: Teacher | null;
  onClose: () => void;
  /** Callback khi tạo/sửa thành công để page refresh & hiện toast. */
  onSuccess: (teacher: Teacher, mode: "create" | "update") => void;
}

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
  const trimmed = value.trim();
  if (!trimmed) return "Vui lòng nhập mô tả ngắn";
  if (trimmed.length > 250) return "Mô tả ngắn không quá 250 ký tự";
  return undefined;
}
function validateBio(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Vui lòng nhập mô tả chi tiết";
  if (trimmed.length > 5000) return "Mô tả chi tiết không quá 5000 ký tự";
  return undefined;
}
function validateYears(value: string): string | undefined {
  if (!value.trim()) return undefined; // optional
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
  if (!value.trim()) return undefined; // optional khi tạo
  const slugified = slugifyClient(value);
  if (slugified !== value) {
    return "Slug chỉ gồm chữ thường, số và dấu gạch ngang";
  }
  return undefined;
}

/**
 * Parse "tag1, tag2; tag3\ntag4" → ["tag1", "tag2", "tag3", "tag4"].
 * Cho phép phân tách bằng dấu phẩy, chấm phẩy, hoặc xuống dòng.
 */
function parseSpecialtiesInput(raw: string): string[] {
  return raw
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function TeacherFormModal({
  open,
  teacher,
  onClose,
  onSuccess,
}: TeacherFormModalProps) {
  const isEdit = Boolean(teacher);

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
  const [teacherUserOptions, setTeacherUserOptions] = useState<TeacherUserOption[]>([]);
  const [linkedUserTouched, setLinkedUserTouched] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Mỗi lần mở modal → reset từ props (tránh giữ data teacher cũ).
  useEffect(() => {
    if (!open) return;
    setFullName(teacher?.fullName ?? "");
    setSlug(teacher?.slug ?? "");
    setSlugTouched(false);
    setTitle(teacher?.title ?? "");
    setBioShort(teacher?.bioShort ?? "");
    setBio(teacher?.bio ?? "");
    setYearsInput(
      teacher?.yearsOfExperience != null ? String(teacher.yearsOfExperience) : ""
    );
    setSpecialtiesInput((teacher?.specialties ?? []).join(", "));
    setAvatarUrl(teacher?.avatarUrl ?? null);
    setIsFeatured(teacher?.isFeatured ?? false);
    setIsPublished(teacher?.isPublished ?? true);
    setDisplayOrder(
      teacher?.displayOrder != null ? String(teacher.displayOrder) : "0"
    );
    setLinkedUserId(teacher?.linkedUserId ?? "");
    setLinkedUserTouched(false);
    setErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
    setIsUploadingAvatar(false);
  }, [open, teacher]);

  // Load danh sách user role=TEACHER cho dropdown "Liên kết tài khoản".
  // Fetch MỘT LẦN khi modal mở lần đầu (không refetch khi đã có data).
  useEffect(() => {
    if (!open) return;
    if (teacherUserOptions.length > 0) return;
    let cancelled = false;
    listTeacherUserOptions()
      .then((opts) => {
        if (!cancelled) setTeacherUserOptions(opts);
      })
      .catch(() => {
        // Không block UI nếu lỗi — dropdown vẫn dùng được với 0 option.
      });
    return () => {
      cancelled = true;
    };
  }, [open, teacherUserOptions.length]);

  // Tự sinh slug gợi ý từ fullName khi tạo mới (chỉ khi user chưa sửa tay).
  useEffect(() => {
    if (!open) return;
    if (isEdit) return;
    if (slugTouched) return;
    setSlug(slugifyClient(fullName));
  }, [fullName, open, isEdit, slugTouched]);

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
    // Cho phép nhập dấu phẩy/chấm phẩy thoải mái; Enter cũng OK vì không submit form
    // từ input này (nút submit ở footer).
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);
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

      let result: Teacher;
      if (isEdit && teacher) {
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
        // Slug: nếu user đã sửa khác giá trị ban đầu → gửi, BE check unique.
        if (slug.trim() && slug.trim() !== teacher.slug) {
          payload.slug = slug.trim();
        }
        // Liên kết User:
        //   - linkedUserTouched=false (chưa đụng) → undefined (giữ nguyên DB)
        //   - linkedUserTouched=true → truyền giá trị mới (number hoặc null)
        if (linkedUserTouched) {
          payload.linkedUserId = linkedUserId === "" ? null : linkedUserId;
        }
        result = await updateTeacher(teacher.id, payload);
        onSuccess(result, "update");
      } else {
        const payload: CreateTeacherPayload = {
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
          // Create: undefined khi không chọn → BE sẽ gán null.
          linkedUserId: linkedUserId === "" ? null : linkedUserId,
        };
        if (slug.trim()) payload.slug = slug.trim();
        result = await createTeacher(payload);
        onSuccess(result, "create");
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      // Map lỗi slug về field slug nếu BE trả message liên quan slug
      if (/slug/i.test(message)) {
        setErrors((prev) => ({ ...prev, slug: message }));
      } else {
        setSubmitError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Xem trước URL từ avatarUrl: nếu là URL /uploads/... → giữ nguyên;
  // nếu là absolute URL → giữ nguyên.
  const avatarPreviewSrc = avatarUrl
    ? avatarUrl.startsWith("/uploads/")
      ? avatarUrl
      : avatarUrl
    : null;

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? () => undefined : onClose}
      title={isEdit ? "Sửa giảng viên" : "Thêm giảng viên"}
      size="lg"
    >
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        {submitError ? (
          <Alert variant="error" onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        ) : null}

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
                ? "Để trống nếu muốn giữ nguyên. Slug phải duy nhất trong hệ thống."
                : "Để trống để tự sinh từ họ tên. Có thể sửa tay — slug phải duy nhất."
            }
            disabled={isSubmitting}
          />
        </div>

        {/* ===== Liên kết tài khoản (optional) ===== */}
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
            Không tự động đồng bộ tên/email vào các trường phía trên.
          </span>
        </div>

        <Input
          label="Chức danh / Học vị"
          placeholder="VD: Thạc sĩ Ngôn ngữ Trung Quốc"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          required
          disabled={isSubmitting}
        />

        <div className={styles.field}>
          <label htmlFor="teacher-bio-short" className={styles.label}>
            Mô tả ngắn <span className={styles.required}>*</span>
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
              Tối đa 250 ký tự. Hiển thị ở card giảng viên trên trang chủ.
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="teacher-bio" className={styles.label}>
            Mô tả chi tiết <span className={styles.required}>*</span>
          </label>
          <textarea
            id="teacher-bio"
            className={styles.textarea}
            placeholder="Mô tả đầy đủ về kinh nghiệm, chuyên môn, thành tích..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={isSubmitting}
            rows={6}
          />
          {errors.bio ? (
            <span className={styles.fieldError} role="alert">
              {errors.bio}
            </span>
          ) : (
            <span className={styles.hint}>Tối đa 5000 ký tự.</span>
          )}
        </div>

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
              Phân tách bằng dấu phẩy, chấm phẩy hoặc xuống dòng.
              {specialtiesInput.trim()
                ? ` Đã nhập: ${parseSpecialtiesInput(specialtiesInput).length} mục.`
                : ""}
            </span>
          )}
        </div>

        {/* ===== Avatar uploader ===== */}
        <div className={styles.field}>
          <span className={styles.label}>Ảnh đại diện</span>
          {avatarPreviewSrc ? (
            <div className={styles.avatarPreview}>
              <img
                src={avatarPreviewSrc}
                alt="Ảnh đại diện"
                className={styles.avatarImg}
                onError={(e) => {
                  // Fallback khi URL lỗi → ẩn ảnh
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

        {/* ===== Toggles ===== */}
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

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting || isUploadingAvatar}
          >
            {isEdit ? "Lưu thay đổi" : "Tạo giảng viên"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Export helper để caller (nếu cần) dùng, tránh warning unused
void ImageIcon;
void getTeacherAvatarUrl;
void slugifyClient;