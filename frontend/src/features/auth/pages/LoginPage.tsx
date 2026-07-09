import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Card, Input } from "../../../shared/components/ui";
import { authStorage } from "../../../shared/storage/authStorage";
import { login } from "../services/authApi";
import { ApiError } from "../../../shared/api";
import styles from "./LoginPage.module.css";

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "Vui lòng nhập email";
  if (!EMAIL_REGEX.test(email.trim())) return "Email không đúng định dạng";
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) return "Vui lòng nhập mật khẩu";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`;
  }
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

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Nếu đã có token hợp lệ (F5 / truy cập trực tiếp /login khi đã login) → đẩy về /dashboard.
  useEffect(() => {
    if (authStorage.getAccessToken()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  // Nếu vừa đăng ký thành công ở /register → prefill email để người dùng đỡ phải gõ lại.
  useEffect(() => {
    const state = location.state as
      | { justRegistered?: boolean; registeredEmail?: string }
      | null;
    if (state?.justRegistered && state.registeredEmail) {
      setEmail(state.registeredEmail);
    }
  }, [location.state]);

  function validateField(field: "email" | "password", value: string): string | undefined {
    return field === "email" ? validateEmail(value) : validatePassword(value);
  }

  function handleBlur(field: "email" | "password") {
    const value = field === "email" ? email : password;
    const err = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: err }));
  }

  function validateAll(): boolean {
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setErrors({ email: emailErr, password: passwordErr });
    return !emailErr && !passwordErr;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Chặn double-submit: Enter có thể bắn 2 nhịp trước khi React kịp disable fieldset.
    if (isLoading) return;
    setApiError(null);
    if (!validateAll()) return;

    setIsLoading(true);
    try {
      const res = await login(email.trim(), password);
      authStorage.setSession(res);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      setApiError(message);
      // Giữ email, xoá password theo yêu cầu PASS.
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  }

  // Nếu navigate qua /login khi đã login (qua state.from) — đã xử lý ở useEffect.
  const from = (location.state as { from?: string } | null)?.from;
  if (authStorage.getAccessToken() && from) {
    return <Navigate to={from} replace />;
  }

  // Nếu vừa đăng ký thành công ở /register → hiển thị banner xác nhận.
  const locationState = location.state as
    | { justRegistered?: boolean; registeredEmail?: string }
    | null;
  const justRegistered = Boolean(locationState?.justRegistered);

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel} aria-hidden="true">
        <img
          src="/Banner/Login.png"
          alt=""
          className={styles.brandImage}
        />
      </section>

      <section className={styles.formPanel}>
        <Card className={styles.formCard} padding="lg">
          <header className={styles.formHeader}>
            <h2 className={styles.formTitle}>Đăng nhập</h2>
            <p className={styles.formSubtitle}>
              Đăng nhập để tiếp tục vào hệ thống Zhong Ruan LMS.
            </p>
          </header>

          {apiError ? (
            <div className={styles.alertWrap}>
              <Alert variant="error" onClose={() => setApiError(null)}>
                {apiError}
              </Alert>
            </div>
          ) : null}

          {justRegistered && !apiError ? (
            <div className={styles.alertWrap}>
              <Alert variant="success">
                Đăng ký tài khoản thành công. Vui lòng đăng nhập để tiếp tục.
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
                type={showPassword ? "text" : "password"}
                name="password"
                label="Mật khẩu"
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur("password")}
                error={errors.password}
                required
                rightIcon={showPassword ? <EyeOffIcon /> : <EyeIcon />}
                onRightIconClick={() => setShowPassword((v) => !v)}
              />

              <div className={styles.forgotRow}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // TODO: nối route /forgot-password khi BE màn quên mật khẩu sẵn sàng.
                  }}
                >
                  Quên mật khẩu?
                </Button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                loadingText="Đang đăng nhập..."
              >
                Đăng nhập
              </Button>
            </fieldset>
          </form>

          <footer className={styles.formFooter}>
            <span>Chưa có tài khoản?</span>{" "}
            <Link to="/register" className={styles.footerLink}>
              Đăng ký ngay
            </Link>
          </footer>
        </Card>
      </section>
    </main>
  );
}
