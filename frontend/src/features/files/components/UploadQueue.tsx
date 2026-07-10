/**
 * UploadQueue — UI render cho useUploadQueue hook.
 *
 * Generic: caller truyền hook return value. Component chỉ lo render danh
 * sách item với progress bar, nút retry / cancel / remove, không tự quản
 * lý queue state.
 */
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Trash2,
  X as XIcon,
  XCircle,
} from "lucide-react";
import type {
  UploadQueueItem,
  UseUploadQueueReturn,
} from "../../../shared/hooks/useUploadQueue";
import styles from "./UploadQueue.module.css";

export interface UploadQueueProps {
  queue: UseUploadQueueReturn;
  /** Khi bấm "Retry tất cả" — gọi retry cho từng id error/cancelled. */
  showRetryAll?: boolean;
  /** Khi bấm "Huỷ tất cả" — gọi cancel cho từng id uploading/pending. */
  showCancelAll?: boolean;
}

function classNames(
  ...values: Array<string | false | undefined | null>
): string {
  return values.filter(Boolean).join(" ");
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function StatusIcon({ item }: { item: UploadQueueItem }) {
  switch (item.status) {
    case "uploading":
      return <Loader2 size={14} className={styles.spinIcon} aria-hidden="true" />;
    case "success":
      return <CheckCircle2 size={14} aria-hidden="true" />;
    case "error":
      return <AlertCircle size={14} aria-hidden="true" />;
    case "cancelled":
      return <XCircle size={14} aria-hidden="true" />;
    default:
      return null;
  }
}

function StatusLabel({ item }: { item: UploadQueueItem }) {
  switch (item.status) {
    case "pending":
      return <span className={styles.statusLabel}>Đang chờ</span>;
    case "uploading":
      return (
        <span className={styles.statusLabel}>
          Đang tải lên… {item.progress}%
        </span>
      );
    case "success":
      return <span className={styles.statusSuccess}>Thành công</span>;
    case "error":
      return (
        <span className={styles.statusError}>
          {item.error || "Lỗi"}
        </span>
      );
    case "cancelled":
      return <span className={styles.statusCancelled}>Đã huỷ</span>;
    default:
      return null;
  }
}

export function UploadQueue({
  queue,
  showRetryAll = true,
  showCancelAll = true,
}: UploadQueueProps) {
  const { items, retry, cancel, remove, clearFinished, summary } = queue;

  if (items.length === 0) return null;

  function retryAll() {
    for (const it of items) {
      if (it.status === "error" || it.status === "cancelled") retry(it.id);
    }
  }

  function cancelAll() {
    for (const it of items) {
      if (it.status === "uploading" || it.status === "pending") cancel(it.id);
    }
  }

  const hasFinished =
    items.some((it) => it.status === "success" || it.status === "error");
  const hasError = items.some(
    (it) => it.status === "error" || it.status === "cancelled"
  );
  const hasInFlight = items.some(
    (it) => it.status === "uploading" || it.status === "pending"
  );

  return (
    <div className={styles.queue}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>Hàng chờ</span>
          <span className={styles.counts}>
            {summary.uploading > 0 ? `${summary.uploading} đang tải · ` : ""}
            {summary.success > 0 ? `${summary.success} thành công · ` : ""}
            {summary.error + summary.cancelled > 0
              ? `${summary.error + summary.cancelled} lỗi`
              : ""}
          </span>
        </div>
        <div className={styles.headerActions}>
          {showRetryAll && hasError ? (
            <button
              type="button"
              className={styles.headerBtn}
              onClick={retryAll}
              aria-label="Thử lại tất cả file lỗi"
            >
              <RefreshCw size={14} />
              <span>Thử lại lỗi</span>
            </button>
          ) : null}
          {showCancelAll && hasInFlight ? (
            <button
              type="button"
              className={styles.headerBtn}
              onClick={cancelAll}
              aria-label="Huỷ tất cả file đang tải"
            >
              <XCircle size={14} />
              <span>Huỷ tất cả</span>
            </button>
          ) : null}
          {hasFinished ? (
            <button
              type="button"
              className={styles.headerBtn}
              onClick={clearFinished}
              aria-label="Xoá các file đã xử lý"
            >
              <Trash2 size={14} />
              <span>Xoá đã xử lý</span>
            </button>
          ) : null}
        </div>
      </div>

      <ul className={styles.list}>
        {items.map((it) => (
          <li
            key={it.id}
            className={classNames(
              styles.item,
              it.status === "uploading" && styles.itemUploading,
              it.status === "success" && styles.itemSuccess,
              it.status === "error" && styles.itemError,
              it.status === "cancelled" && styles.itemCancelled
            )}
          >
            <div className={styles.itemRow}>
              <div className={styles.itemInfo}>
                <StatusIcon item={it} />
                <span className={styles.itemName} title={it.file.name}>
                  {it.file.name}
                </span>
                <span className={styles.itemSize}>
                  {formatBytes(it.file.size)}
                </span>
              </div>
              <div className={styles.itemStatusGroup}>
                <StatusLabel item={it} />
                <div className={styles.itemActions}>
                  {it.status === "uploading" ? (
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => cancel(it.id)}
                      aria-label={`Huỷ upload ${it.file.name}`}
                      title="Huỷ"
                    >
                      <XCircle size={14} />
                    </button>
                  ) : null}
                  {it.status === "error" || it.status === "cancelled" ? (
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => retry(it.id)}
                      aria-label={`Thử lại upload ${it.file.name}`}
                      title="Thử lại"
                    >
                      <RefreshCw size={14} />
                    </button>
                  ) : null}
                  {it.status !== "uploading" ? (
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => remove(it.id)}
                      aria-label={`Xoá ${it.file.name} khỏi hàng chờ`}
                      title="Xoá"
                    >
                      <XIcon size={14} />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {(it.status === "uploading" || it.status === "success") ? (
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${it.progress}%` }}
                />
              </div>
            ) : null}

            {it.status === "error" && it.error ? (
              <p className={styles.itemErrorDetail}>{it.error}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}