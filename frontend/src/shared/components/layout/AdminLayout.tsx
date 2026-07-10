import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, loadCollapsedState, saveCollapsedState } from "./Sidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { NotificationProvider } from "../../contexts/NotificationContext";
import {
  useNotificationSocket,
  type ConnectionStatus,
} from "../../hooks/useNotificationSocket";
import { authStorage } from "../../storage/authStorage";
import styles from "./AdminLayout.module.css";

export function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => loadCollapsedState());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!authStorage.getAccessToken());
  const [, setConnection] = useState<ConnectionStatus>("disconnected");

  // On desktop (>1023px), always close drawer.
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setDrawerOpen(false);
      }
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Theo dõi login state (khi authStorage thay đổi qua các flow khác như
  // refresh-token, login, logout...).
  useEffect(() => {
    function onStorage() {
      setIsLoggedIn(!!authStorage.getAccessToken());
    }
    window.addEventListener("storage", onStorage);
    // Cũng kiểm tra ngay khi tab được focus lại (trường hợp login ở tab khác).
    window.addEventListener("focus", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
    };
  }, []);

  // Kết nối socket + fallback polling ở cấp layout (mount khi đã đăng nhập,
  // unmount khi logout hoặc rời layout).
  useNotificationSocket({
    enabled: isLoggedIn,
    onNew: (payload) => {
      const api = (window as unknown as {
        __notificationContextApi?: {
          onNew?: (p: typeof payload) => void;
        };
      }).__notificationContextApi;
      api?.onNew?.(payload);
    },
    onRead: (payload) => {
      const api = (window as unknown as {
        __notificationContextApi?: {
          onRead?: (p: typeof payload) => void;
        };
      }).__notificationContextApi;
      api?.onRead?.(payload);
    },
    onMissedUpdate: async () => {
      // Catch-up: refresh NotificationContext (badge + recent).
      const api = (window as unknown as {
        __notificationContextApi?: { refresh?: () => Promise<void> };
      }).__notificationContextApi;
      if (api?.refresh) await api.refresh();
      // Đồng thời refresh NotificationPanel nếu đang mở.
      const panel = (window as unknown as {
        __notificationPanelApi?: { refresh?: () => void };
      }).__notificationPanelApi;
      panel?.refresh?.();
    },
    onConnectionChange: (status) => setConnection(status),
  });

  function handleToggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    saveCollapsedState(next);
  }

  return (
    <NotificationProvider>
    <div
      className={[
        styles.shell,
        sidebarCollapsed ? styles.sidebarCollapsed : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Desktop sidebar — always rendered but hidden via CSS on mobile */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
      />

      {/* Mobile drawer */}
      {drawerOpen && (
        <Sidebar
          collapsed={false}
          onToggle={handleToggleSidebar}
          onClose={() => setDrawerOpen(false)}
          isDrawer
        />
      )}

      {/* Main content area */}
      <div className={styles.main}>
        <Header onMenuClick={() => setDrawerOpen(true)} />

        <main className={styles.content}>
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
    </NotificationProvider>
  );
}