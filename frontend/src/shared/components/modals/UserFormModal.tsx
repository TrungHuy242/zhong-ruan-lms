import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Input, Modal } from "../ui";
import {
  createUser,
  updateUser,
  type CreateUserPayload,
  type UpdateUserPayload,
  type User,
  type UserRole,
} from "../../../features/users/services/userApi";
import { ApiError } from "../../../shared/api";
import styles from "./UserFormModal.module.css";

interface FieldErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0\d{9}$/;
const MIN_PASSWORD_LENGTH = 6;

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Quản trị viên" },
  { value: "TEACHER", label: "Giáo viên" },
  { value: "STUDENT", label: "Học viên" },
];

function validateFullName(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Vui lòng nhập họ tên";
  if (trimmed.length < 2) return "Họ tên phải có ít nhất 2 ký tự";
  return undefined;
}
function validateEmail(value: string): string | undefined {
  if (!value.trim()) return "Vui lòng nhập email";
  if (!EMAIL_REGEX.test(value.trim())) return "Email không đúng định dạng";
  return undefined;
}
function validatePhone(value: string): string | undefined {
  if (!value.trim()) return "Vui lòng nhập số điện thoại";
  if (!PHONE_REGEX.test(value.trim())) {
    return "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0";
  }
  return undefined;
}
function validatePassword(value: string): string | undefined {
  if (!value) return "Vui lòng nhập mật khẩu";
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`;
  }
  return undefined;
}

/**
 * UserFormModal — form tạo/sửa user.
 *
 * Đã được tái cấu trúc lên `shared/components/modals/` để các feature
 * (users, dashboard QuickActions...) cùng dùng chung — tránh trùng code,
 * không phá ranh giới feature-based.
 *
 * - `user=null` → chế độ thêm mới
 * - `user!=null` → chế độ sửa user đó
 */
export interface UserFormModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  /** Callback khi tạo/sửa thành công để page refresh & hiện toast. */
  onSuccess: (user: User, mode: "create" | "update") => void;
}

export function UserFormModal({
  open,
  user,
  onClose,
  onSuccess,
}: UserFormModalProps) {
  const isEdit = Boolean(user);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mỗi lần mở modal → reset state từ props (tránh giữ data user cũ).
  useEffect(() => {
    if (!open) return;
    setFullName(user?.fullName ?? "");
    setEmail(user?.email ?? "");
    setPhone(user?.phone ?? "");
    setPassword(""); // luôn rỗng — không cho sửa password ở đây
    setRole(user?.role ?? "STUDENT");
    setErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }, [open, user]);

  function validateAll(): boolean {
    const next: FieldErrors = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      phone: validatePhone(phone),
      role: role ? undefined : "Vui lòng chọn vai trò",
    };
    if (!isEdit) next.password = validatePassword(password);
    setErrors(next);
    return !next.fullName && !next.email && !next.phone && !next.password && !next.role;
  }

  function handleBlur(field: keyof FieldErrors) {
    let value: string | undefined;
    let err: string | undefined;
    switch (field) {
      case "fullName":
        value = fullName;
        err = validateFullName(value);
        break;
      case "email":
        value = email;
        err = validateEmail(value);
        break;
      case "phone":
        value = phone;
        err = validatePhone(value);
        break;
      case "password":
        value = password;
        err = validatePassword(value);
        break;
    }
    setErrors((prev) => ({ ...prev, [field]: err }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      let result: User;
      if (isEdit && user) {
        const payload: UpdateUserPayload = {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
        };
        result = await updateUser(user.id, payload);
        onSuccess(result, "update");
      } else {
        const payload: CreateUserPayload = {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role,
        };
        result = await createUser(payload);
        onSuccess(result, "create");
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      // Email đã tồn tại thường kèm status 400, gán inline dưới ô email cho UX rõ.
      if (/email/i.test(message)) {
        setErrors((prev) => ({ ...prev, email: message }));
      } else {
        setSubmitError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? () => undefined : onClose}
      title={isEdit ? "Sửa người dùng" : "Thêm người dùng"}
      size="md"
    >
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        {submitError ? (
          <Alert variant="error" onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        ) : null}

        <Input
          label="Họ và tên"
          placeholder="Nguyễn Văn A"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onBlur={() => handleBlur("fullName")}
          error={errors.fullName}
          autoComplete="name"
          required
          disabled={isSubmitting}
        />

        <Input
          type="email"
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => handleBlur("email")}
          error={errors.email}
          autoComplete="email"
          required
          disabled={isSubmitting}
        />

        <Input
          type="tel"
          label="Số điện thoại"
          placeholder="VD: 0912345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => handleBlur("phone")}
          error={errors.phone}
          hint="Gồm đúng 10 chữ số, bắt đầu bằng 0"
          autoComplete="tel"
          required
          disabled={isSubmitting}
        />

        {!isEdit ? (
          <Input
            type="password"
            label="Mật khẩu"
            placeholder="Ít nhất 6 ký tự"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => handleBlur("password")}
            error={errors.password}
            autoComplete="new-password"
            required
            disabled={isSubmitting}
          />
        ) : (
          <p className={styles.note}>
            Để đổi mật khẩu, dùng chức năng "Đặt lại mật khẩu" sau khi cập nhật người dùng.
          </p>
        )}

        <div className={styles.field}>
          <label htmlFor="role-select" className={styles.label}>
            Vai trò
          </label>
          <select
            id="role-select"
            className={styles.select}
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={isSubmitting}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.role ? (
            <span className={styles.fieldError} role="alert">
              {errors.role}
            </span>
          ) : null}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Huỷ
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEdit ? "Lưu thay đổi" : "Tạo người dùng"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}