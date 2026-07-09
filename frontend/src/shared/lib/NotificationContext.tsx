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
  type Notification,
} from "../../features/notifications/notificationApi";
import { authStorage } from "./authStorage";

interface NotificationContextValue {
  /** Số thông báo chưa đọc. */
  unreadCount: number;
  /** Top N thông báo gần nhất (cho Bell dropdown). */
  recent: Notification[];
  /** Đang fetch lần đầu — Header có thể ẩn badge cho đến khi fetch xong. */
  loading: boolean;
  /** Re-fetch cả unread + recent. */
  refresh: () => Promise<void>;
  /**
   * Đánh dấu 1 thông báo đã đọc và cập nhật local state ngay (không chờ BE).
   * Trả về notification đã update.
   */
  markOneRead: (id: number | string) => Promise<void>;
  /** Đánh dấu tất cả đã đọc. */
  markAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const POLL_INTERVAL_MS = 60_000; // 1 phút refresh 1 lần.

export function NotificationProvider({ children }: { children: ReactNode }) {
  const currentUser = authStorage.getUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  // Tránh double-fetch trong React.StrictMode dev.
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!currentUser) return;
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
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    refresh();
    const id = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [currentUser, refresh]);

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