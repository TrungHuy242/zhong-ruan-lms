/**
 * FileTableView — bảng danh sách file với sort + selection.
 *
 * Tách từ FileManagerPage để giữ page gọn, dễ test. Tái sử dụng Table +
 * Modal + ActionIcon đã có ở shared/components/ui.
 *
 * Columns:
 *   - checkbox (nếu multiSelect)
 *   - name (sortable, FileSortBy="name")
 *   - kind (badge)
 *   - size (sortable)
 *   - uploader (chỉ Admin)
 *   - createdAt (sortable)
 *   - actions (Eye / Copy Link / Download / Trash)
 */
import { useMemo } from "react";
import {
  Table,
  type SortConfig,
  type TableColumn,
} from "../../../shared/components/ui";
import { FileIcon } from "../../../shared/components/ui";
import {
  Download as DownloadIcon,
  Eye,
  Link2,
  Trash2,
} from "lucide-react";
import {
  formatFileSize,
  getFileKind,
  getFileKindLabel,
  type FileKind,
} from "../../../shared/validation/fileValidation";
import type { UploadedFile } from "../services/fileApi";
import styles from "./FileTableView.module.css";

export interface FileTableViewProps {
  items: UploadedFile[];
  loading: boolean;
  selectable: boolean;
  selectedIds: Array<string | number>;
  onSelectedChange: (ids: Array<string | number>) => void;
  /** API sort key ↔ UI column key: "name" | "size" | "createdAt". */
  sortConfig: SortConfig;
  onSortChange: (next: SortConfig) => void;
  /** User rows. */
  users: Array<{ id: number; fullName: string; email: string }>;
  currentUserId?: number;
  isAdmin: boolean;
  /** Click vào tên file hoặc icon mắt. */
  onOpenDetail: (file: UploadedFile) => void;
  /** Click icon Copy Link. */
  onCopyLink: (file: UploadedFile) => void;
  /** Click icon Download (trigger download trực tiếp). */
  onDownload: (file: UploadedFile) => void;
  /** Click icon Xoá. */
  onAskDelete: (file: UploadedFile) => void;
  /** Empty state (folderEmpty icon). */
  emptyState: React.ReactNode;
}

const KIND_BADGE_CLASS: Record<FileKind, string> = {
  image: styles.badgeImage ?? "",
  pdf: styles.badgePdf ?? "",
  word: styles.badgeWord ?? "",
  other: styles.badgeOther ?? "",
};

function findUploader(
  users: FileTableViewProps["users"],
  uploadedById: number
) {
  return users.find((x) => x.id === uploadedById) ?? null;
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

export function FileTableView({
  items,
  loading,
  selectable,
  selectedIds,
  onSelectedChange,
  sortConfig,
  onSortChange,
  users,
  currentUserId,
  isAdmin,
  onOpenDetail,
  onCopyLink,
  onDownload,
  onAskDelete,
  emptyState,
}: FileTableViewProps) {
  const columns: TableColumn<UploadedFile>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Tên file",
        sortable: true,
        minWidth: 280,
        render: (file) => {
          const kind = getFileKind(file.originalName || file.mimeType);
          return (
            <div className={styles.nameCell}>
              <FileIcon
                filename={file.originalName}
                mimeType={file.mimeType}
                kind={kind}
                size={20}
              />
              <button
                type="button"
                className={styles.nameLink}
                onClick={() => onOpenDetail(file)}
                title={file.originalName}
              >
                {file.originalName}
              </button>
            </div>
          );
        },
      },
      {
        key: "kind",
        header: "Loại",
        render: (file) => {
          const kind = getFileKind(file.originalName || file.mimeType);
          return (
            <span className={[styles.badge, KIND_BADGE_CLASS[kind]].join(" ")}>
              {getFileKindLabel(kind)}
            </span>
          );
        },
      },
      {
        key: "size",
        header: "Kích thước",
        sortable: true,
        render: (file) => (
          <span className={styles.sizeCell}>{formatFileSize(file.size)}</span>
        ),
      },
      ...(isAdmin
        ? [
            {
              key: "uploader",
              header: "Người upload",
              minWidth: 200,
              render: (file: UploadedFile) => {
                const u = findUploader(users, file.uploadedById);
                return (
                  <div className={styles.uploaderCell}>
                    <span className={styles.uploaderName}>
                      {u?.fullName ?? `ID: ${file.uploadedById}`}
                    </span>
                    {u ? (
                      <span className={styles.uploaderEmail}>{u.email}</span>
                    ) : null}
                  </div>
                );
              },
            },
          ]
        : []),
      {
        key: "createdAt",
        header: "Thời gian",
        sortable: true,
        render: (file) => (
          <span className={styles.timeCell}>{formatDateTime(file.createdAt)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (file) => {
          const canDelete =
            isAdmin ||
            (currentUserId !== undefined &&
              file.uploadedById === currentUserId);
          return (
            <div className={styles.actionCell}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => onOpenDetail(file)}
                title="Xem thông tin"
                aria-label="Xem thông tin"
              >
                <Eye size={16} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => onCopyLink(file)}
                title="Sao chép liên kết"
                aria-label="Sao chép liên kết"
              >
                <Link2 size={16} />
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => onDownload(file)}
                title="Tải xuống nhanh"
                aria-label="Tải xuống nhanh"
              >
                <DownloadIcon size={16} />
              </button>
              {canDelete ? (
                <button
                  type="button"
                  className={[styles.iconBtn, styles.iconBtnDanger].join(" ")}
                  onClick={() => onAskDelete(file)}
                  title="Xoá file"
                  aria-label="Xoá file"
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [users, isAdmin, currentUserId, onOpenDetail, onCopyLink, onDownload, onAskDelete]
  );

  return (
    <Table
      columns={columns}
      data={items}
      loading={loading}
      skeletonRows={6}
      rowKey={(f) => f.id}
      emptyState={emptyState}
      selectable={selectable}
      selectedIds={selectedIds}
      onSelectedChange={onSelectedChange}
      selectableKey={(f) => f.id}
      sortable
      sortConfig={sortConfig}
      onSortChange={onSortChange}
    />
  );
}