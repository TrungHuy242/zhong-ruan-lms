import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Bell, UploadCloud, Settings } from "lucide-react";
import { UserFormModal } from "../../../shared/components/modals/UserFormModal";
import { NotificationFormModal } from "../../../shared/components/modals/NotificationFormModal";
import { uploadFile } from "../../files/services/fileApi";
import { useNotifications } from "../../../shared/contexts/NotificationContext";
import styles from "./QuickActions.module.css";

export interface QuickActionsProps {
  /**
   * Callback báo cho parent biết đã tạo thành công User/Notification/Upload
   * để parent gọi lại API overview + monthly để cập nhật số liệu ngay.
   */
  onChanged: (kind: "user" | "notification" | "upload") => void;
}

const ACTIONS = [
  {
    key: "user",
    icon: UserPlus,
    label: "Thêm User",
    hint: "Tạo người dùng mới",
  },
  {
    key: "notification",
    icon: Bell,
    label: "Tạo Notification",
    hint: "Gửi thông báo broadcast",
  },
  {
    key: "upload",
    icon: UploadCloud,
    label: "Upload File",
    hint: "Tải file mới lên",
  },
  {
    key: "settings",
    icon: Settings,
    label: "Cài đặt hệ thống",
    hint: "Mở trang Settings",
  },
] as const;

/**
 * QuickActions — 4 nút hành động nhanh trên Dashboard.
 *
 * - 3 nút đầu mở modal tương ứng ngay tại Dashboard (dùng modal đã được
 *   tái cấu trúc lên shared/components/modals/).
 * - Nút "Cài đặt" navigate thẳng sang /settings (vì Settings có layout riêng).
 * - Sau khi tạo thành công, parent nhận callback `onChanged` để gọi lại
 *   API overview + monthly (không cần F5).
 */
export function QuickActions({ onChanged }: QuickActionsProps) {
  const navigate = useNavigate();
  const { refresh } = useNotifications();

  // State cho 3 modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUserSuccess = useCallback(() => {
    setUserModalOpen(false);
    onChanged("user");
  }, [onChanged]);

  const handleNotifSuccess = useCallback(async () => {
    setNotifModalOpen(false);
    // Bell badge cần refresh (số unread có thể đã tăng).
    void refresh();
    onChanged("notification");
  }, [onChanged, refresh]);

  const handleUploadOne = useCallback(
    async (file: File): Promise<void> => {
      setUploading(true);
      setUploadError(null);
      try {
        await uploadFile(file);
        onChanged("upload");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Upload thất bại";
        setUploadError(message);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [onChanged]
  );

  function handleAction(key: (typeof ACTIONS)[number]["key"]) {
    if (key === "settings") {
      navigate("/settings");
      return;
    }
    if (key === "user") {
      setUserModalOpen(true);
      return;
    }
    if (key === "notification") {
      setNotifModalOpen(true);
      return;
    }
    if (key === "upload") {
      setUploadModalOpen(true);
      return;
    }
  }

  return (
    <>
      <ul className={styles.grid}>
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.key}>
              <button
                type="button"
                className={styles.card}
                onClick={() => handleAction(a.key)}
                aria-label={`${a.label} — ${a.hint}`}
                title={a.hint}
              >
                <span className={styles.icon} aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className={styles.text}>
                  <span className={styles.label}>{a.label}</span>
                  <span className={styles.hint}>{a.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <UserFormModal
        open={userModalOpen}
        user={null}
        onClose={() => setUserModalOpen(false)}
        onSuccess={(_user, _mode) => handleUserSuccess()}
      />

      <NotificationFormModal
        open={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
        onSuccess={(_created) => void handleNotifSuccess()}
      />

      {uploadModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Upload file"
          className={styles.uploadOverlay}
          onClick={(e) => {
            // Click overlay → đóng
            if (e.target === e.currentTarget) setUploadModalOpen(false);
          }}
        >
          <div className={styles.uploadDialog}>
            <div className={styles.uploadHeader}>
              <h3 className={styles.uploadTitle}>Upload file</h3>
              <button
                type="button"
                className={styles.uploadClose}
                onClick={() => setUploadModalOpen(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div className={styles.uploadBody}>
              {uploadError ? (
                <p className={styles.uploadError}>{uploadError}</p>
              ) : null}
              <QuickUploadZone
                onUpload={handleUploadOne}
                disabled={uploading}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Upload zone thu gọn cho Quick Action — render inline không cần Modal UI. */
function QuickUploadZone({
  onUpload,
  disabled,
}: {
  onUpload: (file: File) => Promise<void>;
  disabled: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setFile(null);
    setProgress(0);
    setError(null);
    setDone(false);
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setProgress(0);
    setError(null);
    setDone(false);
    e.target.value = "";
  }

  async function handleSubmit() {
    if (!file) return;
    try {
      // Mock progress (UploadZone cũng vậy — fetch thuần không expose progress).
      const interval = window.setInterval(() => {
        setProgress((p) => (p < 90 ? p + 10 : p));
      }, 200);
      await onUpload(file);
      window.clearInterval(interval);
      setProgress(100);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload thất bại");
    }
  }

  return (
    <div className={styles.quickZone}>
      {!file ? (
        <label className={styles.dropZone}>
          <input
            type="file"
            onChange={handleSelect}
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
            disabled={disabled}
            className={styles.fileInput}
          />
          <UploadCloud size={28} />
          <p className={styles.dropTitle}>Bấm để chọn file</p>
          <p className={styles.dropHint}>
            Hỗ trợ: jpg, jpeg, png, pdf, doc, docx. Tối đa 10MB.
          </p>
        </label>
      ) : (
        <div className={styles.selectedWrap}>
          <p className={styles.selectedName}>{file.name}</p>
          <p className={styles.selectedMeta}>
            {(file.size / 1024).toFixed(1)} KB
          </p>
          {progress > 0 && progress < 100 ? (
            <div className={styles.progressTrack}>
              <div
                className={styles.progressBar}
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
          {done ? (
            <p className={styles.successText}>Đã tải lên thành công!</p>
          ) : null}
          {error ? <p className={styles.uploadError}>{error}</p> : null}
          <div className={styles.uploadActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={reset}
              disabled={disabled}
            >
              Chọn lại
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleSubmit}
              disabled={disabled || done}
            >
              {done ? "Xong" : "Tải lên"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}