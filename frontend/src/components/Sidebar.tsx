import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Bell,
  FolderOpen,
  ScrollText,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import styles from "./Sidebar.module.css";

const SIDEBAR_KEY = "zrlms_sidebar_collapsed";

const MENU_ITEMS = [
  { label: "Dashboard", to: "/dashboard", Icon: LayoutDashboard },
  { label: "Quản lý người dùng", to: "/users", Icon: Users },
  { label: "Thông báo", to: "/notifications", Icon: Bell },
  { label: "Quản lý tệp", to: "/files", Icon: FolderOpen },
  { label: "Nhật ký hệ thống", to: "/logs", Icon: ScrollText },
  { label: "Cài đặt hệ thống", to: "/settings", Icon: Settings },
  { label: "Tìm kiếm", to: "/search", Icon: Search },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onClose?: () => void;
  isDrawer?: boolean;
}

export function Sidebar({ collapsed, onToggle, onClose, isDrawer }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isDrawer && (
        <div
          className={styles.backdrop}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          styles.sidebar,
          collapsed ? styles.collapsed : "",
          isDrawer ? styles.drawer : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Thanh điều hướng chính"
      >
        {/* Header: logo + toggle */}
        <div className={styles.header}>
          <div className={styles.logoMark}>
            <img
              src="/logo/logo-full.png"
              alt="Zhong Ruan LMS"
              className={styles.logoImg}
            />
            {!collapsed && (
              <span className={styles.logoText}>Zhong Ruan LMS</span>
            )}
          </div>
          <button
            className={styles.toggleBtn}
            onClick={isDrawer ? onClose : onToggle}
            aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            title={collapsed ? "Mở rộng" : "Thu gọn"}
          >
            {isDrawer ? (
              <X size={18} />
            ) : collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {MENU_ITEMS.map(({ label, to, Icon }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={[
                  styles.navItem,
                  isActive ? styles.active : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                title={collapsed ? label : undefined}
                onClick={isDrawer ? onClose : undefined}
              >
                <span className={styles.navIcon}>
                  <Icon size={20} />
                </span>
                {!collapsed && (
                  <span className={styles.navLabel}>{label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export function loadCollapsedState(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveCollapsedState(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  } catch {
    /* ignore */
  }
}
