/**
 * FileGridView — card grid cho danh sách file.
 *
 * Mỗi card: thumbnail lớn (ảnh thật nếu image, icon lớn nếu khác) +
 * tên file rút gọn + actions overlay (Copy Link / Download / Delete).
 *
 * Responsive: auto-fill minmax(...). Mobile xuống 2 cột, md 3-4 cột,
 * desktop 5-6 cột (tùy width).
 *
 * Vì BE chưa serve file vật lý, thumbnail ảnh thực sẽ fail → fallback
 * icon. Lưu ý trong UI placeholder.
 */
import { useState } from "react";
import {
  Eye,
  Link2,
  Download,
  Trash2,
} from "lucide-react";
import { FileIcon } from "../../../shared/components/ui";
import {
  formatFileSize,
  getFileKind,
  getFileKindLabel,
} from "../../../shared/validation/fileValidation";
import type { UploadedFile } from "../services/fileApi";
import styles from "./FileGridView.module.css";

export interface FileGridViewProps {
  items: UploadedFile[];
  loading: boolean;
  selectable: boolean;
  selectedIds: Array<string | number>;
  onSelectedChange: (ids: Array<string | number>) => void;
  currentUserId?: number;
  isAdmin: boolean;
  onOpenDetail: (file: UploadedFile) => void;
  onCopyLink: (file: UploadedFile) => void;
  onDownload: (file: UploadedFile) => void;
  onAskDelete: (file: UploadedFile) => void;
  emptyState: React.ReactNode;
}

export function FileGridView({
  items,
  loading,
  selectable,
  selectedIds,
  onSelectedChange,
  currentUserId,
  isAdmin,
  onOpenDetail,
  onCopyLink,
  onDownload,
  onAskDelete,
  emptyState,
}: FileGridViewProps) {
  const selectedSet = new Set(selectedIds);

  function toggleSelect(id: number) {
    if (!selectable) return;
    if (selectedSet.has(id)) {
      onSelectedChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectedChange([...selectedIds, id]);
    }
  }

  if (!loading && items.length === 0) {
    return <div className={styles.emptyWrap}>{emptyState}</div>;
  }

  return (
    <div className={styles.grid}>
      {items.map((file) => {
        const isSelected = selectable && selectedSet.has(file.id);
        const canDelete =
          isAdmin ||
          (currentUserId !== undefined && file.uploadedById === currentUserId);
        const kind = getFileKind(file.originalName || file.mimeType);

        return (
          <Card
            key={file.id}
            file={file}
            kind={kind}
            isSelected={isSelected}
            selectable={selectable}
            canDelete={canDelete}
            onOpenDetail={onOpenDetail}
            onCopyLink={onCopyLink}
            onDownload={onDownload}
            onAskDelete={onAskDelete}
            onToggleSelect={toggleSelect}
          />
        );
      })}
      {loading
        ? Array.from({ length: 6 }).map((_, i) => (
            <div key={`skeleton-${i}`} className={styles.skeleton} aria-hidden="true">
              <div className={styles.skelThumb} />
              <div className={styles.skelLine} style={{ width: "70%" }} />
              <div className={styles.skelLine} style={{ width: "40%" }} />
            </div>
          ))
        : null}
    </div>
  );
}

interface CardProps {
  file: UploadedFile;
  kind: ReturnType<typeof getFileKind>;
  isSelected: boolean;
  selectable: boolean;
  canDelete: boolean;
  onOpenDetail: (file: UploadedFile) => void;
  onCopyLink: (file: UploadedFile) => void;
  onDownload: (file: UploadedFile) => void;
  onAskDelete: (file: UploadedFile) => void;
  onToggleSelect: (id: number) => void;
}

function Card({
  file,
  kind,
  isSelected,
  selectable,
  canDelete,
  onOpenDetail,
  onCopyLink,
  onDownload,
  onAskDelete,
  onToggleSelect,
}: CardProps) {
  const [imgError, setImgError] = useState(false);
  const isImage = kind === "image" && !imgError;
  return (
    <div
      className={[
        styles.card,
        isSelected ? styles.cardSelected : "",
      ].join(" ")}
    >
      <div
        className={styles.thumb}
        onClick={() => onOpenDetail(file)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenDetail(file);
          }
        }}
      >
        {isImage ? (
          // Lưu ý: file URL có thể không serve được (BE chưa static) — imgError fallback icon.
          // Khi BE bổ sung static serve, chỉ cần đổi src.
          <img
            src={`/api/files/${file.id}/preview`}
            alt={file.originalName}
            className={styles.thumbImg}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.thumbIcon}>
            <FileIcon
              filename={file.originalName}
              mimeType={file.mimeType}
              kind={kind}
              size={56}
            />
          </div>
        )}

        {selectable ? (
          <label
            className={styles.checkboxOverlay}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(file.id)}
              aria-label={`Chọn file ${file.originalName}`}
            />
          </label>
        ) : null}
      </div>

      <div className={styles.meta}>
        <p className={styles.name} title={file.originalName}>
          {file.originalName}
        </p>
        <div className={styles.metaRow}>
          <span className={styles.metaSize}>{formatFileSize(file.size)}</span>
          <span className={styles.metaKind}>{getFileKindLabel(kind)}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => onOpenDetail(file)}
          title="Xem chi tiết"
          aria-label="Xem chi tiết"
        >
          <Eye size={14} />
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => onCopyLink(file)}
          title="Sao chép liên kết"
          aria-label="Sao chép liên kết"
        >
          <Link2 size={14} />
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => onDownload(file)}
          title="Tải xuống"
          aria-label="Tải xuống"
        >
          <Download size={14} />
        </button>
        {canDelete ? (
          <button
            type="button"
            className={[styles.actionBtn, styles.actionBtnDanger].join(" ")}
            onClick={() => onAskDelete(file)}
            title="Xoá file"
            aria-label="Xoá file"
          >
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}