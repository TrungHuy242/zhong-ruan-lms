import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  AlertCircle,
  X,
} from "lucide-react";
import styles from "./Toast.module.css";

/**
 * ToastContext — hệ thống thông báo nổi ở góc dưới phải.
 *
 * Thay thế tất cả inline <Alert> banner cho action CRUD (thêm/sửa/xoá/đổi
 * trạng thái) trên toàn hệ thống. KHÔNG dùng cho:
 *   - loadError / empty state (giữ inline để có nút "Thử lại")
 *   - Static info/warning context (giới hạn quyền, filter warning)
 *
 * Design tuân theo `.claude/skills/hallmark/references/microinteractions.md`:
 *   - Vị trí: fixed bottom-right (24px inset).
 *   - Stack: toast mới đẩy toast cũ lên, KHÔNG reposition toast cũ.
 *   - Slide-in 400ms / dwell / slide-out 300ms.
 *   - Pause auto-dismiss khi hover/focus.
 *   - Reduced motion: chỉ fade, không slide.
 *
 * Duration mặc định (theo task duyệt):
 *   success = 3000ms, error = 5000ms, warning = 4000ms, info = 3000ms.
 */

export type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
  /** Unix timestamp khi toast được tạo. */
  createdAt: number;
  /** Pause auto-dismiss khi hover. */
  hovered: boolean;
  focused: boolean;
}

interface ToastInput {
  message: string;
  /** Override duration mặc định theo variant. */
  duration?: number;
}

interface ToastApi {
  success: (input: string | ToastInput) => number;
  error: (input: string | ToastInput) => number;
  warning: (input: string | ToastInput) => number;
  info: (input: string | ToastInput) => number;
  dismiss: (id: number) => void;
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast phải được dùng trong <ToastProvider>");
  }
  return ctx;
}

/**
 * ToastProvider — render ToastContainer ở góc dưới phải + cung cấp context.
 *
 * Mount 1 lần ở AppProviders (cùng cấp NotificationProvider) — bao phủ cả
 * admin pages và public pages.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  // Lưu timer theo id để có thể cancel khi dismiss thủ công hoặc pause/resume.
  const timersRef = useRef<Map<number, { start: number; remaining: number }>>(
    new Map(),
  );
  const timeoutIdsRef = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    // Xóa timeout nếu đang pending.
    const tid = timeoutIdsRef.current.get(id);
    if (tid !== undefined) {
      window.clearTimeout(tid);
      timeoutIdsRef.current.delete(id);
    }
    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const scheduleRemove = useCallback(
    (id: number, durationMs: number) => {
      // Ghi nhớ remaining time để pause/resume.
      timersRef.current.set(id, { start: Date.now(), remaining: durationMs });
      const timeoutId = window.setTimeout(() => {
        dismiss(id);
      }, durationMs);
      timeoutIdsRef.current.set(id, timeoutId);
    },
    [dismiss],
  );

  const push = useCallback(
    (variant: ToastVariant, input: string | ToastInput) => {
      const message =
        typeof input === "string" ? input : input.message;
      const duration =
        typeof input === "object" && input.duration !== undefined
          ? input.duration
          : DEFAULT_DURATION[variant];

      counterRef.current += 1;
      const id = counterRef.current;
      const toast: Toast = {
        id,
        variant,
        message,
        createdAt: Date.now(),
        hovered: false,
        focused: false,
      };
      setToasts((prev) => [...prev, toast]);
      scheduleRemove(id, duration);
      return id;
    },
    [scheduleRemove],
  );

  // Pause khi hover/focus: clear timeout và ghi nhớ remaining.
  const pause = useCallback((id: number) => {
    const entry = timersRef.current.get(id);
    const timeoutId = timeoutIdsRef.current.get(id);
    if (entry && timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(id);
      const elapsed = Date.now() - entry.start;
      entry.remaining = Math.max(0, entry.remaining - elapsed);
    }
    setToasts((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, hovered: true, focused: true } : t,
      ),
    );
  }, []);

  // Resume khi rời hover/blur: schedule lại với remaining.
  const resume = useCallback(
    (id: number) => {
      const entry = timersRef.current.get(id);
      if (entry && entry.remaining > 0) {
        scheduleRemove(id, entry.remaining);
      }
      setToasts((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, hovered: false, focused: false } : t,
        ),
      );
    },
    [scheduleRemove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (i) => push("success", i),
      error: (i) => push("error", i),
      warning: (i) => push("warning", i),
      info: (i) => push("info", i),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismiss}
        onPause={pause}
        onResume={resume}
      />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
}

function variantIcon(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return <CheckCircle2 size={20} aria-hidden="true" />;
    case "error":
      return <AlertCircle size={20} aria-hidden="true" />;
    case "warning":
      return <AlertTriangle size={20} aria-hidden="true" />;
    case "info":
    default:
      return <Info size={20} aria-hidden="true" />;
  }
}

function ToastContainer({
  toasts,
  onDismiss,
  onPause,
  onResume,
}: ToastContainerProps) {
  // Không render gì khi rỗng (tránh fixed element chiếm DOM).
  if (toasts.length === 0) return null;

  return (
    <div className={styles.region} aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[styles.toast, styles[`variant_${t.variant}`]].join(" ")}
          role={t.variant === "error" ? "alert" : "status"}
          onMouseEnter={() => onPause(t.id)}
          onMouseLeave={() => onResume(t.id)}
          onFocus={() => onPause(t.id)}
          onBlur={() => onResume(t.id)}
          tabIndex={-1}
        >
          <span className={styles.icon}>{variantIcon(t.variant)}</span>
          <span className={styles.message}>{t.message}</span>
          <button
            type="button"
            aria-label="Đóng thông báo"
            className={styles.close}
            onClick={() => onDismiss(t.id)}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
