import { Button, Modal, FileIcon } from "../../../shared/components/ui";
import {
  formatFileSize,
  getFileKind,
  getFileKindLabel,
  type FileKind,
} from "../../../shared/validation/fileValidation";
import type { UploadedFile } from "../services/fileApi";
import { Download } from "lucide-react";
import styles from "./FileDetailModal.module.css";

export interface FileDetailModalProps {
  open: boolean;
  file: UploadedFile | null;
  uploaderName?: string | null;
  uploaderEmail?: string | null;
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
    });
  } catch {
    return value;
  }
}

export function FileDetailModal({
  open,
  file,
  uploaderName,
  uploaderEmail,
  onClose,
}: FileDetailModalProps) {
  if (!file) {
    return (
      <Modal open={open} onClose={onClose} title="Thông tin file" size="md">
        <p className={styles.placeholder}>Không có dữ liệu</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </Modal>
    );
  }

  const kind: FileKind = getFileKind(file.originalName || file.mimeType);

  return (
    <Modal open={open} onClose={onClose} title="Thông tin file" size="md">
      <div className={styles.body}>
        <div className={styles.headerRow}>
          <FileIcon
            filename={file.originalName}
            mimeType={file.mimeType}
            kind={kind}
            size={28}
          />
          <div className={styles.headerInfo}>
            <p className={styles.fileName}>{file.originalName}</p>
            <span className={styles.fileBadge}>{getFileKindLabel(kind)}</span>
          </div>
        </div>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Tên file</h4>
          <p className={styles.value}>{file.originalName}</p>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Loại</h4>
          <p className={styles.value}>
            {getFileKindLabel(kind)} ({file.mimeType || "—"})
          </p>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Kích thước</h4>
          <p className={styles.value}>{formatFileSize(file.size)}</p>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Người upload</h4>
          <p className={styles.value}>
            {uploaderName ?? "Không xác định"}
            {uploaderEmail ? ` (${uploaderEmail})` : ""}
            {` · ID: ${file.uploadedById}`}
          </p>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Thời gian upload</h4>
          <p className={styles.value}>{formatDateTime(file.createdAt)}</p>
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Mã định danh</h4>
          <p className={[styles.value, styles.mono].join(" ")}>{file.storedName}</p>
        </section>

        <div className={styles.previewNotice}>
          <Download size={16} />
          <span>
            Tải xuống trực tiếp qua HTTP hiện chưa khả dụng — hệ thống chưa cung
            cấp endpoint serve file vật lý. Sau khi backend bổ sung, bạn có thể
            tải file từ đây.
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
}