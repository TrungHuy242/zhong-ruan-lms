/**
 * EnrollmentScheduleFormModal — form tạo/sửa lịch khai giảng (Admin).
 *
 * Tag-input cho coursesEnrolling + phoneNumbers (Enter để thêm, nút xoá từng dòng).
 * 3 khung giờ + 2 nhóm lịch: input text tự do (không ép format cứng — nghiệp vụ cho phép).
 * Validate client: title/morningTimes/afternoonTimes/eveningTimes/scheduleGroupA/B/ctaText/ctaLink
 * bắt buộc; coursesEnrolling + phoneNumbers tối thiểu 1 phần tử (không rỗng); ctaLink phải
 * bắt đầu bằng "/" hoặc "https://"; displayOrder >= 0.
 */

import { ChangeEvent, FormEvent, KeyboardEvent, useState } from "react";
import {
  Button,
  Input,
  Modal,
} from "../../../shared/components/ui";
import {
  createEnrollmentSchedule,
  updateEnrollmentSchedule,
  type EnrollmentSchedule,
  type EnrollmentSchedulePayload,
} from "../services/enrollmentScheduleApi";
import { ApiError } from "../../../shared/api";
import { useToast } from "../../../shared/contexts/ToastContext";
import styles from "./EnrollmentScheduleFormModal.module.css";

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

interface EnrollmentScheduleFormModalProps {
  schedule?: EnrollmentSchedule | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormState {
  title: string;
  tagline: string;
  coursesEnrolling: string[]; // tag list (entries being typed stay separate)
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

export function EnrollmentScheduleFormModal({
  schedule,
  onClose,
  onSuccess,
}: EnrollmentScheduleFormModalProps) {
  const isEdit = Boolean(schedule);

  const [form, setForm] = useState<FormState>(
    () => (schedule ? fromSchedule(schedule) : emptyForm())
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Nếu user gõ vào ô newCourse/newPhone mà chưa bấm Enter, vẫn commit vào list.
    const pendingCourse = form.newCourse.trim();
    const pendingPhone = form.newPhone.trim();
    const coursesEnrolling = pendingCourse
      ? [...form.coursesEnrolling, pendingCourse]
      : form.coursesEnrolling;
    const phoneNumbers = pendingPhone
      ? [...form.phoneNumbers, pendingPhone]
      : form.phoneNumbers;

    // Re-validate after pending additions.
    if (
      coursesEnrolling.length === 0 ||
      phoneNumbers.length === 0 ||
      !form.title.trim() ||
      !form.morningTimes.trim() ||
      !form.afternoonTimes.trim() ||
      !form.eveningTimes.trim() ||
      !form.scheduleGroupA.trim() ||
      !form.scheduleGroupB.trim() ||
      !form.ctaText.trim() ||
      !form.ctaLink.trim() ||
      !Number.isFinite(Number(form.displayOrder)) ||
      Number(form.displayOrder) < 0
    ) {
      setErrors({
        title: form.title.trim() ? undefined : "Tiêu đề là bắt buộc",
        morningTimes: form.morningTimes.trim() ? undefined : "Khung giờ sáng là bắt buộc",
        afternoonTimes: form.afternoonTimes.trim() ? undefined : "Khung giờ chiều là bắt buộc",
        eveningTimes: form.eveningTimes.trim() ? undefined : "Khung giờ tối là bắt buộc",
        scheduleGroupA: form.scheduleGroupA.trim() ? undefined : "Nhóm lịch A là bắt buộc",
        scheduleGroupB: form.scheduleGroupB.trim() ? undefined : "Nhóm lịch B là bắt buộc",
        ctaText: form.ctaText.trim() ? undefined : "Text nút CTA là bắt buộc",
        ctaLink: form.ctaLink.trim() ? undefined : "Link nút CTA là bắt buộc",
        coursesEnrolling:
          coursesEnrolling.length === 0 ? "Cần ít nhất 1 khóa đang tuyển sinh" : undefined,
        phoneNumbers:
          phoneNumbers.length === 0 ? "Cần ít nhất 1 số điện thoại" : undefined,
        displayOrder:
          !Number.isFinite(Number(form.displayOrder)) || Number(form.displayOrder) < 0
            ? "Thứ tự phải là số không âm"
            : undefined,
      });
      return;
    }

    setSubmitting(true);
    try {
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
      if (isEdit && schedule) {
        await updateEnrollmentSchedule(schedule.id, payload);
      } else {
        await createEnrollmentSchedule(payload);
      }
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Lỗi không xác định"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Sửa lịch khai giảng" : "Thêm lịch khai giảng"}
      size="lg"
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>

        {/* Tiêu đề + Tagline */}
        <div className={styles.field}>
          <label className={styles.label}>
            Tiêu đề <span className={styles.required}>*</span>
          </label>
          <Input
            value={form.title}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setField("title", e.target.value)
            }
            placeholder='VD: "Lịch khai giảng mỗi tuần"'
            error={errors.title}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Tagline (tuỳ chọn)</label>
          <Input
            value={form.tagline}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setField("tagline", e.target.value)
            }
            placeholder='VD: "Tuyển sinh liên tục trong tuần"'
          />
        </div>

        {/* coursesEnrolling tag input */}
        <div className={styles.tagInput}>
          <label className={styles.label}>
            Khóa đang tuyển sinh <span className={styles.required}>*</span>
          </label>
          <div className={styles.tagList}>
            {form.coursesEnrolling.map((c, idx) => (
              <span key={`${c}-${idx}`} className={styles.tag}>
                {c}
                <button
                  type="button"
                  className={styles.tagRemove}
                  onClick={() => removeCourse(idx)}
                  aria-label={`Xoá ${c}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className={styles.tagInputRow}>
            <Input
              value={form.newCourse}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("newCourse", e.target.value)
              }
              onKeyDown={handleCourseKey}
              placeholder='VD: "Sơ cấp (0-HSK2)" → Enter để thêm'
              error={errors.coursesEnrolling}
            />
            <Button type="button" variant="secondary" onClick={addCourse}>
              Thêm
            </Button>
          </div>
          <p className={styles.tagHint}>
            Gõ tên khóa và nhấn Enter (hoặc bấm nút Thêm). Mỗi khóa hiển thị 1 dòng riêng.
          </p>
        </div>

        {/* 3 khung giờ */}
        <div className={styles.field}>
          <label className={styles.label}>
            Khung giờ sáng <span className={styles.required}>*</span>
          </label>
          <Input
            value={form.morningTimes}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setField("morningTimes", e.target.value)
            }
            placeholder='VD: "8h30 - 10h00 · 10h15 - 11h45"'
            error={errors.morningTimes}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>
            Khung giờ chiều <span className={styles.required}>*</span>
          </label>
          <Input
            value={form.afternoonTimes}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setField("afternoonTimes", e.target.value)
            }
            placeholder='VD: "14h00 - 15h30 · 15h45 - 17h15"'
            error={errors.afternoonTimes}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>
            Khung giờ tối <span className={styles.required}>*</span>
          </label>
          <Input
            value={form.eveningTimes}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setField("eveningTimes", e.target.value)
            }
            placeholder='VD: "19h00 - 20h30 · 20h45 - 22h15"'
            error={errors.eveningTimes}
          />
        </div>

        {/* 2 nhóm lịch */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>
              Nhóm lịch A <span className={styles.required}>*</span>
            </label>
            <Input
              value={form.scheduleGroupA}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("scheduleGroupA", e.target.value)
              }
              placeholder='VD: "Thứ 2 - 4 - 6"'
              error={errors.scheduleGroupA}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              Nhóm lịch B <span className={styles.required}>*</span>
            </label>
            <Input
              value={form.scheduleGroupB}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("scheduleGroupB", e.target.value)
              }
              placeholder='VD: "Thứ 3 - 5 - 7"'
              error={errors.scheduleGroupB}
            />
          </div>
        </div>

        {/* Ghi chú */}
        <div className={styles.field}>
          <label className={styles.label}>Ghi chú (tuỳ chọn)</label>
          <textarea
            className={styles.textarea}
            value={form.note}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setField("note", e.target.value)
            }
            placeholder='VD: "Riêng các lớp kèm 1-1 có thể học linh hoạt theo nhu cầu"'
            rows={2}
          />
        </div>

        {/* CTA Text + CTA Link */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>
              Text nút CTA <span className={styles.required}>*</span>
            </label>
            <Input
              value={form.ctaText}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("ctaText", e.target.value)
              }
              placeholder='VD: "Đăng ký ngay"'
              error={errors.ctaText}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>
              Link nút CTA <span className={styles.required}>*</span>
            </label>
            <Input
              value={form.ctaLink}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("ctaLink", e.target.value)
              }
              placeholder="/register hoặc https://..."
              error={errors.ctaLink}
            />
          </div>
        </div>

        {/* Số điện thoại */}
        <div className={styles.tagInput}>
          <label className={styles.label}>
            Số điện thoại liên hệ <span className={styles.required}>*</span>
          </label>
          <div className={styles.tagList}>
            {form.phoneNumbers.map((p, idx) => (
              <span key={`${p}-${idx}`} className={styles.tag}>
                {p}
                <button
                  type="button"
                  className={styles.tagRemove}
                  onClick={() => removePhone(idx)}
                  aria-label={`Xoá ${p}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className={styles.tagInputRow}>
            <Input
              value={form.newPhone}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("newPhone", e.target.value)
              }
              onKeyDown={handlePhoneKey}
              placeholder='VD: "0979949145" → Enter để thêm'
              error={errors.phoneNumbers}
            />
            <Button type="button" variant="secondary" onClick={addPhone}>
              Thêm
            </Button>
          </div>
          <p className={styles.tagHint}>
            Gõ số điện thoại và nhấn Enter. Số này sẽ hiển thị dạng tel: trên Public.
          </p>
        </div>

        {/* isPublished + displayOrder */}
        <div className={styles.row}>
          <div className={styles.fieldSmall}>
            <label className={styles.label}>Thứ tự hiển thị</label>
            <Input
              type="number"
              min={0}
              value={String(form.displayOrder)}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setField("displayOrder", Number(e.target.value))
              }
              error={errors.displayOrder}
            />
            <p className={styles.tagHint}>Cao hơn = ưu tiên cao hơn khi nhiều bản ghi published.</p>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Xuất bản</label>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setField("isPublished", e.target.checked)
                  }
                  className={styles.toggle}
                />
                <span>Hiển thị trên trang Public</span>
              </label>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            Huỷ
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo lịch khai giảng"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
