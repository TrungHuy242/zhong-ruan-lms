/**
 * FileDetailModal — preview mở rộng cho FileManagerPage.
 *
 * Nhánh preview:
 *  - image/*  : <img> trực tiếp
 *  - video/*  : <video controls>
 *  - audio/*  : <audio controls>
 *  - application/pdf : <iframe>
 *  - khác     : thông tin + nút "Tải xuống"
 *
 * Lưu ý: BE hiện chưa static-serve file vật lý. Preview sẽ hiển thị
 * UI đầy đủ nhưng khi load sẽ fail (404). Modal có badge "xem trước chưa
 * khả dụng" rõ ràng để user hiểu — khi BE bổ sung static serve, chỉ cần
 * đổi URL.
 */
import { useEffect, useState } from "react";
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

/**
 * Phân loại MIME thành 4 nhánh preview: image | video | audio | pdf | other.
 */
function getPreviewKind(mimeType: string): "image" | "video" | "audio" | "pdf" | "other" {
  const mime = mimeType.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  return "other";
}

export function FileDetailModal({
  open,
  file,
  uploaderName,
  uploaderEmail,
  onClose,
}: FileDetailModalProps) {
  const [imgError, setImgError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  // Reset error states mỗi khi đổi file
  useEffect(() => {
    setImgError(false);
    setVideoError(false);
    setAudioError(false);
    setIframeError(false);
  }, [file?.id]);

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
  const previewKind = getPreviewKind(file.mimeType);
  const previewUrl = `/api/files/${file.id}/preview`;

  return (
    <Modal open={open} onClose={onClose} title="Thông tin file" size="lg">
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

        {/* ===== Preview block ===== */}
        <section className={styles.previewSection}>
          {previewKind === "image" && !imgError ? (
            <div className={styles.previewFrame}>
              <img
                src={previewUrl}
                alt={file.originalName}
                className={styles.previewImg}
                onError={() => setImgError(true)}
              />
            </div>
          ) : null}

          {previewKind === "video" && !videoError ? (
            <div className={styles.previewFrame}>
              <video
                controls
                className={styles.previewVideo}
                preload="metadata"
                onError={() => setVideoError(true)}
              >
                <source src={previewUrl} type={file.mimeType} />
                Trình duyệt không hỗ trợ thẻ video.
              </video>
            </div>
          ) : null}

          {previewKind === "audio" && !audioError ? (
            <div className={styles.previewAudio}>
              <audio
                controls
                className={styles.previewAudioEl}
                preload="metadata"
                onError={() => setAudioError(true)}
              >
                <source src={previewUrl} type={file.mimeType} />
                Trình duyệt không hỗ trợ thẻ audio.
              </audio>
              <p className={styles.previewAudioLabel}>{file.originalName}</p>
            </div>
          ) : null}

          {previewKind === "pdf" && !iframeError ? (
            <div className={styles.previewFrame}>
              <iframe
                src={previewUrl}
                title={file.originalName}
                className={styles.previewIframe}
                onError={() => setIframeError(true)}
              />
            </div>
          ) : null}

          {previewKind === "other" || imgError || videoError || audioError || iframeError ? (
            <div className={styles.previewFallback}>
              <FileIcon
                filename={file.originalName}
                mimeType={file.mimeType}
                kind={kind}
                size={64}
              />
              <p className={styles.previewFallbackText}>
                {previewKind === "other"
                  ? "Loại file này chưa có trình xem trước — bấm \"Tải xuống\" để mở bằng ứng dụng ngoài."
                  : "Xem trước hiện chưa khả dụng — backend chưa serve file vật lý qua HTTP."}
              </p>
              <a
                href={previewUrl}
                className={styles.previewDownloadBtn}
                download={file.originalName}
              >
                <Download size={16} />
                <span>Tải xuống</span>
              </a>
            </div>
          ) : null}
        </section>

        {/* ===== Metadata ===== */}
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Thông tin</h4>
          <div className={styles.metaGrid}>
            <MetaRow label="Tên file" value={file.originalName} />
            <MetaRow label="Loại" value={`${getFileKindLabel(kind)} (${file.mimeType || "—"})`} />
            <MetaRow label="Kích thước" value={formatFileSize(file.size)} />
            <MetaRow
              label="Người upload"
              value={`${uploaderName ?? "Không xác định"}${uploaderEmail ? ` (${uploaderEmail})` : ""} · ID: ${file.uploadedById}`}
            />
            <MetaRow label="Thời gian upload" value={formatDateTime(file.createdAt)} />
            <MetaRow label="Mã định danh" value={file.storedName} mono />
          </div>
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

function MetaRow({
  label,
  value,
  mono = false,
}: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={[styles.metaValue, mono ? styles.mono : ""].join(" ")}>
        {value}
      </span>
    </div>
  );
}