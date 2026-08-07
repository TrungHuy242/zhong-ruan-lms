/**
 * NotificationFormPage — trang tạo broadcast notification (Admin).
 *
 * Hallmark stamp:
 *   macrostructure: form-led · genre: modern-minimal · theme: design-system-locked (DESIGN.md §10)
 *   tone: utilitarian · anchor hue: brand-red #C8102E
 *   shape: admin-radius-input 6px / control 8px · shadow: admin-control 0.08
 *   font: Be Vietnam Pro only (single-font admin shell)
 *   diversification: 5 form pages share 1 macrostructure (DEFER to §10)
 *
 * Routing:
 *   /notifications/new  → create mode (chỉ create, không edit)
 *
 * Đặc thù:
 *   - Gửi cho "Tất cả" → resolve tất cả role rồi broadcast tuần tự.
 *   - Gửi cho "Theo vai trò" → chỉ gửi user có role đó.
 *   - Progress bar trong form khi đang gửi (chunk 4 song song).
 *
 * Thay thế NotificationFormModal — URL bookmarkable, Back tự nhiên.
 */

import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import {
  Alert,
  Button,
  Input,
} from "../../../shared/components/ui";
import {
  PageHeader,
  StickyFooter,
} from "../../../shared/components/layout";
import { useToast } from "../../../shared/contexts/ToastContext";
import { ApiError } from "../../../shared/api";
import {
  createNotification,
  type Notification,
  type NotificationType,
} from "../services/notificationApi";
import { listUsers, type User, type UserRole } from "../../users";
import styles from "./NotificationFormPage.module.css";

type AudienceMode = "all" | "role";

interface FieldErrors {
  title?: string;
  message?: string;
  role?: string;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Quản trị viên" },
  { value: "TEACHER", label: "Giáo viên" },
  { value: "STUDENT", label: "Học viên" },
];

const TYPE_OPTIONS: { value: NotificationType; label: string }[] = [
  { value: "INFO", label: "Thông tin" },
  { value: "SUCCESS", label: "Thành công" },
  { value: "WARNING", label: "Cảnh báo" },
  { value: "ERROR", label: "Lỗi" },
];

function validateTitle(value: string): string | undefined {
  if (!value.trim()) return "Vui lòng nhập tiêu đề";
  if (value.trim().length > 200) return "Tiêu đề tối đa 200 ký tự";
  return undefined;
}
function validateMessage(value: string): string | undefined {
  if (!value.trim()) return "Vui lòng nhập nội dung";
  if (value.trim().length > 1000) return "Nội dung tối đa 1000 ký tự";
  return undefined;
}

export function NotificationFormPage() {
  const navigate = useNavigate();
  const toast = useToast();

  // ===== Form state =====
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("INFO");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("all");
  const [role, setRole] = useState<UserRole>("STUDENT");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  // ===== Document title =====
  useState(() => {
    document.title = "Tạo thông báo — Zhong Ruan LMS";
  });

  function handleBack() {
    if (isSubmitting) return;
    navigate("/notifications");
  }

  function validateAll(): boolean {
    const next: FieldErrors = {
      title: validateTitle(title),
      message: validateMessage(message),
    };
    if (audienceMode === "role" && !role) {
      next.role = "Vui lòng chọn vai trò";
    }
    setErrors(next);
    return !next.title && !next.message && !next.role;
  }

  async function resolveRecipients(): Promise<User[]> {
    if (audienceMode === "all") {
      // Gọi nhiều role để gộp (BE chỉ filter theo role đơn lẻ).
      const [admins, teachers, students] = await Promise.all([
        listUsers({ role: "ADMIN" }),
        listUsers({ role: "TEACHER" }),
        listUsers({ role: "STUDENT" }),
      ]);
      return [...admins.users, ...teachers.users, ...students.users];
    }
    const result = await listUsers({ role });
    return result.users;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      const recipients = await resolveRecipients();
      if (recipients.length === 0) {
        toast.error(
          audienceMode === "all"
            ? "Hệ thống chưa có người dùng nào để gửi thông báo"
            : `Không có người dùng nào đang giữ vai trò ${role}`
        );
        setIsSubmitting(false);
        return;
      }

      const total = recipients.length;
      setProgress(`Đang gửi tới 0 / ${total} người dùng...`);

      const created: Notification[] = [];
      let failed = 0;
      // Chạy tuần tự chunk 4 để tránh overwhelm BE.
      const CHUNK = 4;
      for (let i = 0; i < recipients.length; i += CHUNK) {
        const slice = recipients.slice(i, i + CHUNK);
        const results = await Promise.allSettled(
          slice.map((u) =>
            createNotification({
              userId: u.id,
              type,
              title: title.trim(),
              message: message.trim(),
            })
          )
        );
        results.forEach((r) => {
          if (r.status === "fulfilled") created.push(r.value);
          else failed++;
        });
        setProgress(`Đang gửi tới ${created.length} / ${total} người dùng...`);
      }

      if (failed > 0) {
        toast.warning(
          `Đã gửi ${created.length}/${total} thông báo thành công, ${failed} lỗi.`
        );
        setIsSubmitting(false);
        setProgress(null);
      } else {
        toast.success(`Đã gửi ${created.length} thông báo`);
        window.dispatchEvent(new CustomEvent("lms:notification-created"));
        navigate("/notifications");
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      toast.error(message);
      setIsSubmitting(false);
      setProgress(null);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Tạo thông báo mới"
        description="Gửi thông báo broadcast tới tất cả người dùng hoặc theo vai trò"
        breadcrumb={[
          { label: "Quản lý", to: "/dashboard" },
          { label: "Thông báo", to: "/notifications" },
          { label: "Tạo mới" },
        ]}
        onBack={handleBack}
      />

      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        {progress ? <Alert variant="info">{progress}</Alert> : null}

        {/* Tiêu đề */}
        <Input
          label="Tiêu đề"
          placeholder="VD: Bảo trì hệ thống tối nay"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          maxLength={200}
          required
          disabled={isSubmitting}
        />

        {/* Nội dung */}
        <div className={styles.field}>
          <label htmlFor="notif-message" className={styles.label}>
            Nội dung
          </label>
          <textarea
            id="notif-message"
            className={styles.textarea}
            rows={5}
            placeholder="Nội dung chi tiết của thông báo..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSubmitting}
            maxLength={1000}
          />
          {errors.message ? (
            <span className={styles.fieldError} role="alert">
              {errors.message}
            </span>
          ) : (
            <span className={styles.hint}>{message.length} / 1000 ký tự</span>
          )}
        </div>

        {/* Loại thông báo */}
        <div className={styles.field}>
          <label className={styles.label}>Loại thông báo</label>
          <div className={styles.typeGroup} role="radiogroup">
            {TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className={styles.typeOption}>
                <input
                  type="radio"
                  name="type"
                  value={opt.value}
                  checked={type === opt.value}
                  onChange={() => setType(opt.value)}
                  disabled={isSubmitting}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Đối tượng nhận */}
        <div className={styles.field}>
          <label className={styles.label}>Đối tượng nhận</label>
          <div className={styles.audienceGroup}>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="audience"
                checked={audienceMode === "all"}
                onChange={() => setAudienceMode("all")}
                disabled={isSubmitting}
              />
              <span>Tất cả người dùng</span>
            </label>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="audience"
                checked={audienceMode === "role"}
                onChange={() => setAudienceMode("role")}
                disabled={isSubmitting}
              />
              <span>Theo vai trò</span>
            </label>
          </div>

          {audienceMode === "role" ? (
            <div className={styles.roleSelect}>
              <label htmlFor="notif-role" className={styles.subLabel}>
                Vai trò
              </label>
              <select
                id="notif-role"
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
          ) : null}
        </div>

        {/* Sticky submit footer */}
        <StickyFooter>
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={!isSubmitting ? <Save size={16} /> : undefined}
          >
            Gửi thông báo
          </Button>
        </StickyFooter>
      </form>
    </div>
  );
}

export default NotificationFormPage;
// ArrowLeft unused — kept import for future 404 use
void ArrowLeft;
