import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Card, Input } from "../../../shared/components/ui";
import { authStorage } from "../../../shared/storage/authStorage";
import { register } from "../services/authApi";
import { ApiError } from "../../../shared/api";
import styles from "./RegisterPage.module.css";

interface FieldErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Số điện thoại VN: bắt đầu bằng 0, đúng 10 chữ số.
const PHONE_REGEX = /^0\d{9}$/;
const MIN_PASSWORD_LENGTH = 6;

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

function validateConfirmPassword(password: string, confirm: string): string | undefined {
  if (!confirm) return "Vui lòng xác nhận mật khẩu";
  if (confirm !== password) return "Mật khẩu xác nhận không khớp";
  return undefined;
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.6 6.1A9.7 9.7 0 0112 6c6.5 0 10 6 10 6a17.4 17.4 0 01-3.1 3.9M6.6 6.6C3.7 8.5 2 12 2 12s3.5 6 10 6c1.5 0 2.9-.3 4.1-.7"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.9 9.9a3 3 0 004.2 4.2"
      />
    </svg>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Nếu đã có token hợp lệ (F5 / truy cập trực tiếp /register khi đã login) → đẩy về /dashboard.
  useEffect(() => {
    if (authStorage.getAccessToken()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  // Khi mật khẩu thay đổi, nếu người dùng đã nhập ô "Xác nhận mật khẩu" rồi
  // thì validate lại real-time để bắt lỗi không khớp ngay lập tức.
  useEffect(() => {
    if (!confirmPassword) return;
    const err = validateConfirmPassword(password, confirmPassword);
    setErrors((prev) => (prev.confirmPassword === err ? prev : { ...prev, confirmPassword: err }));
  }, [password, confirmPassword]);

  function validateField(field: keyof FieldErrors, value: string): string | undefined {
    switch (field) {
      case "fullName":
        return validateFullName(value);
      case "email":
        return validateEmail(value);
      case "phone":
        return validatePhone(value);
      case "password":
        return validatePassword(value);
      case "confirmPassword":
        return validateConfirmPassword(password, value);
    }
  }

  function handleBlur(field: keyof FieldErrors) {
    const value =
      field === "fullName"
        ? fullName
        : field === "email"
        ? email
        : field === "phone"
        ? phone
        : field === "password"
        ? password
        : confirmPassword;
    const err = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: err }));
  }

  function validateAll(): boolean {
    const nextErrors: FieldErrors = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      phone: validatePhone(phone),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
    };
    setErrors(nextErrors);
    return !nextErrors.fullName && !nextErrors.email && !nextErrors.phone && !nextErrors.password && !nextErrors.confirmPassword;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading) return;
    setApiError(null);
    // Xoá lỗi inline email cũ (nếu có) trước khi validate lại.
    setErrors((prev) => ({ ...prev, email: undefined }));
    if (!validateAll()) return;

    setIsLoading(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      // Đăng ký thành công → chuyển về /login, kèm state để LoginPage
      // hiển thị banner success + prefill email (KHÔNG tự đăng nhập, không lưu token).
      navigate("/login", {
        replace: true,
        state: { justRegistered: true, registeredEmail: email.trim() },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Email đã tồn tại → hiển thị ngay dưới ô email cho UX rõ ràng hơn.
        setErrors((prev) => ({
          ...prev,
          email: err.message || "Email đã được sử dụng",
        }));
      } else {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Đã có lỗi xảy ra. Vui lòng thử lại.";
        setApiError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const from = (location.state as { from?: string } | null)?.from;
  if (authStorage.getAccessToken() && from) {
    return <Navigate to={from} replace />;
  }

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel} aria-hidden="true">
        <div className={styles.brandInner}>
          <div className={styles.logoMark}>
            <img
              src="/logo/logo-full.png"
              alt="Zhong Ruan LMS"
              className={styles.logoImg}
            />
          </div>
          <h1 className={styles.brandTitle}>Tạo tài khoản học viên</h1>
          <p className={styles.brandTagline}>
            Đăng ký để bắt đầu hành trình học tiếng Trung cùng Trung tâm Trung Quốc học
            Zhong Ruan.
          </p>
          <ul className={styles.bullets}>
            <li>Tài khoản học viên tạo trong vài giây</li>
            <li>Theo dõi lớp học, điểm danh, học phí</li>
            <li>Báo cáo tiến độ học tập cá nhân</li>
          </ul>
        </div>
      </section>

      <section className={styles.formPanel}>
        <Card className={styles.formCard} padding="lg">
          <header className={styles.formHeader}>
            <h2 className={styles.formTitle}>Đăng ký tài khoản</h2>
            <p className={styles.formSubtitle}>
              Điền thông tin bên dưới để tạo tài khoản học viên mới.
            </p>
          </header>

          {apiError ? (
            <div className={styles.alertWrap}>
              <Alert variant="error" onClose={() => setApiError(null)}>
                {apiError}
              </Alert>
            </div>
          ) : null}

          <form
            onSubmit={handleSubmit}
            noValidate
            aria-busy={isLoading || undefined}
            className={styles.form}
          >
            <fieldset disabled={isLoading} className={styles.fieldset}>
              <Input
                type="text"
                name="fullName"
                label="Họ và tên"
                autoComplete="name"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => handleBlur("fullName")}
                error={errors.fullName}
                required
              />

              <Input
                type="email"
                name="email"
                label="Email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur("email")}
                error={errors.email}
                required
              />

              <Input
                type="tel"
                name="phone"
                label="Số điện thoại"
                autoComplete="tel"
                placeholder="VD: 0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => handleBlur("phone")}
                error={errors.phone}
                hint="Gồm đúng 10 chữ số, bắt đầu bằng 0 (VD: 0912345678)"
                required
              />

              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                label="Mật khẩu"
                autoComplete="new-password"
                placeholder="Ít nhất 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur("password")}
                error={errors.password}
                required
                rightIcon={showPassword ? <EyeOffIcon /> : <EyeIcon />}
                onRightIconClick={() => setShowPassword((v) => !v)}
              />

              <Input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                label="Xác nhận mật khẩu"
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
                error={errors.confirmPassword}
                required
                rightIcon={showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                onRightIconClick={() => setShowConfirmPassword((v) => !v)}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                loadingText="Đang tạo tài khoản..."
              >
                Đăng ký
              </Button>
            </fieldset>
          </form>

          <footer className={styles.formFooter}>
            <span>Đã có tài khoản?</span>{" "}
            <Link to="/login" className={styles.footerLink}>
              Đăng nhập ngay
            </Link>
          </footer>
        </Card>
      </section>
    </main>
  );
}