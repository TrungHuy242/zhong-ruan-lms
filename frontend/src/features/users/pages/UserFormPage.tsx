/**
 * UserFormPage — trang tạo/sửa user (Admin).
 *
 * Hallmark stamp:
 *   macrostructure: form-led · genre: modern-minimal · theme: design-system-locked (DESIGN.md §10)
 *   tone: utilitarian · anchor hue: brand-red #C8102E
 *   shape: admin-radius-control 8px · shadow: admin-shadow-control 0.08
 *   font: Be Vietnam Pro only (single-font admin shell)
 *   diversification: 5 form pages share 1 macrostructure + theme (DEFER to §10)
 *
 * Routing:
 *   /users/new        → create mode
 *   /users/:id/edit   → edit mode
 *
 * States (8 per Hallmark discipline):
 *   default · hover · focus-visible · active · disabled · loading · error · success
 *
 * Thay thế UserFormModal — URL bookmarkable, Back tự nhiên, full-page layout.
 */

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, X as XIcon } from "lucide-react";
import {
  Button,
  Input,
  Alert,
  Skeleton,
} from "../../../shared/components/ui";
import {
  PageHeader,
  StickyFooter,
} from "../../../shared/components/layout";
import { useToast } from "../../../shared/contexts/ToastContext";
import { ApiError } from "../../../shared/api";
import {
  createUser,
  getUser,
  updateUser,
  type User,
  type UserRole,
} from "../services/userApi";
import { USER_ROLE_LABELS } from "../constants/user.constants";
import styles from "./UserFormPage.module.css";

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
  { value: "ADMIN", label: USER_ROLE_LABELS.ADMIN },
  { value: "TEACHER", label: USER_ROLE_LABELS.TEACHER },
  { value: "STUDENT", label: USER_ROLE_LABELS.STUDENT },
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

export function UserFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // returnTo: URL của list page (kèm search params) do list page truyền qua
  // navigate state. Fallback về "/users" nếu user vào thẳng URL này.
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo || "/users";
  const isEdit = Boolean(id);
  const toast = useToast();

  // ===== Page state =====
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // ===== Form state =====
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== Load user if edit mode =====
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    getUser(id)
      .then((u) => {
        if (cancelled) return;
        setCurrentUser(u);
        setFullName(u.fullName);
        setEmail(u.email);
        setPhone(u.phone ?? "");
        setRole(u.role);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
          setNotFound(true);
        } else {
          setLoadError(
            err instanceof Error
              ? err.message
              : "Không thể tải thông tin người dùng."
          );
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  // ===== Document title =====
  useEffect(() => {
    document.title = isEdit
      ? `Sửa người dùng — Zhong Ruan LMS`
      : `Thêm người dùng — Zhong Ruan LMS`;
  }, [isEdit]);

  // ===== Dirty + back protection =====
  function handleBack() {
    // Khi đã submit thì không confirm (đã navigate tới đây từ save xong)
    if (isSubmitting) return;
    navigate(returnTo);
  }

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
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      if (isEdit && currentUser) {
        await updateUser(currentUser.id, {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
        });
        toast.success("Đã cập nhật người dùng");
        // Notify other parts of app (Dashboard QuickActions) to refresh KPIs
        window.dispatchEvent(new CustomEvent("lms:user-updated"));
      } else {
        await createUser({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role,
        });
        toast.success("Đã tạo người dùng");
        // Notify other parts of app
        window.dispatchEvent(new CustomEvent("lms:user-created"));
      }
      navigate(returnTo);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      // Email đã tồn tại → gán inline dưới ô email
      if (/email/i.test(message)) {
        setErrors((prev) => ({ ...prev, email: message }));
      } else {
        toast.error(message);
      }
      setIsSubmitting(false);
    }
  }

  // ===== Loading skeleton =====
  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="rectangular" height={120} />
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton variant="text" height={20} />
          <Skeleton variant="text" height={20} />
          <Skeleton variant="text" height={20} />
          <Skeleton variant="text" height={20} />
          <Skeleton variant="text" height={20} />
          <Skeleton variant="text" height={20} />
        </div>
      </div>
    );
  }

  // ===== 404 / error =====
  if (notFound) {
    return (
      <div className={styles.page}>
        <Alert variant="error">
          <strong>Không tìm thấy người dùng.</strong> Có thể đã bị xoá hoặc URL không hợp lệ.
        </Alert>
        <div className={styles.actionsRow}>
          <Button
            variant="primary"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => navigate(returnTo)}
          >
            Về danh sách
          </Button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <Alert variant="error">
          <strong>Lỗi:</strong> {loadError}
        </Alert>
        <div className={styles.actionsRow}>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Tải lại
          </Button>
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() => navigate(returnTo)}
          >
            Về danh sách
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={isEdit ? "Sửa người dùng" : "Thêm người dùng"}
        description={
          isEdit
            ? `Cập nhật thông tin cho ${currentUser?.fullName ?? ""}`
            : "Tạo tài khoản người dùng mới trong hệ thống"
        }
        breadcrumb={[
          { label: "Quản lý", to: "/dashboard" },
          { label: "Người dùng", to: "/users" },
          { label: isEdit ? "Sửa" : "Thêm mới" },
        ]}
        onBack={handleBack}
      />

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        {/* Row 1: Họ tên + Email (2-col trên desktop) */}
        <div className={styles.grid2}>
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
        </div>

        {/* Row 2: Số điện thoại + Vai trò */}
        <div className={styles.grid2}>
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
          <div className={styles.field}>
            <label htmlFor="role-select" className={styles.label}>
              Vai trò <span className={styles.required}>*</span>
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
        </div>

        {/* Row 3: Mật khẩu (chỉ create mode) */}
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
          <Alert variant="info">
            Để đổi mật khẩu, dùng chức năng "Đặt lại mật khẩu" trong trang chi tiết người dùng.
          </Alert>
        )}

        {/* Sticky submit footer */}
        <StickyFooter>
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={isSubmitting}
            leftIcon={<XIcon size={16} />}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={!isSubmitting ? <Save size={16} /> : undefined}
          >
            {isEdit ? "Lưu thay đổi" : "Tạo người dùng"}
          </Button>
        </StickyFooter>
      </form>
    </div>
  );
}

export default UserFormPage;
