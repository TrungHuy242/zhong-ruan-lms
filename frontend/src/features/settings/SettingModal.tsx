import { FormEvent, useEffect, useState } from "react";
import { Button, Input, Modal } from "../../shared/components/ui";
import {
  createSetting,
  updateSetting,
  validateSettingDescription,
  validateSettingKey,
  validateSettingValue,
  type Setting,
} from "./settingApi";
import { ApiError } from "../../shared/lib/api";
import styles from "./SettingModal.module.css";

export type SettingModalMode = "create" | "edit";

export interface SettingModalProps {
  open: boolean;
  mode: SettingModalMode;
  /** Khi edit, truyền vào setting cần sửa. Khi create, bỏ qua. */
  setting?: Setting | null;
  /**
   * Callback báo parent là cần refresh lại danh sách (đã được parent tự xử lý
   * thông qua prop onSaved nếu muốn, nhưng parent cũng có thể gọi lại API).
   */
  onSaved: (setting: Setting, mode: SettingModalMode) => void;
  onClose: () => void;
  /** Danh sách key hiện có — dùng để check trùng khi create. */
  existingKeys?: string[];
}

interface FormState {
  key: string;
  value: string;
  description: string;
}

interface FormErrors {
  key?: string;
  value?: string;
  description?: string;
  /** Lỗi từ BE (VD key trùng → 409). */
  submit?: string;
}

const INITIAL_FORM: FormState = { key: "", value: "", description: "" };

export function SettingModal({
  open,
  mode,
  setting,
  onSaved,
  onClose,
  existingKeys = [],
}: SettingModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset form khi mở hoặc đổi mode/setting.
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && setting) {
      setForm({
        key: setting.key,
        value: setting.value,
        description: setting.description ?? "",
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setErrors({});
    setSubmitting(false);
  }, [open, mode, setting]);

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error as user types.
    setErrors((prev) => ({ ...prev, [field]: undefined, submit: undefined }));
  }

  function validate(): FormErrors {
    const next: FormErrors = {};

    if (mode === "create") {
      const keyCheck = validateSettingKey(form.key);
      if (!keyCheck.ok) next.key = keyCheck.error;
      else {
        const normalized = (keyCheck.normalized ?? form.key).toLowerCase();
        if (existingKeys.some((k) => k.toLowerCase() === normalized)) {
          next.key = `Key "${keyCheck.normalized}" đã tồn tại trong hệ thống.`;
        }
      }
    }

    const valueCheck = validateSettingValue(form.value);
    if (!valueCheck.ok) next.value = valueCheck.error;

    const descCheck = validateSettingDescription(form.description);
    if (!descCheck.ok) next.description = descCheck.error;

    return next;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      if (mode === "create") {
        const created = await createSetting({
          key: form.key.trim(),
          value: form.value,
          description: form.description.trim() ? form.description.trim() : null,
        });
        onSaved(created, "create");
      } else if (setting) {
        const updated = await updateSetting(setting.key, {
          value: form.value,
          description: form.description.trim() ? form.description.trim() : null,
        });
        onSaved(updated, "edit");
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Lỗi không xác định";
      // Nếu BE trả 409 (key trùng) thì gắn vào field key cho UX tốt hơn.
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ key: message });
      } else {
        setErrors({ submit: message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const title = mode === "create" ? "Thêm cấu hình mới" : "Sửa cấu hình";
  const submitText = mode === "create" ? "Tạo cấu hình" : "Lưu thay đổi";

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title={title}
      size="md"
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {errors.submit ? (
          <div className={styles.submitError} role="alert">
            {errors.submit}
          </div>
        ) : null}

        <Input
          label="Key"
          required
          placeholder="VD: smtp_host, maintenance_mode..."
          value={form.key}
          onChange={(e) => handleChange("key", e.target.value)}
          disabled={mode === "edit" || submitting}
          error={errors.key}
          hint={
            mode === "edit"
              ? "Không thể thay đổi key sau khi tạo."
              : "Chỉ chữ thường, số và dấu gạch dưới (a-z, 0-9, _). Tối đa 100 ký tự."
          }
          maxLength={100}
          autoComplete="off"
        />

        <div className={styles.field}>
          <label htmlFor="setting-value" className={styles.label}>
            Value <span className={styles.required}>*</span>
          </label>
          <textarea
            id="setting-value"
            className={[
              styles.textarea,
              errors.value ? styles.textareaError : "",
            ].join(" ")}
            rows={4}
            value={form.value}
            onChange={(e) => handleChange("value", e.target.value)}
            disabled={submitting}
            maxLength={5000}
            placeholder='Có thể là chuỗi JSON, true/false, số hoặc chuỗi tuỳ ý. VD: "true", "30", "{\"a\":1}"'
          />
          {errors.value ? (
            <span className={styles.errorText} role="alert">
              {errors.value}
            </span>
          ) : (
            <span className={styles.hintText}>
              Tối đa 5000 ký tự. Có thể nhập JSON, số, boolean (chuỗi)…
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="setting-description" className={styles.label}>
            Description
          </label>
          <textarea
            id="setting-description"
            className={[
              styles.textarea,
              styles.textareaShort,
              errors.description ? styles.textareaError : "",
            ].join(" ")}
            rows={2}
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            disabled={submitting}
            maxLength={500}
            placeholder="Mô tả ngắn cho cấu hình (tuỳ chọn)"
          />
          {errors.description ? (
            <span className={styles.errorText} role="alert">
              {errors.description}
            </span>
          ) : (
            <span className={styles.hintText}>Tuỳ chọn, tối đa 500 ký tự.</span>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Huỷ
          </Button>
          <Button type="submit" isLoading={submitting} loadingText={submitText}>
            {submitText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}