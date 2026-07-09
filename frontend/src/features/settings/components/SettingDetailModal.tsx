import { Button, Modal } from "../../../shared/components/ui";
import type { Setting } from "../services/settingApi";
import styles from "./SettingDetailModal.module.css";

export interface SettingDetailModalProps {
  open: boolean;
  setting: Setting | null;
  onClose: () => void;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return value;
  }
}

function tryRenderValue(value: string): React.ReactNode {
  // Nếu value trông giống JSON → format đẹp hơn cho dễ đọc.
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return <pre className={styles.pre}>{JSON.stringify(parsed, null, 2)}</pre>;
    } catch {
      return <span className={styles.value}>{value}</span>;
    }
  }
  return <span className={styles.value}>{value}</span>;
}

export function SettingDetailModal({
  open,
  setting,
  onClose,
}: SettingDetailModalProps) {
  if (!setting) {
    return (
      <Modal open={open} onClose={onClose} title="Chi tiết cấu hình" size="md">
        <p className={styles.placeholder}>Không có dữ liệu</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Chi tiết cấu hình" size="md">
      <div className={styles.body}>
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Key</h4>
          <span className={[styles.value, styles.mono].join(" ")}>
            {setting.key}
          </span>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Value</h4>
          {tryRenderValue(setting.value)}
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Description</h4>
          <p className={styles.value}>
            {setting.description?.trim() ? setting.description : (
              <em className={styles.empty}>Không có mô tả</em>
            )}
          </p>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Thời gian tạo</h4>
          <p className={styles.value}>{formatDateTime(setting.createdAt)}</p>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Cập nhật lần cuối</h4>
          <p className={styles.value}>{formatDateTime(setting.updatedAt)}</p>
        </section>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
}