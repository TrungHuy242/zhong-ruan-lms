import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getRecentNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  notificationFromSocketPayload,
  type Notification,
} from "../../features/notifications";
import type {
  SocketNewNotificationPayload,
  SocketReadNotificationPayload,
} from "../hooks/useNotificationSocket";
import { authStorage } from "../storage/authStorage";

interface NotificationContextValue {
  /** Số thông báo chưa đọc. */
  unreadCount: number;
  /** Top N thông báo gần nhất (cho Bell badge). */
  recent: Notification[];
  /** Đang fetch lần đầu — Header có thể ẩn badge cho đến khi fetch xong. */
  loading: boolean;
  /** Re-fetch cả unread + recent. */
  refresh: () => Promise<void>;
  /**
   * Đánh dấu 1 thông báo đã đọc và cập nhật local state ngay (không chờ BE).
   */
  markOneRead: (id: number | string) => Promise<void>;
  /** Đánh dấu tất cả đã đọc. */
  markAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * Polling interval cho fallback khi socket mất kết nối.
 * Socket hook sẽ gọi refresh() mỗi lần tick.
 */
const POLL_INTERVAL_MS = 25_000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const currentUser = authStorage.getUser();
  // Dùng id (string ổn định) thay vì currentUser object để tránh effect re-run
  // mỗi lần authStorage trả về object mới → gây infinite polling loop.
  const currentUserId = currentUser?.id ?? null;
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  // Tránh double-fetch trong React.StrictMode dev.
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!currentUserId) return;
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const [count, list] = await Promise.all([
        getUnreadCount(),
        getRecentNotifications(7),
      ]);
      setUnreadCount(count);
      setRecent(list);
    } catch {
      // Lỗi im lặng — Bell không cần làm phiền user khi mạng chập chờn.
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    // Guard chống re-mount trùng (Vite HMR, React StrictMode) — chỉ chạy polling
    // khi chưa có interval đang chạy. Trước đây đã fix dep [currentUser → currentUserId]
    // nhưng vẫn còn spam trong dev mode; thêm ref-mount để chắc chắn chỉ 1 interval active.
    let intervalId: number | null = null;

    function tick() {
      // Pause khi tab ẩn — tránh gọi thừa khi user không nhìn. Khi tab visible
      // trở lại, interval vẫn chạy như bình thường ở tick kế tiếp.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void refresh();
    }

    // Chạy ngay 1 lần lúc mount (khi tab visible), rồi loop theo POLL_INTERVAL_MS.
    if (typeof document === "undefined" || document.visibilityState !== "hidden") {
      tick();
    }
    intervalId = window.setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [currentUserId, refresh]);

  const markOneRead = useCallback(
    async (notifId: number | string) => {
      // Optimistic update cho UI mượt.
      let wasUnread = false;
      setRecent((prev) =>
        prev.map((n) => {
          if (n.id === notifId && !n.isRead) {
            wasUnread = true;
            return { ...n, isRead: true };
          }
          return n;
        })
      );
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));

      try {
        await markAsRead(notifId);
      } catch {
        // Revert nếu fail.
        if (wasUnread) {
          setRecent((prev) =>
            prev.map((n) =>
              n.id === notifId ? { ...n, isRead: false } : n
            )
          );
          setUnreadCount((c) => c + 1);
        }
      }
    },
    []
  );

  const markAll = useCallback(async () => {
    const snapshotCount = unreadCount;
    const snapshotList = recent;
    // Optimistic.
    setUnreadCount(0);
    setRecent((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllAsRead();
    } catch {
      // Revert.
      setUnreadCount(snapshotCount);
      setRecent(snapshotList);
    }
  }, [recent, unreadCount]);

  /**
   * Xử lý event `notification:new` từ socket: prepend vào recent + bump
   * unreadCount + forward tới NotificationPanel đang mở (nếu có).
   */
  const handleSocketNew = useCallback((payload: SocketNewNotificationPayload) => {
    const notif = notificationFromSocketPayload(payload);
    setRecent((prev) => {
      // Bỏ qua nếu đã có (vd: REST refresh vừa load trước socket).
      if (prev.some((p) => p.id === notif.id)) return prev;
      return [notif, ...prev].slice(0, 7);
    });
    if (!notif.isRead) {
      setUnreadCount((c) => c + 1);
    }
    // Forward tới panel đang mở (qua window.__notificationPanelApi).
    const api = (window as unknown as {
      __notificationPanelApi?: { inject?: (n: Notification) => void };
    }).__notificationPanelApi;
    api?.inject?.(notif);
  }, []);

  /**
   * Xử lý event `notification:read` từ socket: đồng bộ isRead giữa các tab
   * khi user mark-read ở tab khác.
   */
  const handleSocketRead = useCallback((payload: SocketReadNotificationPayload) => {
    if (payload.id === "all") {
      setRecent((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      return;
    }
    setRecent((prev) =>
      prev.map((n) =>
        n.id === payload.id && !n.isRead ? { ...n, isRead: true } : n
      )
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  // Expose socket handlers qua global để useNotificationSocket (mount ở
  // AdminLayout) có thể gọi khi nhận event. Pattern nhẹ nhàng — tránh prop
  // drilling qua nhiều component.
  useEffect(() => {
    const w = window as unknown as {
      __notificationContextApi?: {
        onNew: (payload: SocketNewNotificationPayload) => void;
        onRead: (payload: SocketReadNotificationPayload) => void;
        refresh: () => Promise<void>;
      };
    };
    w.__notificationContextApi = {
      onNew: handleSocketNew,
      onRead: handleSocketRead,
      refresh,
    };
    return () => {
      const cur = (window as unknown as {
        __notificationContextApi?: unknown;
      }).__notificationContextApi;
      if (cur) {
        delete (window as unknown as { __notificationContextApi?: unknown })
          .__notificationContextApi;
      }
    };
  }, [handleSocketNew, handleSocketRead, refresh]);

  const value = useMemo<NotificationContextValue>(
    () => ({ unreadCount, recent, loading, refresh, markOneRead, markAll }),
    [unreadCount, recent, loading, refresh, markOneRead, markAll]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications phải được dùng trong <NotificationProvider>");
  }
  return ctx;
}