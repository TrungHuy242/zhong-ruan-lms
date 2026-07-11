import { FormEvent, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
} from "../../../shared/components/ui";
import { ChangePasswordModal } from "../components/ChangePasswordModal";
import { AvatarUploader } from "../components/AvatarUploader";
import { LoginHistoryList } from "../components/LoginHistoryList";
import {
  History as HistoryIcon,
  KeyRound,
  Mail,
  Phone,
  Shield,
  User as UserIcon,
  Save,
  RefreshCcw,
} from "lucide-react";
import {
  getMe,
  updateMe,
  validateFullName,
  validatePhone,
  type ProfileUser,
  type UserRole,
} from "../services/profileApi";
import { ApiError } from "../../../shared/api";
import { authStorage } from "../../../shared/storage/authStorage";
import styles from "./ProfilePage.module.css";

interface FormState {
  fullName: string;
  phone: string;
}

interface FormErrors {
  fullName?: string;
  phone?: string;
  submit?: string;
}

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giảng viên",
  STUDENT: "Học viên",
};

const ROLE_TONE: Record<UserRole, string> = {
  ADMIN: styles.badgeAdmin,
  TEACHER: styles.badgeTeacher,
  STUDENT: styles.badgeStudent,
};

export function ProfilePage() {
  // ===== State =====
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [form, setForm] = useState<FormState>({ fullName: "", phone: "" });
  const [errors, setErrors] = useState<FormErrors>({});

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);

  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // ===== Load =====
  async function loadProfile() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getMe();
      setUser(data);
      setForm({
        fullName: data.fullName ?? "",
        phone: data.phone ?? "",
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được hồ sơ";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  // ===== Handlers =====
  function handleChange<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, submit: undefined }));
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    const fullNameCheck = validateFullName(form.fullName);
    if (!fullNameCheck.ok) next.fullName = fullNameCheck.error;
    const phoneCheck = validatePhone(form.phone);
    if (!phoneCheck.ok) next.phone = phoneCheck.error;
    return next;
  }

  function isDirty(): boolean {
    if (!user) return false;
    return (
      form.fullName.trim() !== user.fullName ||
      (form.phone.trim() || null) !== (user.phone ?? null)
    );
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
      const updated = await updateMe({
        fullName: form.fullName,
        // Nếu user để trống phone → null (clear).
        phone: form.phone.trim() === "" ? null : form.phone.trim(),
      });
      setUser(updated);
      // Đồng bộ lại authStorage.user để header avatar / bell hiển thị đúng.
      const stored = authStorage.getUser();
      if (stored) {
        authStorage.setSession({
          accessToken: authStorage.getAccessToken() ?? "",
          refreshToken: authStorage.getRefreshToken() ?? "",
          user: {
            id: String(stored.id),
            fullName: updated.fullName,
            email: updated.email,
            phone: updated.phone,
            role: updated.role,
            status: updated.status,
          },
        });
      }
      setAlertMessage({ type: "success", text: "Cập nhật hồ sơ thành công." });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Lỗi không xác định";
      setErrors({ submit: message });
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    if (!user) return;
    setForm({
      fullName: user.fullName ?? "",
      phone: user.phone ?? "",
    });
    setErrors({});
  }

  /**
   * Avatar uploader cập nhật state local sau upload/remove thành công.
   * Đồng thời đồng bộ authStorage.user.fullName (các field khác giữ nguyên) để header luôn
   * hiển thị tên mới — avatar sẽ được Header render qua storedName nếu có.
   */
  function handleAvatarChange(updated: ProfileUser) {
    setUser(updated);
    const stored = authStorage.getUser();
    if (stored) {
      authStorage.setSession({
        accessToken: authStorage.getAccessToken() ?? "",
        refreshToken: authStorage.getRefreshToken() ?? "",
        user: {
          id: String(stored.id),
          fullName: updated.fullName,
          email: updated.email,
          phone: updated.phone,
          role: updated.role,
          status: updated.status,
        },
      });
    }
  }

  function handleAvatarMessage(type: "success" | "error", text: string) {
    setAlertMessage({ type, text });
  }

  // ===== Render =====
  if (loading) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            <UserIcon size={24} className={styles.titleIcon} aria-hidden="true" />
            Hồ sơ cá nhân
          </h1>
        </header>
        <div className={styles.skeletonStack}>
          <div className={[styles.skeleton, styles.skeletonCard].join(" ")} />
          <div className={[styles.skeleton, styles.skeletonCard].join(" ")} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <UserIcon size={24} className={styles.titleIcon} aria-hidden="true" />
            Hồ sơ cá nhân
          </h1>
          <p className={styles.subtitle}>
            Xem và cập nhật thông tin cá nhân của bạn. Email và vai trò được
            quản lý bởi quản trị viên và không thể thay đổi tại đây.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            leftIcon={<KeyRound size={16} />}
            onClick={() => setPwModalOpen(true)}
          >
            Đổi mật khẩu
          </Button>
        </div>
      </header>

      {loadError ? (
        <div className={styles.errorWrap}>
          <Alert variant="error">{loadError}</Alert>
          <Button variant="secondary" size="sm" onClick={loadProfile}>
            Thử lại
          </Button>
        </div>
      ) : null}

      {alertMessage ? (
        <Alert
          variant={
            alertMessage.type === "success"
              ? "success"
              : alertMessage.type === "error"
              ? "error"
              : "info"
          }
          onClose={() => setAlertMessage(null)}
        >
          {alertMessage.text}
        </Alert>
      ) : null}

      {user ? (
        <>
          <div className={styles.grid}>
            <Card padding="md" className={styles.identityCard}>
              <div className={styles.identityTop}>
                <AvatarUploader
                  user={user}
                  onChange={handleAvatarChange}
                  onMessage={handleAvatarMessage}
                />
                <div className={styles.identityInfo}>
                  <h2 className={styles.identityName}>{user.fullName}</h2>
                  <div className={styles.identityMeta}>
                    <span className={styles.metaItem}>
                      <Mail size={14} aria-hidden="true" />
                      {user.email}
                    </span>
                  </div>
                  <div className={styles.badgeRow}>
                    <span
                      className={[styles.badge, ROLE_TONE[user.role]].join(" ")}
                    >
                      <Shield size={12} aria-hidden="true" />
                      {ROLE_LABEL[user.role]}
                    </span>
                  </div>
                </div>
              </div>
              <div className={styles.metaList}>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>ID</span>
                  <span className={styles.metaValue}>#{user.id}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Trạng thái</span>
                  <span
                    className={[
                      styles.metaValue,
                      user.status === "ACTIVE"
                        ? styles.statusActive
                        : styles.statusInactive,
                    ].join(" ")}
                  >
                    {user.status}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Số điện thoại</span>
                  <span className={styles.metaValue}>
                    {user.phone?.trim() ? user.phone : "—"}
                  </span>
                </div>
              </div>
            </Card>

            <Card padding="md" className={styles.formCard}>
              <form className={styles.form} onSubmit={handleSubmit} noValidate>
                {errors.submit ? (
                  <div className={styles.submitError} role="alert">
                    {errors.submit}
                  </div>
                ) : null}

                <Input
                  label="Họ và tên"
                  required
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  disabled={submitting}
                  error={errors.fullName}
                  placeholder="Nhập họ và tên đầy đủ"
                  leftIcon={<UserIcon size={16} />}
                  maxLength={100}
                  autoComplete="name"
                />

                <Input
                  label="Email"
                  value={user.email}
                  disabled
                  readOnly
                  leftIcon={<Mail size={16} />}
                  hint="Email được dùng để đăng nhập, không thể thay đổi tại đây."
                />

                <Input
                  label="Số điện thoại"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  disabled={submitting}
                  error={errors.phone}
                  placeholder="VD: 0901 234 567"
                  leftIcon={<Phone size={16} />}
                  hint="Để trống nếu không muốn cung cấp."
                  maxLength={20}
                  autoComplete="tel"
                  inputMode="tel"
                />

                <div className={styles.field}>
                  <label className={styles.label}>Vai trò</label>
                  <div className={styles.roleBox}>
                    <Shield size={16} className={styles.roleIcon} aria-hidden="true" />
                    <span>{ROLE_LABEL[user.role]}</span>
                  </div>
                  <span className={styles.hintText}>
                    Vai trò được cấp bởi quản trị viên, không thể thay đổi tại đây.
                  </span>
                </div>

                <div className={styles.actions}>
                  <Button
                    variant="secondary"
                    type="button"
                    leftIcon={<RefreshCcw size={16} />}
                    onClick={handleReset}
                    disabled={submitting || !isDirty()}
                  >
                    Đặt lại
                  </Button>
                  <Button
                    type="submit"
                    isLoading={submitting}
                    loadingText="Đang lưu..."
                    leftIcon={<Save size={16} />}
                    disabled={!isDirty() && !submitting}
                  >
                    Lưu thay đổi
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* ===== Login history ===== */}
          <section className={styles.historySection} aria-labelledby="login-history-heading">
            <header className={styles.historyHeader}>
              <h3 id="login-history-heading" className={styles.historyTitle}>
                <HistoryIcon size={18} aria-hidden="true" />
                Lịch sử đăng nhập
              </h3>
              <p className={styles.historyHint}>
                10 lần đăng nhập và đăng xuất gần nhất của bạn. Nếu phát hiện hoạt động lạ,
                vui lòng đổi mật khẩu ngay.
              </p>
            </header>
            <Card padding="md">
              <LoginHistoryList limit={10} />
            </Card>
          </section>
        </>
      ) : null}

      <ChangePasswordModal
        open={pwModalOpen}
        onClose={() => setPwModalOpen(false)}
        onSuccess={() =>
          setAlertMessage({ type: "success", text: "Đổi mật khẩu thành công." })
        }
      />
    </div>
  );
}