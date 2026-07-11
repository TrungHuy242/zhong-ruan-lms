import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { Button, Input, Modal } from "../../../shared/components/ui";
import { ApiError } from "../../../shared/api";
import {
  PASSWORD_MIN,
  changePassword,
  evaluatePasswordStrength,
  validatePassword,
} from "../services/profileApi";
import styles from "./ChangePasswordModal.module.css";

export interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormState {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  submit?: string;
}

const INITIAL_FORM: FormState = {
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
};

// Token tone cho strength meter — dùng semantic tokens từ DESIGN.md.
const STRENGTH_TONE_VAR = [
  "var(--border-default, #E5E7EB)",
  "var(--color-error, #DC2626)",
  "var(--color-warning, #D97706)",
  "var(--color-info, #2563EB)",
  "var(--color-success, #16A34A)",
];

export function ChangePasswordModal({
  open,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Show/hide từng field.
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Đánh giá độ mạnh realtime — chỉ khi user đã gõ new password.
  const strength = useMemo(
    () => evaluatePasswordStrength(form.newPassword),
    [form.newPassword]
  );

  // Reset khi mở.
  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM);
      setErrors({});
      setSubmitting(false);
      setShowOld(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [open]);

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
      submit: undefined,
    }));
  }

  function validate(): FormErrors {
    const next: FormErrors = {};

    if (form.oldPassword.length === 0) {
      next.oldPassword = "Vui lòng nhập mật khẩu cũ";
    }

    const newPw = validatePassword(form.newPassword);
    if (!newPw.ok) {
      next.newPassword = newPw.error;
    } else if (form.newPassword === form.oldPassword) {
      next.newPassword = "Mật khẩu mới phải khác mật khẩu cũ";
    } else if (form.confirmPassword !== form.newPassword) {
      next.confirmPassword = "Xác nhận mật khẩu không khớp";
    } else if (form.confirmPassword.length === 0) {
      next.confirmPassword = "Vui lòng xác nhận mật khẩu mới";
    }

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
      await changePassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Lỗi không xác định";
      // Lỗi liên quan mật khẩu cũ → gắn vào field đó cho UX rõ hơn.
      if (err instanceof ApiError && /mật khẩu cũ/i.test(message)) {
        setErrors({ oldPassword: message });
      } else {
        setErrors({ submit: message });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const strengthWidth = `${Math.max(8, Math.round(strength.score * 100))}%`;
  const strengthColor = STRENGTH_TONE_VAR[strength.level] ?? STRENGTH_TONE_VAR[0];
  const showStrengthTip = form.newPassword.length > 0 && strength.tips.length > 0;

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title={
        <span className={styles.title}>
          <KeyRound size={18} />
          Đổi mật khẩu
        </span>
      }
      size="sm"
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {errors.submit ? (
          <div className={styles.submitError} role="alert">
            {errors.submit}
          </div>
        ) : null}

        <Input
          label="Mật khẩu cũ"
          required
          type={showOld ? "text" : "password"}
          value={form.oldPassword}
          onChange={(e) => handleChange("oldPassword", e.target.value)}
          disabled={submitting}
          error={errors.oldPassword}
          autoComplete="current-password"
          rightIcon={showOld ? <EyeOff size={16} /> : <Eye size={16} />}
          onRightIconClick={() => setShowOld((v) => !v)}
        />

        <div className={styles.field}>
          <Input
            label="Mật khẩu mới"
            required
            type={showNew ? "text" : "password"}
            value={form.newPassword}
            onChange={(e) => handleChange("newPassword", e.target.value)}
            disabled={submitting}
            error={errors.newPassword}
            hint={`Tối thiểu ${PASSWORD_MIN} ký tự và khác mật khẩu cũ.`}
            autoComplete="new-password"
            rightIcon={showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            onRightIconClick={() => setShowNew((v) => !v)}
          />

          {/* Strength meter — chỉ hiển thị khi đã nhập gì đó */}
          {form.newPassword.length > 0 ? (
            <div className={styles.strength} aria-label="Độ mạnh mật khẩu">
              <div className={styles.strengthTrack}>
                <div
                  className={styles.strengthFill}
                  style={{ width: strengthWidth, background: strengthColor }}
                />
              </div>
              <div className={styles.strengthMeta}>
                <span
                  className={styles.strengthLabel}
                  style={{ color: strengthColor }}
                >
                  {strength.label}
                </span>
                {showStrengthTip ? (
                  <span className={styles.strengthTip}>
                    {strength.tips[0]}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <Input
          label="Xác nhận mật khẩu mới"
          required
          type={showConfirm ? "text" : "password"}
          value={form.confirmPassword}
          onChange={(e) => handleChange("confirmPassword", e.target.value)}
          disabled={submitting}
          error={errors.confirmPassword}
          autoComplete="new-password"
          rightIcon={showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          onRightIconClick={() => setShowConfirm((v) => !v)}
        />

        <div className={styles.securityHints}>
          <p className={styles.securityHintsTitle}>
            <ShieldCheck size={14} aria-hidden="true" />
            Mẹo bảo mật
          </p>
          <ul>
            <li>Dùng mật khẩu khác với mật khẩu đang dùng ở các dịch vụ khác.</li>
            <li>Không chia sẻ mật khẩu cho bất kỳ ai, kể cả nhân viên hỗ trợ.</li>
            <li>Bật xác thực 2 lớp (nếu có) để tăng cường bảo mật.</li>
          </ul>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Huỷ
          </Button>
          <Button type="submit" isLoading={submitting} loadingText="Đang đổi mật khẩu...">
            Đổi mật khẩu
          </Button>
        </div>
      </form>
    </Modal>
  );
}