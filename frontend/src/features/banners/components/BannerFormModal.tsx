/**
 * BannerFormModal — form tạo/sửa banner (Admin).
 */
import { ChangeEvent, FormEvent, useState } from "react";
import { Alert, Button, Input, Modal, UploadZone } from "../../../shared/components/ui";
import { uploadFileRaw } from "../../files/services/fileApi";
import { createBanner, getBannerImageUrl, updateBanner, type Banner, type BannerPayload } from "../services/bannerApi";
import { ApiError } from "../../../shared/api";
import styles from "./BannerFormModal.module.css";

interface FieldErrors {
  title?: string;
  imageUrl?: string;
  ctaLink?: string;
  startDate?: string;
  endDate?: string;
}

interface BannerFormModalProps {
  banner?: Banner | null;
  onClose: () => void;
  onSuccess: () => void;
}

function emptyPayload() {
  return {
    title: "",
    subtitle: null as string | null,
    imageUrl: "",
    badgeText: null as string | null,
    ctaText: null as string | null,
    ctaLink: null as string | null,
    startDate: null as string | null,
    endDate: null as string | null,
    isPublished: true,
    displayOrder: 0,
  };
}

export function BannerFormModal({ banner, onClose, onSuccess }: BannerFormModalProps) {
  const isEdit = Boolean(banner);

  const [form, setForm] = useState<ReturnType<typeof emptyPayload>>(() => {
    if (banner) {
      return {
        title: banner.title,
        subtitle: banner.subtitle ?? "",
        imageUrl: banner.imageUrl,
        badgeText: banner.badgeText ?? "",
        ctaText: banner.ctaText ?? "",
        ctaLink: banner.ctaLink ?? "",
        startDate: banner.startDate ? banner.startDate.slice(0, 16) : "",
        endDate: banner.endDate ? banner.endDate.slice(0, 16) : "",
        isPublished: banner.isPublished,
        displayOrder: banner.displayOrder,
      };
    }
    return emptyPayload();
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const setField = (field: keyof ReturnType<typeof emptyPayload>, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!form.title?.trim()) e.title = "Tiêu đề là bắt buộc";
    if (!form.imageUrl?.trim()) e.imageUrl = "Ảnh nền là bắt buộc";
    if (form.ctaLink && form.ctaLink.trim() && !/^\//.test(form.ctaLink) && !/^https?:\/\//.test(form.ctaLink)) {
      e.ctaLink = "Link phải bắt đầu bằng / hoặc https://";
    }
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
        e.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleImageUpload = async (file: File) => {
    const uploaded = await uploadFileRaw(file);
    const url = getBannerImageUrl(uploaded.storedName);
    setField("imageUrl", url);
    setErrors((p) => ({ ...p, imageUrl: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const payload: BannerPayload = {
        ...form,
        title: form.title?.trim() ?? "",
        imageUrl: form.imageUrl?.trim() ?? "",
        subtitle: form.subtitle?.trim() || null,
        badgeText: form.badgeText?.trim() || null,
        ctaText: form.ctaText?.trim() || null,
        ctaLink: form.ctaLink?.trim() || null,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        displayOrder: Number(form.displayOrder) || 0,
      };
      if (isEdit && banner) {
        await updateBanner(banner.id, payload);
      } else {
        await createBanner(payload);
      }
      onSuccess();
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Lỗi không xác định");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Sửa Banner" : "Thêm Banner"}
      size="lg"
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {apiError && (
          <Alert variant="error" className={styles.apiAlert}>
            {apiError}
          </Alert>
        )}

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>
              Tiêu đề <span className={styles.required}>*</span>
            </label>
            <Input
              value={form.title}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setField("title", e.target.value)}
              placeholder="VD: Ưu đãi tháng 7"
              error={errors.title}
            />
          </div>
          <div className={styles.fieldSmall}>
            <label className={styles.label}>Thứ tự</label>
            <Input
              type="number"
              value={form.displayOrder}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setField("displayOrder", Number(e.target.value))}
              min={0}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Mô tả phụ</label>
          <Input
            value={form.subtitle ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setField("subtitle", e.target.value)}
            placeholder="VD: Đăng ký sớm — giảm 20%"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Ảnh nền <span className={styles.required}>*</span>
          </label>
          <UploadZone
            multiple={false}
            showQueue={false}
            disabled={submitting}
            description="Kéo-thả ảnh hoặc bấm để chọn. Hỗ trợ: jpg, png, webp. Tối đa 10MB."
            onUpload={handleImageUpload}
            onInvalid={(items) => {
              const first = items[0]?.error?.message;
              if (first) setErrors((p) => ({ ...p, imageUrl: first }));
            }}
          />
          {errors.imageUrl && <p className={styles.error}>{errors.imageUrl}</p>}
          {form.imageUrl && (
            <div className={styles.imagePreview}>
              <img src={form.imageUrl} alt="Preview" className={styles.previewImg} />
            </div>
          )}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Badge</label>
            <Input
              value={form.badgeText ?? ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setField("badgeText", e.target.value)}
              placeholder="VD: ƯU ĐÃI THÁNG 7"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Text nút CTA</label>
            <Input
              value={form.ctaText ?? ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setField("ctaText", e.target.value)}
              placeholder="VD: Đăng ký ngay"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Link nút CTA</label>
          <Input
            value={form.ctaLink ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setField("ctaLink", e.target.value)}
            placeholder="/register hoặc https://..."
            error={errors.ctaLink}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Từ ngày</label>
            <Input
              type="datetime-local"
              value={form.startDate ?? ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setField("startDate", e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Đến ngày</label>
            <Input
              type="datetime-local"
              value={form.endDate ?? ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setField("endDate", e.target.value)}
              error={errors.endDate}
            />
          </div>
        </div>

        <div className={styles.toggleRow}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setField("isPublished", e.target.checked)}
              className={styles.toggle}
            />
            <span>Hiển thị ngay</span>
          </label>
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo Banner"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
