import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button, Input, Modal } from "./ui";
import { ApiError } from "../lib/api";
import {
  PASSWORD_MIN,
  changePassword,
  validatePassword,
} from "../lib/profileApi";
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

export function ChangePasswordModal({
  open,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Show/hide từng field — mỗi field có toggle riêng cho UX quen thuộc.
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    }

    if (form.confirmPassword !== form.newPassword) {
      next.confirmPassword = "Xác nhận mật khẩu không khớp";
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
      // Nếu lỗi liên quan mật khẩu cũ → gắn vào field oldPassword cho UX rõ hơn.
      if (err instanceof ApiError && /mật khẩu cũ/i.test(message)) {
        setErrors({ oldPassword: message });
      } else {
        setErrors({ submit: message });
      }
    } finally {
      setSubmitting(false);
    }
  }

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

        <Input
          label="Mật khẩu mới"
          required
          type={showNew ? "text" : "password"}
          value={form.newPassword}
          onChange={(e) => handleChange("newPassword", e.target.value)}
          disabled={submitting}
          error={errors.newPassword}
          hint={`Mật khẩu mới phải có ít nhất ${PASSWORD_MIN} ký tự và khác mật khẩu cũ.`}
          autoComplete="new-password"
          rightIcon={showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          onRightIconClick={() => setShowNew((v) => !v)}
        />

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