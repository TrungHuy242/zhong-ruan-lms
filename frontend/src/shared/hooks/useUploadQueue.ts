/**
 * useUploadQueue — hook generic quản lý hàng chờ upload file.
 *
 * Đặc điểm:
 *  - Mỗi item có progress 0–100 cập nhật theo onUploadProgress (XMLHttpRequest).
 *  - Hỗ trợ retry từng item lỗi (chỉ item đó, không phải cả batch).
 *  - Hỗ trợ huỷ file đang upload (AbortController).
 *  - onItemSuccess được gọi với response file → caller có thể inject vào list
 *    NGAY khi từng file xong (không cần đợi cả batch).
 *
 * Generic: caller truyền uploadFn(file, { onProgress, signal }) → resolve file
 * record. Có thể dùng cho module khác (avatar, course thumbnail...) bằng cách
 * truyền uploadFn khác.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type UploadStatus = "pending" | "uploading" | "success" | "error" | "cancelled";

export interface UploadQueueItem {
  /** id tạm — dùng làm React key. */
  id: string;
  file: File;
  status: UploadStatus;
  /** 0–100. */
  progress: number;
  error?: string;
  /** Response từ server sau khi success — caller dùng để inject vào list. */
  response?: unknown;
}

export interface UploadFnOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export type UploadFn<TResponse> = (
  file: File,
  opts: UploadFnOptions
) => Promise<TResponse>;

export interface UseUploadQueueOptions<TResponse> {
  /**
   * Hàm upload từng file. Generic theo response type (vd: UploadedFile).
   * BẮT BUỘC throw lỗi nếu fail → hook sẽ set status="error" + lưu message.
   */
  uploadFn: UploadFn<TResponse>;
  /**
   * Được gọi NGAY khi 1 item success (trước cả khi batch kết thúc). Caller
   * dùng để prepend vào list hiển thị mà không cần đợi cả batch.
   */
  onItemSuccess?: (item: UploadQueueItem, response: TResponse) => void;
  /** Được gọi mỗi khi queue thay đổi. */
  onQueueChange?: (items: UploadQueueItem[]) => void;
  /**
   * Mặc định chạy upload tuần tự. Nếu muốn song song (mỗi file 1 request cùng
   * lúc), truyền concurrency > 1. Lưu ý: phụ thuộc BE có chịu được hay không.
   */
  concurrency?: number;
}

export interface UseUploadQueueReturn {
  items: UploadQueueItem[];
  enqueue: (files: File[]) => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  remove: (id: string) => void;
  clearFinished: () => void;
  clearAll: () => void;
  summary: {
    total: number;
    uploading: number;
    pending: number;
    success: number;
    error: number;
    cancelled: number;
    done: boolean;
  };
}

function newId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useUploadQueue<TResponse = unknown>(
  opts: UseUploadQueueOptions<TResponse>
): UseUploadQueueReturn {
  const { uploadFn, onItemSuccess, onQueueChange, concurrency = 1 } = opts;

  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Track AbortController cho từng item (ref — không gây re-render).
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  // Serialize queue thay đổi để debounce onQueueChange
  const lastSerializedRef = useRef("");
  const notify = useCallback(
    (next: UploadQueueItem[]) => {
      if (!onQueueChange) return;
      const ser = next
        .map(
          (it) =>
            `${it.id}:${it.status}:${it.progress}:${it.error ?? ""}`
        )
        .join("|");
      if (ser === lastSerializedRef.current) return;
      lastSerializedRef.current = ser;
      onQueueChange(next);
    },
    [onQueueChange]
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<UploadQueueItem>) => {
      setItems((prev) => {
        const next = prev.map((it) => (it.id === id ? { ...it, ...patch } : it));
        notify(next);
        return next;
      });
    },
    [notify]
  );

  const removeFromQueue = useCallback(
    (id: string) => {
      // Abort trước khi remove (nếu đang upload)
      const ctrl = controllersRef.current.get(id);
      if (ctrl) {
        try {
          ctrl.abort();
        } catch {
          // ignore
        }
        controllersRef.current.delete(id);
      }
      setItems((prev) => {
        const next = prev.filter((it) => it.id !== id);
        notify(next);
        return next;
      });
    },
    [notify]
  );

  // ===== Worker: xử lý upload 1 item =====
  const processItem = useCallback(
    async (id: string): Promise<void> => {
      const item = itemsRef.current.find((it) => it.id === id);
      if (!item) return;
      if (item.status !== "pending") return;

      const controller = new AbortController();
      controllersRef.current.set(id, controller);

      updateItem(id, { status: "uploading", progress: 0 });

      try {
        const response = await uploadFn(item.file, {
          onProgress: (pct) => updateItem(id, { progress: pct }),
          signal: controller.signal,
        });
        controllersRef.current.delete(id);
        // Nếu user cancel giữa chừng (status đã đổi thành "cancelled"), skip success.
        const current = itemsRef.current.find((it) => it.id === id);
        if (current && current.status === "cancelled") return;
        updateItem(id, { status: "success", progress: 100, response, error: undefined });
        if (onItemSuccess) {
          const updated = itemsRef.current.find((it) => it.id === id);
          if (updated) onItemSuccess(updated, response);
        }
      } catch (err) {
        controllersRef.current.delete(id);
        const current = itemsRef.current.find((it) => it.id === id);
        if (current && current.status === "cancelled") return;
        const message =
          err instanceof Error ? err.message : "Upload thất bại";
        updateItem(id, { status: "error", error: message });
      }
    },
    [uploadFn, onItemSuccess, updateItem]
  );

  // ===== Enqueue =====
  const enqueue = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const newItems: UploadQueueItem[] = files.map((f) => ({
        id: newId(),
        file: f,
        status: "pending",
        progress: 0,
      }));

      setItems((prev) => {
        const next = [...prev, ...newItems];
        notify(next);
        return next;
      });

      // Lập lịch upload. concurrency=1 (tuần tự) là mặc định an toàn cho BE.
      void scheduleUpload(newItems.map((i) => i.id));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify]
  );

  // ===== Scheduler (tuần tự hoặc song song giới hạn) =====
  const activeCountRef = useRef(0);
  const pendingIdsRef = useRef<string[]>([]);

  const scheduleUpload = useCallback(
    async (ids: string[]) => {
      pendingIdsRef.current.push(...ids);
      // Vòng lặp "worker pool" đơn giản
      while (pendingIdsRef.current.length > 0 && activeCountRef.current < concurrency) {
        const nextId = pendingIdsRef.current.shift();
        if (!nextId) break;
        activeCountRef.current += 1;
        // Không await tuần tự — mỗi worker chạy độc lập
        void processItem(nextId).finally(() => {
          activeCountRef.current -= 1;
          // Sau khi 1 worker xong, nếu còn pending thì tiếp tục
          if (pendingIdsRef.current.length > 0) {
            void scheduleUpload([]);
          }
        });
      }
    },
    [concurrency, processItem]
  );

  // ===== Cancel / Retry =====
  const cancel = useCallback(
    (id: string) => {
      const ctrl = controllersRef.current.get(id);
      if (ctrl) {
        try {
          ctrl.abort();
        } catch {
          // ignore
        }
      }
      controllersRef.current.delete(id);
      updateItem(id, { status: "cancelled", error: undefined });
    },
    [updateItem]
  );

  const retry = useCallback(
    (id: string) => {
      // Reset về pending + đẩy lại vào scheduler
      updateItem(id, { status: "pending", progress: 0, error: undefined });
      void scheduleUpload([id]);
    },
    [updateItem, scheduleUpload]
  );

  const remove = useCallback(
    (id: string) => {
      removeFromQueue(id);
    },
    [removeFromQueue]
  );

  const clearFinished = useCallback(() => {
    setItems((prev) => {
      const next = prev.filter(
        (it) =>
          it.status === "uploading" ||
          it.status === "pending"
      );
      notify(next);
      return next;
    });
  }, [notify]);

  const clearAll = useCallback(() => {
    // Abort tất cả in-flight
    controllersRef.current.forEach((ctrl) => {
      try {
        ctrl.abort();
      } catch {
        // ignore
      }
    });
    controllersRef.current.clear();
    pendingIdsRef.current = [];
    setItems([]);
    notify([]);
  }, [notify]);

  // ===== Summary =====
  const summary = useMemo(() => {
    let uploading = 0;
    let pending = 0;
    let success = 0;
    let error = 0;
    let cancelled = 0;
    for (const it of items) {
      if (it.status === "uploading") uploading++;
      else if (it.status === "pending") pending++;
      else if (it.status === "success") success++;
      else if (it.status === "error") error++;
      else if (it.status === "cancelled") cancelled++;
    }
    return {
      total: items.length,
      uploading,
      pending,
      success,
      error,
      cancelled,
      done:
        items.length > 0 &&
        uploading === 0 &&
        pending === 0 &&
        activeCountRef.current === 0 &&
        pendingIdsRef.current.length === 0,
    };
  }, [items]);

  // Cleanup unmount: huỷ tất cả in-flight
  useEffect(() => {
    return () => {
      controllersRef.current.forEach((ctrl) => {
        try {
          ctrl.abort();
        } catch {
          // ignore
        }
      });
      controllersRef.current.clear();
    };
  }, []);

  return {
    items,
    enqueue,
    cancel,
    retry,
    remove,
    clearFinished,
    clearAll,
    summary,
  };
}