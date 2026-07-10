/**
 * useNotificationSocket — kết nối Socket.io với backend, lắng nghe các event
 * notification realtime, đồng thời fallback sang polling 25s khi mất kết nối.
 *
 * Mount 1 lần ở cấp AdminLayout (sau khi user đã đăng nhập). Hook tự connect khi
 * có token, tự disconnect khi token biến mất (logout) hoặc unmount.
 *
 * Event từ BE (xem backend/src/sockets/README.md):
 *   - "notification:new"  → payload { id, title, contentPreview, type, createdAt,
 *                                 isRead, target?, role?, recipientCount? }
 *   - "notification:read" → payload { id } | { id: "all", updated: number }
 *
 * Hook KHÔNG tự mutate UI state. Thay vào đó emit ra 3 callback để consumer
 * (NotificationContext / NotificationPanel) tự quyết định cách merge:
 *   - onNew(payload)        : có noti mới — prepend + unreadCount + toast
 *   - onRead({ id })        : có 1 noti bị đánh dấu đã đọc — sync isRead state
 *   - onReadAll({ updated}) : mark-all-read — sync nhiều noti cùng lúc
 *   - onConnectionChange(status) : "connected" | "polling" | "disconnected"
 *
 * FALLBACK POLLING:
 *   Khi socket disconnect / connect_error → bật interval 25s gọi onMissedUpdate()
 *   để consumer refresh state từ REST (đảm bảo không mất update khi mạng/BE chập
 *   chờn). Khi reconnect → tắt polling + gọi onMissedUpdate() 1 lần để "đuổi
 *   kịp" các event đã miss trong lúc offline.
 */
import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { authStorage } from "../storage/authStorage";

/** Payload mà BE emit trong `notification:new` (xem sockets/README.md). */
export interface SocketNewNotificationPayload {
  id: number;
  title: string;
  contentPreview?: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  createdAt: string;
  isRead: boolean;
  /** Có khi BE broadcast theo role/all (mặc định undefined = gửi 1 user). */
  target?: "all" | "role" | "user";
  role?: string;
  recipientCount?: number;
}

export interface SocketReadNotificationPayload {
  /** id của notification vừa được đánh dấu đã đọc, hoặc "all". */
  id: number | "all";
  /** Số record update (chỉ có khi id === "all"). */
  updated?: number;
}

export type ConnectionStatus = "connecting" | "connected" | "polling" | "disconnected";

export interface UseNotificationSocketOptions {
  /** Có đang đăng nhập hay không (mount/unmount theo auth). */
  enabled: boolean;
  /** Có notification mới. */
  onNew?: (payload: SocketNewNotificationPayload) => void;
  /** Có 1 notification được mark-read. */
  onRead?: (payload: SocketReadNotificationPayload) => void;
  /**
   * Khi reconnect hoặc khi bật polling — gọi để consumer chủ động pull lại
   * state qua REST (catch-up). Không bắt buộc nhưng rất nên có.
   */
  onMissedUpdate?: () => void;
  /** Đổi trạng thái kết nối để hiển thị UI nếu cần. */
  onConnectionChange?: (status: ConnectionStatus) => void;
  /** Khoảng cách polling khi socket mất kết nối (mặc định 25000ms). */
  fallbackPollMs?: number;
}

function resolveSocketUrl(): string {
  // Vite proxy chỉ forward HTTP, KHÔNG forward ws upgrade — nên socket phải
  // kết nối thẳng tới backend origin. Mặc định lấy từ env, fallback window.location.
  const fromEnv = import.meta.env.VITE_SOCKET_URL;
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://localhost:5000";
}

export function useNotificationSocket(opts: UseNotificationSocketOptions): void {
  const {
    enabled,
    onNew,
    onRead,
    onMissedUpdate,
    onConnectionChange,
    fallbackPollMs = 25_000,
  } = opts;

  // Refs để callback mới không reset socket/polling lifecycle.
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;
  const onMissedUpdateRef = useRef(onMissedUpdate);
  onMissedUpdateRef.current = onMissedUpdate;
  const onConnectionChangeRef = useRef(onConnectionChange);
  onConnectionChangeRef.current = onConnectionChange;

  useEffect(() => {
    if (!enabled) return;

    const token = authStorage.getAccessToken();
    if (!token) {
      // Không có token thì không connect (user chưa đăng nhập / vừa logout).
      return;
    }

    const url = resolveSocketUrl();
    let stopped = false;
    let pollTimer: number | null = null;
    let wasEverConnected = false;

    function setStatus(s: ConnectionStatus) {
      onConnectionChangeRef.current?.(s);
    }

    function startPolling() {
      if (pollTimer !== null) return;
      // Pull ngay 1 lần rồi mới loop.
      void onMissedUpdateRef.current?.();
      pollTimer = window.setInterval(() => {
        void onMissedUpdateRef.current?.();
      }, fallbackPollMs);
      setStatus("polling");
    }

    function stopPolling() {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    // Tạo socket. transports ưu tiên websocket (ít overhead) → fallback polling.
    // Lưu ý: socket.io-client KHÔNG expose pingInterval/pingTimeout trong TS types
    // (chỉ server-side), default 25s/20s là đủ cho use case của chúng ta.
    const socket: Socket = io(url, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
      autoConnect: true,
    });

    setStatus("connecting");

    socket.on("connect", () => {
      if (stopped) return;
      wasEverConnected = true;
      stopPolling();
      setStatus("connected");
      // Sau reconnect, catch-up bằng cách pull REST 1 lần.
      void onMissedUpdateRef.current?.();
    });

    socket.on("disconnect", (reason) => {
      if (stopped) return;
      // Nếu chưa từng connect thành công thì thử polling cũng vô ích (BE chết
      // thật). Nhưng vẫn bật polling để lần tới BE lên sẽ catch-up được.
      startPolling();
      // Có thể log để debug.
      if (typeof console !== "undefined") {
        console.warn("[socket] disconnected:", reason);
      }
    });

    socket.on("connect_error", (err) => {
      if (stopped) return;
      // Sai token → không reconnect vô ích.
      if (
        err &&
        typeof err.message === "string" &&
        (err.message.includes("UNAUTHENTICATED") ||
          err.message.includes("FORBIDDEN"))
      ) {
        // Disconnect vĩnh viễn, không reconnect.
        socket.disconnect();
        setStatus("disconnected");
        return;
      }
      startPolling();
      if (typeof console !== "undefined") {
        console.warn("[socket] connect_error:", err.message);
      }
    });

    socket.on("notification:new", (payload: SocketNewNotificationPayload) => {
      if (stopped) return;
      onNewRef.current?.(payload);
    });

    socket.on("notification:read", (payload: SocketReadNotificationPayload) => {
      if (stopped) return;
      onReadRef.current?.(payload);
    });

    return () => {
      stopped = true;
      stopPolling();
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch {
        /* ignore */
      }
      if (wasEverConnected) setStatus("disconnected");
    };
    // Token thay đổi (login/logout/refresh) → reconnect với token mới.
    // Cần lắng nghe storage event để bắt token đổi từ tab khác (optional).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fallbackPollMs]);
}

/** Re-export socket type để các component khác có thể debug. */
export type { Socket };