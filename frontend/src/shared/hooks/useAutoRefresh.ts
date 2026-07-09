/**
 * useAutoRefresh — tự động gọi callback mỗi `intervalMs` ms.
 *
 * Pattern dùng cho Dashboard auto-refresh (overview + monthly + recent activities).
 * - Cleanup đúng trong useEffect (clearInterval khi unmount).
 * - Pause khi tab ẩn (visibilitychange) để tránh gọi thừa.
 * - Có thể tắt/mở qua `enabled`.
 *
 * Ví dụ:
 *   useAutoRefresh({
 *     callback: loadAll,
 *     intervalMs: 60_000,
 *   });
 */
import { useEffect, useRef } from "react";

export interface UseAutoRefreshOptions {
  /** Hàm gọi mỗi lần tick. */
  callback: () => void | Promise<void>;
  /** Khoảng cách giữa 2 lần gọi (ms). Mặc định 60s. */
  intervalMs?: number;
  /** Bật/tắt (mặc định true). */
  enabled?: boolean;
  /** Tạm dừng khi tab đang ẩn (mặc định true). */
  pauseWhenHidden?: boolean;
}

export function useAutoRefresh({
  callback,
  intervalMs = 60_000,
  enabled = true,
  pauseWhenHidden = true,
}: UseAutoRefreshOptions): void {
  // Lưu callback mới nhất qua ref để không phải re-run interval mỗi lần parent
  // re-render với callback mới (tránh reset đồng hồ không mong muốn).
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    let intervalId: number | null = null;

    function start() {
      if (intervalId !== null) return;
      intervalId = window.setInterval(() => {
        void callbackRef.current();
      }, intervalMs);
    }
    function stop() {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    }

    function handleVisibility() {
      if (!pauseWhenHidden) {
        start();
        return;
      }
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        start();
      }
    }

    // Chỉ start ngay nếu tab đang visible (hoặc không quan tâm visibility).
    if (!pauseWhenHidden || document.visibilityState !== "hidden") {
      start();
    }

    if (pauseWhenHidden) {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      stop();
      if (pauseWhenHidden) {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [enabled, intervalMs, pauseWhenHidden]);
}