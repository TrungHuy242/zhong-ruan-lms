import { Button, Modal } from "../../../shared/components/ui";
import { detectValueKind, type Setting, type ValueKind } from "../services/settingApi";
import styles from "./SettingDetailModal.module.css";

export interface SettingDetailModalProps {
  open: boolean;
  setting: Setting | null;
  onClose: () => void;
  /**
   * Tên người cập nhật. BE hiện chưa trả về — fallback "—" hoặc tuỳ parent
   * map từ audit log (nếu có).
   */
  updatedBy?: string | null;
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

const VALUE_KIND_LABELS: Record<ValueKind, string> = {
  boolean: "Boolean (true/false)",
  number: "Number",
  json: "JSON",
  longText: "Long text (>120 ký tự)",
  text: "Text",
};

const GROUP_LABELS: Record<NonNullable<Setting["group"]>, string> = {
  General: "Chung",
  Security: "Bảo mật",
  Upload: "Tải lên",
  Notification: "Thông báo",
  System: "Hệ thống",
};

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
  updatedBy,
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

  const kind = detectValueKind(setting.value);
  const groupLabel = setting.group
    ? `${GROUP_LABELS[setting.group]} (${setting.group})`
    : "Chưa phân nhóm";

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
          <h4 className={styles.sectionTitle}>Kiểu dữ liệu</h4>
          <p className={styles.value}>
            <span className={styles.typeBadge}>{VALUE_KIND_LABELS[kind]}</span>
          </p>
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
          <h4 className={styles.sectionTitle}>Nhóm cấu hình</h4>
          <p className={styles.value}>
            <span className={styles.groupBadge}>{groupLabel}</span>
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

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Người cập nhật</h4>
          <p className={styles.value}>
            {updatedBy?.trim() ? (
              updatedBy
            ) : (
              <em className={styles.empty}>Chưa ghi nhận (BE chưa trả trường này)</em>
            )}
          </p>
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