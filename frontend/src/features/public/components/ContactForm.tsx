/**
 * ContactForm — Form liên hệ công khai cho trang /lien-he.
 *
 * Pattern tham chiếu: features/auth/pages/RegisterPage.tsx
 *   - Validate onBlur từng field + validateAll() khi submit.
 *   - Hiển thị Alert success/error bằng prop callbacks (cha quản lý).
 *   - Loading trên Button khi gửi, khoá fieldset.
 *   - Sau thành công: reset form, đóng success sau vài giây (cha tự quyết).
 *
 * Validation khớp với BE contact-request.helpers.js:
 *   - fullName: tối thiểu 2 ký tự.
 *   - phone:    VN (0..., +84..., cho phép có dấu cách/dấu chấm/dấu gạch ngang).
 *   - email:    regex cơ bản.
 *   - message:  tối thiểu 10 ký tự.
 */
import { FormEvent, useState } from "react";
import { Alert, Button } from "../../../shared/components/ui";
import { ApiError } from "../../../shared/api";
import { submitContactRequest } from "../services/publicContactApi";
import type { PublicContactRequestPayload } from "../services/publicContactApi";
import styles from "./ContactForm.module.css";

interface FieldErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  message?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// BE regex: ^(?:\+?84|0)\s?(?:3|5|7|8|9)\d(?:[\s.-]?\d){7}$  → khoẻ, cho phép
// paste SĐT có dấu cách / dấu chấm / dấu gạch ngang khi user copy từ chỗ khác.
const PHONE_VN_REGEX = /^(?:\+?84|0)\s?(?:3|5|7|8|9)\d(?:[\s.-]?\d){7}$/;
const MIN_MESSAGE = 10;
const MIN_FULL_NAME = 2;

function validateFullName(v: string): string | undefined {
  const t = v.trim();
  if (!t) return "Vui lòng nhập họ và tên";
  if (t.length < MIN_FULL_NAME) return `Họ tên phải có ít nhất ${MIN_FULL_NAME} ký tự`;
  return undefined;
}
function validatePhone(v: string): string | undefined {
  const t = v.trim();
  if (!t) return "Vui lòng nhập số điện thoại";
  if (!PHONE_VN_REGEX.test(t)) {
    return "Số điện thoại không đúng định dạng (VD: 0912345678 hoặc +84912345678)";
  }
  return undefined;
}
function validateEmail(v: string): string | undefined {
  const t = v.trim();
  if (!t) return "Vui lòng nhập email";
  if (!EMAIL_REGEX.test(t)) return "Email không đúng định dạng";
  return undefined;
}
function validateMessage(v: string): string | undefined {
  const t = v.trim();
  if (!t) return "Vui lòng nhập nội dung liên hệ";
  if (t.length < MIN_MESSAGE) {
    return `Nội dung phải có ít nhất ${MIN_MESSAGE} ký tự`;
  }
  return undefined;
}

interface ContactFormProps {
  /**
   * Callback khi submit thành công (BE đã trả 201).
   * Cha thường dùng để:
   *   - Bật success banner.
   *   - (Tuỳ chọn) đẩy event tracking, scroll lên đầu form, ...
   */
  onSubmitted?: () => void;
  /**
   * successMessage: nội dung Alert success. Mặc định là message từ task.
   */
  successMessage?: string;
}

export function ContactForm({
  onSubmitted,
  successMessage = "Đã gửi yêu cầu, chúng tôi sẽ liên hệ lại sớm nhất.",
}: ContactFormProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validateField(field: keyof FieldErrors, value: string): string | undefined {
    switch (field) {
      case "fullName":
        return validateFullName(value);
      case "phone":
        return validatePhone(value);
      case "email":
        return validateEmail(value);
      case "message":
        return validateMessage(value);
    }
  }

  function handleBlur(field: keyof FieldErrors) {
    const value =
      field === "fullName"
        ? fullName
        : field === "phone"
        ? phone
        : field === "email"
        ? email
        : message;
    const err = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: err }));
  }

  function validateAll(): boolean {
    const next: FieldErrors = {
      fullName: validateFullName(fullName),
      phone: validatePhone(phone),
      email: validateEmail(email),
      message: validateMessage(message),
    };
    setErrors(next);
    return !next.fullName && !next.phone && !next.email && !next.message;
  }

  function resetForm() {
    setFullName("");
    setPhone("");
    setEmail("");
    setMessage("");
    setErrors({});
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setApiError(null);
    setSuccess(null);
    if (!validateAll()) return;

    setSubmitting(true);
    const payload: PublicContactRequestPayload = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      message: message.trim(),
    };
    try {
      await submitContactRequest(payload);
      resetForm();
      setSuccess(successMessage);
      onSubmitted?.();
    } catch (err) {
      // BE trả message rất rõ cho từng case:
      //   - 400 (validate): hiển thị Alert error giống form thật.
      //   - 429 (rate-limit): "Bạn đã gửi quá nhiều yêu cầu liên hệ. Vui lòng thử lại sau 1 giờ."
      //   - 500: fallback.
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={submitting || undefined}
      className={styles.form}
    >
      {success ? (
        <div className={styles.alertWrap}>
          <Alert variant="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        </div>
      ) : null}

      {apiError ? (
        <div className={styles.alertWrap}>
          <Alert variant="error" onClose={() => setApiError(null)}>
            {apiError}
          </Alert>
        </div>
      ) : null}

      <fieldset disabled={submitting} className={styles.fieldset}>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>
              Họ và tên <span className={styles.required} aria-hidden="true">*</span>
            </span>
            <input
              type="text"
              name="fullName"
              autoComplete="name"
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => handleBlur("fullName")}
              aria-invalid={Boolean(errors.fullName) || undefined}
              className={[
                styles.input,
                errors.fullName ? styles.inputError : "",
              ]
                .filter(Boolean)
                .join(" ")}
              required
            />
            {errors.fullName ? (
              <span className={styles.errorText} role="alert">
                {errors.fullName}
              </span>
            ) : null}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              Số điện thoại <span className={styles.required} aria-hidden="true">*</span>
            </span>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              placeholder="VD: 0912345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => handleBlur("phone")}
              aria-invalid={Boolean(errors.phone) || undefined}
              className={[
                styles.input,
                errors.phone ? styles.inputError : "",
              ]
                .filter(Boolean)
                .join(" ")}
              required
            />
            {errors.phone ? (
              <span className={styles.errorText} role="alert">
                {errors.phone}
              </span>
            ) : null}
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>
            Email <span className={styles.required} aria-hidden="true">*</span>
          </span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur("email")}
            aria-invalid={Boolean(errors.email) || undefined}
            className={[styles.input, errors.email ? styles.inputError : ""]
              .filter(Boolean)
              .join(" ")}
            required
          />
          {errors.email ? (
            <span className={styles.errorText} role="alert">
              {errors.email}
            </span>
          ) : null}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>
            Lời nhắn <span className={styles.required} aria-hidden="true">*</span>
          </span>
          <textarea
            name="message"
            rows={5}
            placeholder="Cho chúng tôi biết bạn quan tâm đến khoá học nào, lịch học mong muốn..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onBlur={() => handleBlur("message")}
            aria-invalid={Boolean(errors.message) || undefined}
            className={[
              styles.input,
              styles.textarea,
              errors.message ? styles.inputError : "",
            ]
              .filter(Boolean)
              .join(" ")}
            required
          />
          {errors.message ? (
            <span className={styles.errorText} role="alert">
              {errors.message}
            </span>
          ) : (
            <span className={styles.hintText}>
              Tối thiểu {MIN_MESSAGE} ký tự. Đừng chia sẻ thông tin nhạy cảm (CMND, mật khẩu, ...).
            </span>
          )}
        </label>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={submitting}
          loadingText="Đang gửi..."
        >
          Gửi yêu cầu tư vấn
        </Button>
      </fieldset>
    </form>
  );
}
