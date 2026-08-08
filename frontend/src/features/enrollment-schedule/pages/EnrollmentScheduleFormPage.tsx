/**
 * EnrollmentScheduleFormPage — trang tạo/sửa lịch khai giảng (Admin).
 *
 * Hallmark stamp:
 *   macrostructure: form-led · genre: modern-minimal · theme: design-system-locked (DESIGN.md §10)
 *   tone: utilitarian · anchor hue: brand-red #C8102E
 *   shape: admin-radius-input 6px / control 8px · shadow: admin-control 0.08
 *   font: Be Vietnam Pro only (single-font admin shell)
 *   diversification: 5 form pages share 1 macrostructure (DEFER to §10)
 *
 * Routing:
 *   /enrollment-schedule/new            → create mode
 *   /enrollment-schedule/:id/edit       → edit mode
 *
 * Đặc thù EnrollmentSchedule:
 *   - Singleton-style: nhiều bản ghi published, ưu tiên theo displayOrder.
 *   - Tag-input cho coursesEnrolling + phoneNumbers (Enter để thêm, nút xoá từng dòng).
 *   - 3 khung giờ (sáng/chiều/tối) + 2 nhóm lịch (A/B) + CTA text/link.
 *   - displayOrder để sắp xếp thứ tự ưu tiên.
 *
 * Thay thế EnrollmentScheduleFormModal — URL bookmarkable, Back tự nhiên, full-page layout.
 */

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, X as XIcon } from "lucide-react";
import {
  Alert,
  Button,
  Input,
  Skeleton,
} from "../../../shared/components/ui";
import {
  PageHeader,
  StickyFooter,
} from "../../../shared/components/layout";
import { useToast } from "../../../shared/contexts/ToastContext";
import { ApiError } from "../../../shared/api";
import {
  createEnrollmentSchedule,
  getEnrollmentScheduleById,
  updateEnrollmentSchedule,
  type EnrollmentSchedule,
  type EnrollmentSchedulePayload,
} from "../services/enrollmentScheduleApi";
import styles from "./EnrollmentScheduleFormPage.module.css";

interface FieldErrors {
  title?: string;
  morningTimes?: string;
  afternoonTimes?: string;
  eveningTimes?: string;
  scheduleGroupA?: string;
  scheduleGroupB?: string;
  ctaText?: string;
  ctaLink?: string;
  coursesEnrolling?: string;
  phoneNumbers?: string;
  displayOrder?: string;
}

interface FormState {
  title: string;
  tagline: string;
  coursesEnrolling: string[];
  newCourse: string;
  morningTimes: string;
  afternoonTimes: string;
  eveningTimes: string;
  scheduleGroupA: string;
  scheduleGroupB: string;
  note: string;
  ctaText: string;
  ctaLink: string;
  phoneNumbers: string[];
  newPhone: string;
  isPublished: boolean;
  displayOrder: number;
}

function emptyForm(): FormState {
  return {
    title: "",
    tagline: "",
    coursesEnrolling: [],
    newCourse: "",
    morningTimes: "",
    afternoonTimes: "",
    eveningTimes: "",
    scheduleGroupA: "",
    scheduleGroupB: "",
    note: "",
    ctaText: "",
    ctaLink: "",
    phoneNumbers: [],
    newPhone: "",
    isPublished: true,
    displayOrder: 0,
  };
}

function fromSchedule(s: EnrollmentSchedule): FormState {
  return {
    title: s.title ?? "",
    tagline: s.tagline ?? "",
    coursesEnrolling: Array.isArray(s.coursesEnrolling) ? [...s.coursesEnrolling] : [],
    newCourse: "",
    morningTimes: s.morningTimes ?? "",
    afternoonTimes: s.afternoonTimes ?? "",
    eveningTimes: s.eveningTimes ?? "",
    scheduleGroupA: s.scheduleGroupA ?? "",
    scheduleGroupB: s.scheduleGroupB ?? "",
    note: s.note ?? "",
    ctaText: s.ctaText ?? "",
    ctaLink: s.ctaLink ?? "",
    phoneNumbers: Array.isArray(s.phoneNumbers) ? [...s.phoneNumbers] : [],
    newPhone: "",
    isPublished: Boolean(s.isPublished),
    displayOrder: Number.isFinite(s.displayOrder) ? s.displayOrder : 0,
  };
}

function validateText(value: string, fieldName: string): string | undefined {
  return value.trim() ? undefined : `${fieldName} là bắt buộc`;
}

function validateDisplayOrder(value: number): string | undefined {
  if (!Number.isFinite(value) || value < 0) {
    return "Thứ tự phải là số không âm";
  }
  return undefined;
}

export function EnrollmentScheduleFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isEdit = Boolean(id);
  // returnTo: URL của list page (kèm search params) do list page truyền qua
  // navigate state. Fallback về "/enrollment-schedule" nếu user vào thẳng URL này.
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ||
    "/enrollment-schedule";

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // ===== Document title =====
  useEffect(() => {
    document.title = isEdit
      ? "Sửa lịch khai giảng — Zhong Ruan LMS"
      : "Tạo lịch khai giảng — Zhong Ruan LMS";
  }, [isEdit]);

  // ===== Load edit data =====
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const schedule = await getEnrollmentScheduleById(id);
        if (!cancelled) {
          setForm(fromSchedule(schedule));
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setLoadError(
            err instanceof ApiError ? err.message : "Không thể tải dữ liệu"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const setField = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field as string]: undefined }));
  };

  const addCourse = () => {
    const v = form.newCourse.trim();
    if (!v) return;
    setForm((prev) => ({
      ...prev,
      coursesEnrolling: [...prev.coursesEnrolling, v],
      newCourse: "",
    }));
    setErrors((prev) => ({ ...prev, coursesEnrolling: undefined }));
  };

  const removeCourse = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      coursesEnrolling: prev.coursesEnrolling.filter((_, i) => i !== idx),
    }));
    setErrors((prev) => ({ ...prev, coursesEnrolling: undefined }));
  };

  const addPhone = () => {
    const v = form.newPhone.trim();
    if (!v) return;
    setForm((prev) => ({
      ...prev,
      phoneNumbers: [...prev.phoneNumbers, v],
      newPhone: "",
    }));
    setErrors((prev) => ({ ...prev, phoneNumbers: undefined }));
  };

  const removePhone = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== idx),
    }));
    setErrors((prev) => ({ ...prev, phoneNumbers: undefined }));
  };

  const handleCourseKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCourse();
    }
  };

  const handlePhoneKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPhone();
    }
  };

  function handleBack() {
    if (submitting) return;
    navigate(`${returnTo}${returnTo.includes("?") ? "&" : "?"}refresh=1`);
  }

  function validateAll(): boolean {
    const pendingCourse = form.newCourse.trim();
    const pendingPhone = form.newPhone.trim();
    const coursesEnrolling = pendingCourse
      ? [...form.coursesEnrolling, pendingCourse]
      : form.coursesEnrolling;
    const phoneNumbers = pendingPhone
      ? [...form.phoneNumbers, pendingPhone]
      : form.phoneNumbers;

    const next: FieldErrors = {
      title: validateText(form.title, "Tiêu đề"),
      morningTimes: validateText(form.morningTimes, "Khung giờ sáng"),
      afternoonTimes: validateText(form.afternoonTimes, "Khung giờ chiều"),
      eveningTimes: validateText(form.eveningTimes, "Khung giờ tối"),
      scheduleGroupA: validateText(form.scheduleGroupA, "Nhóm lịch A"),
      scheduleGroupB: validateText(form.scheduleGroupB, "Nhóm lịch B"),
      ctaText: validateText(form.ctaText, "Text nút CTA"),
      ctaLink: validateText(form.ctaLink, "Link nút CTA"),
      coursesEnrolling:
        coursesEnrolling.length === 0
          ? "Cần ít nhất 1 khóa đang tuyển sinh"
          : undefined,
      phoneNumbers:
        phoneNumbers.length === 0
          ? "Cần ít nhất 1 số điện thoại"
          : undefined,
      displayOrder: validateDisplayOrder(Number(form.displayOrder)),
    };
    setErrors(next);
    return !Object.values(next).some((v) => v);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (!validateAll()) return;

    const pendingCourse = form.newCourse.trim();
    const pendingPhone = form.newPhone.trim();
    const coursesEnrolling = pendingCourse
      ? [...form.coursesEnrolling, pendingCourse]
      : form.coursesEnrolling;
    const phoneNumbers = pendingPhone
      ? [...form.phoneNumbers, pendingPhone]
      : form.phoneNumbers;

    const payload: EnrollmentSchedulePayload = {
      title: form.title.trim(),
      tagline: form.tagline.trim() || null,
      coursesEnrolling,
      morningTimes: form.morningTimes.trim(),
      afternoonTimes: form.afternoonTimes.trim(),
      eveningTimes: form.eveningTimes.trim(),
      scheduleGroupA: form.scheduleGroupA.trim(),
      scheduleGroupB: form.scheduleGroupB.trim(),
      note: form.note.trim() || null,
      ctaText: form.ctaText.trim(),
      ctaLink: form.ctaLink.trim(),
      phoneNumbers,
      isPublished: form.isPublished,
      displayOrder: Number(form.displayOrder),
    };

    setSubmitting(true);
    try {
      if (isEdit && id) {
        await updateEnrollmentSchedule(id, payload);
        toast.success("Cập nhật lịch khai giảng thành công");
        window.dispatchEvent(new CustomEvent("lms:enrollment-updated"));
      } else {
        await createEnrollmentSchedule(payload);
        toast.success("Tạo lịch khai giảng thành công");
        window.dispatchEvent(new CustomEvent("lms:enrollment-created"));
      }
      navigate(`${returnTo}${returnTo.includes("?") ? "&" : "?"}refresh=1`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Lỗi không xác định"
      );
      setSubmitting(false);
    }
  }

  // ===== Loading skeleton (edit mode only) =====
  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Đang tải..."
          description="Vui lòng chờ trong giây lát"
        />
        <div className={styles.form}>
          <Skeleton variant="rectangular" width="100%" height={48} />
          <Skeleton variant="rectangular" width="100%" height={48} />
          <Skeleton variant="rectangular" width="100%" height={48} />
          <Skeleton variant="rectangular" width="100%" height={48} />
          <Skeleton variant="rectangular" width="100%" height={120} />
        </div>
      </div>
    );
  }

  // ===== 404 =====
  if (notFound) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Không tìm thấy lịch khai giảng"
          description="Bản ghi có thể đã bị xoá hoặc không tồn tại"
          onBack={handleBack}
        />
        <Alert variant="warning">
          Bản ghi lịch khai giảng này không tồn tại hoặc đã được chuyển vào thùng rác.
        </Alert>
      </div>
    );
  }

  // ===== Load error =====
  if (loadError) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Lỗi tải dữ liệu"
          description={loadError}
          onBack={handleBack}
        />
        <button
          type="button"
          className={styles.retryBtn}
          onClick={() => {
            setLoadError(null);
            setLoading(true);
            if (id) {
              getEnrollmentScheduleById(id)
                .then((s) => setForm(fromSchedule(s)))
                .catch((err) => {
                  if (err instanceof ApiError && err.status === 404) {
                    setNotFound(true);
                  } else {
                    setLoadError(
                      err instanceof ApiError ? err.message : "Không thể tải dữ liệu"
                    );
                  }
                })
                .finally(() => setLoading(false));
            }
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={isEdit ? "Sửa lịch khai giảng" : "Tạo lịch khai giảng mới"}
        description={
          isEdit
            ? "Cập nhật nội dung banner lịch khai giảng hiển thị trên trang chủ"
            : "Tạo mới một bản ghi lịch khai giảng cho trang chủ Public"
        }
        breadcrumb={[
          { label: "Quản lý", to: "/dashboard" },
          { label: "Lịch khai giảng", to: "/enrollment-schedule" },
          { label: isEdit ? "Sửa" : "Tạo mới" },
        ]}
        onBack={handleBack}
      />

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        {/* Tiêu đề + Tagline */}
        <div className={styles.row}>
          <div className={styles.field}>
            <Input
              label="Tiêu đề"
              placeholder='VD: "Lịch khai giảng mỗi tuần"'
              value={form.title}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("title", e.target.value)
              }
              error={errors.title}
              required
              disabled={submitting}
            />
          </div>
          <div className={styles.field}>
            <Input
              label="Tagline (tuỳ chọn)"
              placeholder='VD: "Tuyển sinh liên tục trong tuần"'
              value={form.tagline}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("tagline", e.target.value)
              }
              disabled={submitting}
            />
          </div>
        </div>

        {/* coursesEnrolling tag input */}
        <div className={styles.tagInput}>
          <label className={styles.label}>
            Khóa đang tuyển sinh <span className={styles.required}>*</span>
          </label>
          <div
            className={`${styles.tagList} ${
              errors.coursesEnrolling ? styles.tagListError : ""
            }`}
          >
            {form.coursesEnrolling.length === 0 ? (
              <span className={styles.tagPlaceholder}>
                Chưa có khóa nào — gõ bên dưới rồi nhấn Enter để thêm.
              </span>
            ) : (
              form.coursesEnrolling.map((c, idx) => (
                <span key={`${c}-${idx}`} className={styles.tag}>
                  {c}
                  <button
                    type="button"
                    className={styles.tagRemove}
                    onClick={() => removeCourse(idx)}
                    aria-label={`Xoá ${c}`}
                    disabled={submitting}
                  >
                    <XIcon size={12} />
                  </button>
                </span>
              ))
            )}
          </div>
          <div className={styles.tagInputRow}>
            <input
              id="enroll-new-course"
              name="newCourse"
              className={styles.tagInputControl}
              value={form.newCourse}
              onChange={(e) => setField("newCourse", e.target.value)}
              onKeyDown={handleCourseKey}
              placeholder='VD: "Sơ cấp (0-HSK2)" → Enter để thêm'
              disabled={submitting}
              aria-label="Tên khóa mới"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addCourse}
              disabled={submitting || !form.newCourse.trim()}
            >
              Thêm
            </Button>
          </div>
          {errors.coursesEnrolling ? (
            <span className={styles.fieldError} role="alert">
              {errors.coursesEnrolling}
            </span>
          ) : (
            <span className={styles.tagHint}>
              Gõ tên khóa và nhấn Enter (hoặc bấm nút Thêm). Mỗi khóa hiển thị 1 dòng riêng.
            </span>
          )}
        </div>

        {/* 3 khung giờ */}
        <div className={styles.row}>
          <div className={styles.field}>
            <Input
              label="Khung giờ sáng"
              placeholder='VD: "8h30 - 10h00 · 10h15 - 11h45"'
              value={form.morningTimes}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("morningTimes", e.target.value)
              }
              error={errors.morningTimes}
              required
              disabled={submitting}
            />
          </div>
          <div className={styles.field}>
            <Input
              label="Khung giờ chiều"
              placeholder='VD: "14h00 - 15h30 · 15h45 - 17h15"'
              value={form.afternoonTimes}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("afternoonTimes", e.target.value)
              }
              error={errors.afternoonTimes}
              required
              disabled={submitting}
            />
          </div>
          <div className={styles.field}>
            <Input
              label="Khung giờ tối"
              placeholder='VD: "19h00 - 20h30 · 20h45 - 22h15"'
              value={form.eveningTimes}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("eveningTimes", e.target.value)
              }
              error={errors.eveningTimes}
              required
              disabled={submitting}
            />
          </div>
        </div>

        {/* 2 nhóm lịch */}
        <div className={styles.row}>
          <div className={styles.field}>
            <Input
              label="Nhóm lịch A"
              placeholder='VD: "Thứ 2 - 4 - 6"'
              value={form.scheduleGroupA}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("scheduleGroupA", e.target.value)
              }
              error={errors.scheduleGroupA}
              required
              disabled={submitting}
            />
          </div>
          <div className={styles.field}>
            <Input
              label="Nhóm lịch B"
              placeholder='VD: "Thứ 3 - 5 - 7"'
              value={form.scheduleGroupB}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("scheduleGroupB", e.target.value)
              }
              error={errors.scheduleGroupB}
              required
              disabled={submitting}
            />
          </div>
        </div>

        {/* Ghi chú */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="enroll-note">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            id="enroll-note"
            className={styles.textarea}
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
            placeholder='VD: "Riêng các lớp kèm 1-1 có thể học linh hoạt theo nhu cầu"'
            rows={3}
            disabled={submitting}
          />
        </div>

        {/* CTA Text + CTA Link */}
        <div className={styles.row}>
          <div className={styles.field}>
            <Input
              label="Text nút CTA"
              placeholder='VD: "Đăng ký ngay"'
              value={form.ctaText}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("ctaText", e.target.value)
              }
              error={errors.ctaText}
              required
              disabled={submitting}
            />
          </div>
          <div className={styles.field}>
            <Input
              label="Link nút CTA"
              placeholder="/register hoặc https://..."
              value={form.ctaLink}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("ctaLink", e.target.value)
              }
              error={errors.ctaLink}
              required
              disabled={submitting}
            />
          </div>
        </div>

        {/* Số điện thoại */}
        <div className={styles.tagInput}>
          <label className={styles.label}>
            Số điện thoại liên hệ <span className={styles.required}>*</span>
          </label>
          <div
            className={`${styles.tagList} ${
              errors.phoneNumbers ? styles.tagListError : ""
            }`}
          >
            {form.phoneNumbers.length === 0 ? (
              <span className={styles.tagPlaceholder}>
                Chưa có số điện thoại nào.
              </span>
            ) : (
              form.phoneNumbers.map((p, idx) => (
                <span key={`${p}-${idx}`} className={styles.tag}>
                  {p}
                  <button
                    type="button"
                    className={styles.tagRemove}
                    onClick={() => removePhone(idx)}
                    aria-label={`Xoá ${p}`}
                    disabled={submitting}
                  >
                    <XIcon size={12} />
                  </button>
                </span>
              ))
            )}
          </div>
          <div className={styles.tagInputRow}>
            <input
              id="enroll-new-phone"
              name="newPhone"
              className={styles.tagInputControl}
              value={form.newPhone}
              onChange={(e) => setField("newPhone", e.target.value)}
              onKeyDown={handlePhoneKey}
              placeholder='VD: "0979949145" → Enter để thêm'
              disabled={submitting}
              aria-label="Số điện thoại mới"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addPhone}
              disabled={submitting || !form.newPhone.trim()}
            >
              Thêm
            </Button>
          </div>
          {errors.phoneNumbers ? (
            <span className={styles.fieldError} role="alert">
              {errors.phoneNumbers}
            </span>
          ) : (
            <span className={styles.tagHint}>
              Gõ số điện thoại và nhấn Enter. Số này sẽ hiển thị dạng tel: trên Public.
            </span>
          )}
        </div>

        {/* isPublished + displayOrder */}
        <div className={styles.row}>
          <div className={styles.fieldSmall}>
            <Input
              type="number"
              min={0}
              label="Thứ tự hiển thị"
              value={String(form.displayOrder)}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("displayOrder", Number(e.target.value))
              }
              error={errors.displayOrder}
              disabled={submitting}
            />
            <span className={styles.tagHint}>
              Số nhỏ hơn = ưu tiên cao hơn khi nhiều bản ghi published.
            </span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Xuất bản</label>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>
                <input
                  id="enroll-is-published"
                  type="checkbox"
                  name="isPublished"
                  checked={form.isPublished}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setField("isPublished", e.target.checked)
                  }
                  className={styles.toggle}
                  disabled={submitting}
                />
                <span>Hiển thị trên trang Public</span>
              </label>
            </div>
          </div>
        </div>

        <StickyFooter>
          <Button
            variant="secondary"
            type="button"
            onClick={handleBack}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
            leftIcon={!submitting ? <Save size={16} /> : undefined}
          >
            {isEdit ? "Lưu thay đổi" : "Tạo lịch khai giảng"}
          </Button>
        </StickyFooter>
      </form>
    </div>
  );
}

export default EnrollmentScheduleFormPage;
// ArrowLeft unused — kept import for future 404 use
void ArrowLeft;