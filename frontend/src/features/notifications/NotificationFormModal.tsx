import { FormEvent, useEffect, useState } from "react";
import { Alert, Button, Input, Modal } from "../../shared/components/ui";
import {
  createNotification,
  type Notification,
  type NotificationType,
} from "./notificationApi";
import { ApiError } from "../../shared/lib/api";
import { listUsers, type User, type UserRole } from "../users/userApi";
import styles from "./NotificationFormModal.module.css";

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

export interface NotificationFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (created: Notification[]) => void;
}

export function NotificationFormModal({
  open,
  onClose,
  onSuccess,
}: NotificationFormModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("INFO");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("all");
  const [role, setRole] = useState<UserRole>("STUDENT");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  // Reset mỗi lần mở.
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setMessage("");
    setType("INFO");
    setAudienceMode("all");
    setRole("STUDENT");
    setErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
    setProgress(null);
  }, [open]);

  function validateAll(): boolean {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = "Vui lòng nhập tiêu đề";
    else if (title.trim().length > 200) next.title = "Tiêu đề tối đa 200 ký tự";

    if (!message.trim()) next.message = "Vui lòng nhập nội dung";
    else if (message.trim().length > 1000)
      next.message = "Nội dung tối đa 1000 ký tự";

    if (audienceMode === "role" && !role)
      next.role = "Vui lòng chọn vai trò";

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
    setSubmitError(null);
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      const recipients = await resolveRecipients();
      if (recipients.length === 0) {
        setSubmitError(
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
      // Chạy tuần tự để tránh overwhelm BE (limit=4 để tránh quá tải).
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

      onSuccess(created);

      if (failed > 0) {
        setSubmitError(
          `Đã gửi ${created.length}/${total} thông báo thành công, ${failed} lỗi.`
        );
        setIsSubmitting(false);
        setProgress(null);
      } else {
        onClose();
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại.";
      setSubmitError(message);
      setIsSubmitting(false);
      setProgress(null);
    }
  }

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? () => undefined : onClose}
      title="Tạo thông báo mới"
      size="md"
    >
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        {submitError ? (
          <Alert variant="error" onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        ) : null}
        {progress ? (
          <Alert variant="info">{progress}</Alert>
        ) : null}

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
            <span className={styles.hint}>
              {message.length} / 1000 ký tự
            </span>
          )}
        </div>

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

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Huỷ
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Gửi thông báo
          </Button>
        </div>
      </form>
    </Modal>
  );
}