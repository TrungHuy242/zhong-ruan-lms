/**
 * PricingFormModal — form tạo/sửa bảng giá (Admin).
 *
 * Pattern: giống TeacherFormModal (Modal + form stack + Alert + 2 nút footer).
 *
 * - `plan=null` → chế độ thêm mới.
 * - `plan!=null` → chế độ sửa.
 *
 * Đặc thù Pricing:
 *   - Giá: input number với format hiển thị dấu phân cách nghìn khi gõ
 *   - Giá gốc: optional, để hiện gạch ngang khuyến mãi
 *   - Benefits: tag input — mỗi dòng là 1 feature
 *   - Linked course: dropdown lấy từ danh sách HSK courses
 *   - isFeatured warning: cảnh báo (không chặn) nếu chọn >1 gói nổi bật
 */
import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useState,
} from "react";
import { Alert, Button, Input, Modal } from "../../../shared/components/ui";
import {
  createPricingPlan,
  updatePricingPlan,
  type CreatePricingPlanPayload,
  type PricingPlan,
  type PricingUnit,
  type PricingClassType,
  parseVND,
} from "../services/pricingApi";
import { ApiError } from "../../../shared/api";
import { coursesContent } from "../../public/data/coursesContent";
import { Link2, X as XIcon } from "lucide-react";
import styles from "./PricingFormModal.module.css";

interface FieldErrors {
  name?: string;
  price?: string;
  originalPrice?: string;
  displayOrder?: string;
  benefits?: string;
}

interface PricingFormModalProps {
  open: boolean;
  plan: PricingPlan | null;
  onClose: () => void;
  onSuccess: (plan: PricingPlan, mode: "create" | "update") => void;
  /** Số gói đang được đánh Nổi bật (tính từ table, không tính plan đang sửa) */
  currentFeaturedCount: number;
}

const CLASS_TYPE_OPTIONS: { value: PricingClassType; label: string }[] = [
  { value: "GROUP", label: "Nhóm" },
  { value: "PRIVATE", label: "1 kèm 1" },
];

const UNIT_OPTIONS: { value: PricingUnit; label: string }[] = [
  { value: "buổi", label: "Buổi" },
  { value: "tháng", label: "Tháng" },
  { value: "khóa", label: "Khóa" },
];

function validateName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Vui lòng nhập tên gói";
  if (trimmed.length < 2) return "Tên gói phải có ít nhất 2 ký tự";
  if (trimmed.length > 100) return "Tên gói không quá 100 ký tự";
  return undefined;
}

function validatePrice(value: string): string | undefined {
  const n = parseVND(value);
  if (isNaN(n) || n <= 0) return "Giá phải lớn hơn 0";
  if (n > 999999999) return "Giá không hợp lệ";
  return undefined;
}

function validateOriginalPrice(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const n = parseVND(value);
  if (isNaN(n) || n <= 0) return "Giá gốc phải lớn hơn 0";
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

/**
 * Format giá khi gõ: chèn dấu phân cách nghìn.
 * VD: nhập "1500000" → hiển thị "1.500.000"
 */
function formatPriceInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN");
}

export function PricingFormModal({
  open,
  plan,
  onClose,
  onSuccess,
  currentFeaturedCount,
}: PricingFormModalProps) {
  const isEdit = Boolean(plan);

  // ===== Form state =====
  const [name, setName] = useState("");
  const [classType, setClassType] = useState<PricingClassType>("GROUP");
  const [priceInput, setPriceInput] = useState("");
  const [originalPriceInput, setOriginalPriceInput] = useState("");
  const [unit, setUnit] = useState<PricingUnit>("buổi");
  const [description, setDescription] = useState("");
  const [benefitsInput, setBenefitsInput] = useState<string[]>([]);
  const [benefitInput, setBenefitInput] = useState("");
  const [linkedCourseSlug, setLinkedCourseSlug] = useState<string>("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [displayOrder, setDisplayOrder] = useState("0");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cảnh báo khi chọn nổi bật (có >1 gói đã nổi bật)
  const [featuredWarning, setFeaturedWarning] = useState<string | null>(null);

  // Mỗi lần mở modal → reset từ props
  useEffect(() => {
    if (!open) return;
    setName(plan?.name ?? "");
    setClassType(plan?.classType ?? "GROUP");
    setPriceInput(plan ? formatPriceInput(String(plan.price)) : "");
    setOriginalPriceInput(
      plan?.originalPrice ? formatPriceInput(String(plan.originalPrice)) : ""
    );
    setUnit(plan?.unit ?? "buổi");
    setDescription(plan?.description ?? "");
    setBenefitsInput(plan?.benefits ?? []);
    setBenefitInput("");
    setLinkedCourseSlug(plan?.linkedCourseSlug ?? "");
    setIsFeatured(plan?.isFeatured ?? false);
    setIsPublished(plan?.isPublished ?? true);
    setDisplayOrder(
      plan?.displayOrder != null ? String(plan.displayOrder) : "0"
    );
    setErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
    setFeaturedWarning(null);
  }, [open, plan]);

  // Cảnh báo khi đánh dấu nổi bật
  useEffect(() => {
    if (isFeatured) {
      const alreadyFeatured = isEdit
        ? currentFeaturedCount // đang sửa, không tính plan này
        : currentFeaturedCount + 1; // đang tạo mới
      if (alreadyFeatured >= 1) {
        setFeaturedWarning(
          `Hiện đã có ${alreadyFeatured} gói được đánh Nổi bật. Bạn có chắc muốn đánh Nổi bật thêm gói này không?`
        );
      } else {
        setFeaturedWarning(null);
      }
    } else {
      setFeaturedWarning(null);
    }
  }, [isFeatured, currentFeaturedCount, isEdit]);

  function validateAll(): boolean {
    const next: FieldErrors = {
      name: validateName(name),
      price: validatePrice(priceInput),
      originalPrice: validateOriginalPrice(originalPriceInput),
      displayOrder: validateDisplayOrder(displayOrder),
    };
    if (benefitsInput.length === 0) {
      next.benefits = "Vui lòng nhập ít nhất 1 quyền lợi";
    }
    setErrors(next);
    return !Object.values(next).some(Boolean);
  }

  function handleBenefitKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = benefitInput.trim();
      if (trimmed) {
        setBenefitsInput((prev) => [...prev, trimmed]);
        setBenefitInput("");
      }
    } else if (e.key === "Backspace" && !benefitInput && benefitsInput.length > 0) {
      setBenefitsInput((prev) => prev.slice(0, -1));
    }
  }

  function removeBenefit(index: number) {
    setBenefitsInput((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePriceChange(e: ChangeEvent<HTMLInputElement>) {
    const formatted = formatPriceInput(e.target.value);
    setPriceInput(formatted);
  }

  function handleOriginalPriceChange(e: ChangeEvent<HTMLInputElement>) {
    const formatted = formatPriceInput(e.target.value);
    setOriginalPriceInput(formatted);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      const price = parseVND(priceInput);
      const originalPrice = originalPriceInput.trim()
        ? parseVND(originalPriceInput)
        : null;
      const displayOrderNum = displayOrder.trim()
        ? Number(displayOrder)
        : 0;

      const payload: CreatePricingPlanPayload = {
        name: name.trim(),
        classType,
        price,
        originalPrice: originalPrice ?? undefined,
        unit,
        description: description.trim() || undefined,
        benefits: benefitsInput,
        linkedCourseSlug: linkedCourseSlug || undefined,
        isFeatured,
        isPublished,
        displayOrder: displayOrderNum,
      };

      let result: PricingPlan;
      if (isEdit && plan) {
        result = await updatePricingPlan(plan.id, payload);
        onSuccess(result, "update");
      } else {
        result = await createPricingPlan(payload);
        onSuccess(result, "create");
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? () => undefined : onClose}
      title={isEdit ? "Sửa bảng giá" : "Thêm bảng giá"}
      size="lg"
    >
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        {submitError ? (
          <Alert variant="error" onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        ) : null}

        {/* Tên gói + Loại lớp */}
        <div className={styles.grid2}>
          <Input
            label="Tên gói"
            placeholder="VD: Gói Nhóm HSK 3-4"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
            disabled={isSubmitting}
          />
          <div className={styles.field}>
            <label htmlFor="pricing-class-type" className={styles.label}>
              Loại lớp <span className={styles.required}>*</span>
            </label>
            <select
              id="pricing-class-type"
              className={styles.select}
              value={classType}
              onChange={(e) => setClassType(e.target.value as PricingClassType)}
              disabled={isSubmitting}
            >
              {CLASS_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Giá + Giá gốc */}
        <div className={styles.grid2}>
          <Input
            label="Giá (VNĐ)"
            placeholder="VD: 150.000"
            value={priceInput}
            onChange={handlePriceChange}
            error={errors.price}
            required
            disabled={isSubmitting}
          />
          <Input
            label="Giá gốc (VNĐ)"
            placeholder="VD: 200.000"
            value={originalPriceInput}
            onChange={handleOriginalPriceChange}
            error={errors.originalPrice}
            hint="Để trống nếu không có giảm giá"
            disabled={isSubmitting}
          />
        </div>

        {/* Đơn vị tính + Thứ tự hiển thị */}
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label htmlFor="pricing-unit" className={styles.label}>
              Đơn vị tính <span className={styles.required}>*</span>
            </label>
            <select
              id="pricing-unit"
              className={styles.select}
              value={unit}
              onChange={(e) => setUnit(e.target.value as PricingUnit)}
              disabled={isSubmitting}
            >
              {UNIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
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

        {/* Mô tả ngắn */}
        <div className={styles.field}>
          <label htmlFor="pricing-description" className={styles.label}>
            Mô tả ngắn
          </label>
          <textarea
            id="pricing-description"
            className={styles.textareaShort}
            placeholder="Mô tả ngắn gọn về gói giá này"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            rows={2}
          />
        </div>

        {/* Quyền lợi (Tag input) */}
        <div className={styles.field}>
          <label htmlFor="pricing-benefits" className={styles.label}>
            Quyền lợi <span className={styles.required}>*</span>
          </label>
          <div className={styles.tagInputWrap}>
            {benefitsInput.map((benefit, idx) => (
              <span key={idx} className={styles.tagChip}>
                {benefit}
                <button
                  type="button"
                  className={styles.tagChipRemove}
                  onClick={() => removeBenefit(idx)}
                  aria-label={`Xoá quyền lợi: ${benefit}`}
                  disabled={isSubmitting}
                >
                  <XIcon size={12} />
                </button>
              </span>
            ))}
            <input
              id="pricing-benefits"
              type="text"
              className={styles.tagInputField}
              placeholder={
                benefitsInput.length === 0
                  ? "Nhập quyền lợi và nhấn Enter để thêm..."
                  : "Thêm quyền lợi..."
              }
              value={benefitInput}
              onChange={(e) => setBenefitInput(e.target.value)}
              onKeyDown={handleBenefitKeyDown}
              disabled={isSubmitting}
            />
          </div>
          {errors.benefits ? (
            <span className={styles.fieldError} role="alert">
              {errors.benefits}
            </span>
          ) : (
            <span className={styles.hint}>
              Nhấn <kbd>Enter</kbd> sau mỗi quyền lợi để thêm.{" "}
              {benefitsInput.length > 0
                ? `Đã thêm ${benefitsInput.length} quyền lợi.`
                : ""}
            </span>
          )}
        </div>

        {/* Liên kết khóa học */}
        <div className={styles.field}>
          <label htmlFor="pricing-course" className={styles.label}>
            <Link2 size={14} aria-hidden="true" />
            <span>Liên kết khóa học (không bắt buộc)</span>
          </label>
          <select
            id="pricing-course"
            className={styles.select}
            value={linkedCourseSlug}
            onChange={(e) => setLinkedCourseSlug(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">— Không liên kết —</option>
            {coursesContent.map((course) => (
              <option key={course.slug} value={course.slug}>
                {course.name}
              </option>
            ))}
          </select>
          <span className={styles.hint}>
            Liên kết gói giá với khóa học HSK cụ thể (tuỳ chọn).
          </span>
        </div>

        {/* Toggles: Nổi bật + Xuất bản */}
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
                Hiển thị ưu tiên trên trang bảng giá.
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

        {/* Cảnh báo nổi bật */}
        {featuredWarning ? (
          <Alert variant="warning">{featuredWarning}</Alert>
        ) : null}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Huỷ
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEdit ? "Lưu thay đổi" : "Tạo bảng giá"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
