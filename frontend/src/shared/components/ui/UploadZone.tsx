import {
  ChangeEvent,
  DragEvent,
  ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import { CloudUpload, X as XIcon, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  validateFile,
  type FileValidationError,
} from "../../lib/fileValidation";
import styles from "./UploadZone.module.css";

export type UploadStatus = "pending" | "uploading" | "success" | "error";

export interface UploadItem {
  /** id tạm — dùng làm React key. */
  id: string;
  file: File;
  status: UploadStatus;
  /** 0–100 — chỉ mang ý nghĩa tương đối vì fetch thuần không dễ lấy progress. */
  progress: number;
  error?: string;
}

export interface UploadZoneProps {
  /**
   * Được gọi cho TỪNG file hợp lệ cần upload.
   * Trả về Promise (throw = lỗi, không throw = thành công).
   */
  onUpload: (file: File) => Promise<void>;
  /**
   * Báo lại cho parent biết có file bị reject NGAY khi chọn (validation fail).
   * Parent có thể dùng để hiện toast/Alert tổng hợp.
   */
  onInvalid?: (errors: { file: File; error: FileValidationError }[]) => void;
  /**
   * Được gọi khi danh sách item thay đổi (thêm / upload xong / lỗi).
   * Parent tự quyết định render Alert bên ngoài.
   */
  onItemsChange?: (items: UploadItem[]) => void;
  /** Cho phép chọn nhiều file cùng lúc. */
  multiple?: boolean;
  /** Có đang upload hay không — để disable vùng drag-drop. */
  disabled?: boolean;
  /** Text hiển thị mô tả bên trong vùng drag-drop. */
  description?: ReactNode;
  /** Có hiển thị progress + danh sách file đang upload hay không. */
  showQueue?: boolean;
}

function classNames(
  ...values: Array<string | false | undefined | null>
): string {
  return values.filter(Boolean).join(" ");
}

function newId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * UploadZone — vùng drag-drop + click-to-pick, validate client-side, gọi
 * onUpload cho từng file, hiển thị progress từng file.
 *
 * GENERIC: không phụ thuộc vào API cụ thể. Parent truyền hàm onUpload để
 * quyết định cách gọi API (BE hiện tại yêu cầu 1 file/request → onUpload
 * ở parent sẽ gọi API cho từng file).
 */
export function UploadZone({
  onUpload,
  onInvalid,
  onItemsChange,
  multiple = true,
  disabled = false,
  description,
  showQueue = true,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  // Dùng ref để tránh stale closure khi gọi setItems bên trong Promise.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Báo thay đổi cho parent (chỉ khi khác shallow).
  const lastSerializedRef = useRef("");
  const notifyChange = useCallback(
    (next: UploadItem[]) => {
      if (!onItemsChange) return;
      const serialized = next
        .map((it) => `${it.id}:${it.status}:${it.progress}:${it.error ?? ""}`)
        .join("|");
      if (serialized === lastSerializedRef.current) return;
      lastSerializedRef.current = serialized;
      onItemsChange(next);
    },
    [onItemsChange]
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<UploadItem>) => {
      setItems((prev) => {
        const next = prev.map((it) => (it.id === id ? { ...it, ...patch } : it));
        notifyChange(next);
        return next;
      });
    },
    [notifyChange]
  );

  const handleFiles = useCallback(
    async (files: File[] | FileList) => {
      if (disabled) return;
      const arr = Array.from(files);
      if (arr.length === 0) return;

      const invalid: { file: File; error: FileValidationError }[] = [];
      const newItems: UploadItem[] = [];

      for (const file of arr) {
        const v = validateFile(file);
        if (v.ok) {
          newItems.push({
            id: newId(),
            file,
            status: "pending",
            progress: 0,
          });
        } else if (v.error) {
          invalid.push({ file, error: v.error });
        }
      }

      if (newItems.length > 0) {
        setItems((prev) => {
          const next = [...prev, ...newItems];
          notifyChange(next);
          return next;
        });
      }

      if (invalid.length > 0 && onInvalid) {
        onInvalid(invalid);
      }

      // Upload tuần tự từng file (BE hiện tại chỉ nhận 1 file/request).
      for (const item of newItems) {
        updateItem(item.id, { status: "uploading", progress: 5 });
        // Cập nhật progress mô phỏng — fetch thuần không expose progress tốt.
        const tickInterval = window.setInterval(() => {
          setItems((prev) => {
            const found = prev.find((it) => it.id === item.id);
            if (!found || found.status !== "uploading") return prev;
            if (found.progress >= 90) return prev;
            const next = prev.map((it) =>
              it.id === item.id ? { ...it, progress: it.progress + 10 } : it
            );
            notifyChange(next);
            return next;
          });
        }, 250);
        try {
          await onUpload(item.file);
          window.clearInterval(tickInterval);
          updateItem(item.id, { status: "success", progress: 100 });
        } catch (err) {
          window.clearInterval(tickInterval);
          const message =
            err instanceof Error ? err.message : "Upload thất bại";
          updateItem(item.id, { status: "error", error: message });
        }
      }
    },
    [disabled, onInvalid, onUpload, updateItem, notifyChange]
  );

  const openFilePicker = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      void handleFiles(files);
    }
    // Reset để chọn lại cùng 1 file vẫn trigger onChange.
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (disabled) return;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      void handleFiles(files);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      notifyChange(next);
      return next;
    });
  }

  function clearFinished() {
    setItems((prev) => {
      const next = prev.filter((it) => it.status === "uploading" || it.status === "pending");
      notifyChange(next);
      return next;
    });
  }

  return (
    <div className={styles.wrapper}>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        className={classNames(
          styles.dropzone,
          dragOver ? styles.dropzoneActive : null,
          disabled ? styles.dropzoneDisabled : null
        )}
        onClick={openFilePicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openFilePicker();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          className={styles.fileInput}
          multiple={multiple}
          accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
          onChange={handleInputChange}
          disabled={disabled}
        />
        <div className={styles.dropIcon}>
          <CloudUpload size={32} />
        </div>
        <p className={styles.dropTitle}>
          {dragOver ? "Thả file vào đây" : "Kéo-thả file hoặc bấm để chọn"}
        </p>
        {description ? (
          <p className={styles.dropHint}>{description}</p>
        ) : (
          <p className={styles.dropHint}>
            Hỗ trợ: jpg, jpeg, png, pdf, doc, docx. Tối đa 10MB / file.
          </p>
        )}
      </div>

      {showQueue && items.length > 0 ? (
        <div className={styles.queue}>
          <div className={styles.queueHeader}>
            <span className={styles.queueTitle}>
              Hàng chờ ({items.length})
            </span>
            {items.some((it) => it.status === "success" || it.status === "error") ? (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={clearFinished}
              >
                Xoá đã xử lý
              </button>
            ) : null}
          </div>
          <ul className={styles.queueList}>
            {items.map((it) => (
              <li
                key={it.id}
                className={classNames(
                  styles.item,
                  it.status === "uploading" && styles.itemUploading,
                  it.status === "success" && styles.itemSuccess,
                  it.status === "error" && styles.itemError
                )}
              >
                <div className={styles.itemMain}>
                  <span className={styles.itemName} title={it.file.name}>
                    {it.file.name}
                  </span>
                  {it.status === "uploading" ? (
                    <span className={styles.itemStatus}>
                      <Loader2 size={14} className={styles.spinIcon} />
                      Đang tải lên... {it.progress}%
                    </span>
                  ) : it.status === "success" ? (
                    <span className={styles.itemStatus}>
                      <CheckCircle2 size={14} /> Thành công
                    </span>
                  ) : it.status === "error" ? (
                    <span className={styles.itemStatusError}>
                      <AlertCircle size={14} /> {it.error || "Lỗi"}
                    </span>
                  ) : (
                    <span className={styles.itemStatus}>Đang chờ</span>
                  )}
                </div>
                {it.status === "uploading" ? (
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${it.progress}%` }}
                    />
                  </div>
                ) : null}
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeItem(it.id)}
                  aria-label={`Xoá ${it.file.name} khỏi hàng chờ`}
                >
                  <XIcon size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}