import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Bell,
  FolderOpen,
  ScrollText,
  Settings,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Tag,
  MessageSquare,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { authStorage } from "../../shared/storage/authStorage";
import { hasRole } from "../../shared/utils/auth";
import styles from "./Sidebar.module.css";

const SIDEBAR_KEY = "zrlms_sidebar_collapsed";
/**
 * localStorage key cho accordion state. Pattern giống SIDEBAR_KEY + Table
 * columns ở các feature khác — JSON object { groupId: boolean }.
 *
 * Group chứa route active luôn ưu tiên mở dù localStorage nói khác (xem
 * `useResolvedGroups`).
 */
const ACCORDION_KEY = "zrlms_sidebar_accordion_v1";

type Role = "ADMIN" | "TEACHER" | "STUDENT";

interface MenuItem {
  label: string;
  to: string;
  Icon: LucideIcon;
  /** Role được phép thấy menu. Nếu undefined → mọi role đều thấy. */
  allowedRoles?: Role[];
}

interface MenuGroup {
  /** ID duy nhất, dùng cho localStorage key + auto-expand khi active. */
  id: string;
  /** Tiêu đề hiển thị ở header accordion. */
  label: string;
  items: MenuItem[];
}

// ===========================================================================
// Cấu trúc menu mới (khoá từ task):
//   ▶ Tổng quan:        Dashboard (đứng riêng, không bọc accordion)
//   ▶ Nội dung Public:  Quản lý giảng viên · Quản lý bảng giá · Lịch khai giảng
//   ▶ Vận hành:         Quản lý người dùng · Thông báo · Quản lý tệp ·
//                       Yêu cầu tư vấn · Thùng rác
//   ▶ Hệ thống:         Cài đặt hệ thống · Nhật ký hệ thống
//
// Lưu ý:
//   - Dashboard nằm riêng phía trên cùng (chỉ 1 mục, không cần accordion).
//   - "Tìm kiếm" BỎ HẲN khỏi Sidebar. Route /search vẫn hoạt động qua
//     shortcut Ctrl+K (đã có ở GlobalSearchPage), không xoá route.
// ===========================================================================
const DASHBOARD_ITEM: MenuItem = {
  label: "Dashboard",
  to: "/dashboard",
  Icon: LayoutDashboard,
};

const MENU_GROUPS: MenuGroup[] = [
  {
    id: "public-content",
    label: "Nội dung Public",
    items: [
      {
        label: "Quản lý giảng viên",
        to: "/teachers",
        Icon: Users,
        allowedRoles: ["ADMIN"],
      },
      {
        label: "Quản lý bảng giá",
        to: "/pricing-plans",
        Icon: Tag,
        allowedRoles: ["ADMIN"],
      },
      {
        label: "Lịch khai giảng",
        to: "/enrollment-schedule",
        Icon: CalendarClock,
        allowedRoles: ["ADMIN"],
      },
    ],
  },
  {
    id: "operations",
    label: "Vận hành",
    items: [
      {
        label: "Quản lý người dùng",
        to: "/users",
        Icon: Users,
        allowedRoles: ["ADMIN"],
      },
      { label: "Thông báo", to: "/notifications", Icon: Bell },
      { label: "Quản lý tệp", to: "/files", Icon: FolderOpen },
      {
        label: "Yêu cầu tư vấn",
        to: "/contact-requests",
        Icon: MessageSquare,
        allowedRoles: ["ADMIN"],
      },
      { label: "Thùng rác", to: "/trash", Icon: Trash2, allowedRoles: ["ADMIN"] },
    ],
  },
  {
    id: "system",
    label: "Hệ thống",
    items: [
      {
        label: "Cài đặt hệ thống",
        to: "/settings",
        Icon: Settings,
        allowedRoles: ["ADMIN"],
      },
      {
        label: "Nhật ký hệ thống",
        to: "/logs",
        Icon: ScrollText,
        allowedRoles: ["ADMIN"],
      },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onClose?: () => void;
  isDrawer?: boolean;
}

/**
 * Đọc state accordion từ localStorage.
 * Trả về Partial<Record<groupId, boolean>> — group nào không có key coi như
 * đóng (mặc định false); group active sẽ được ép mở ở `useResolvedGroups`.
 */
function loadAccordionState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(ACCORDION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, boolean>;
    }
    return {};
  } catch {
    return {};
  }
}

function saveAccordionState(state: Record<string, boolean>): void {
  try {
    localStorage.setItem(ACCORDION_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / privacy mode */
  }
}

/**
 * Tính trạng thái mở/đóng cuối cùng cho mỗi group:
 *   - Nhóm chứa route active: LUÔN MỞ (ưu tiên hơn localStorage).
 *   - Các nhóm còn lại: theo localStorage (mặc định đóng).
 */
function resolveGroups(
  groups: MenuGroup[],
  stored: Record<string, boolean>,
  pathname: string,
): Record<string, boolean> {
  const resolved: Record<string, boolean> = {};
  for (const group of groups) {
    const hasActive = group.items.some((it) =>
      pathname === it.to || pathname.startsWith(`${it.to}/`)
    );
    resolved[group.id] = hasActive || Boolean(stored[group.id]);
  }
  return resolved;
}

export function Sidebar({ collapsed, onToggle, onClose, isDrawer }: SidebarProps) {
  const location = useLocation();
  const currentRole = authStorage.getUser()?.role;

  // Filter theo role trước (admin-only ẩn khỏi teacher/student).
  const visibleDashboard = hasRole(currentRole, DASHBOARD_ITEM.allowedRoles)
    ? DASHBOARD_ITEM
    : null;
  const visibleGroups = useMemo(
    () =>
      MENU_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((it) => hasRole(currentRole, it.allowedRoles)),
      })).filter((g) => g.items.length > 0),
    [currentRole],
  );

  // Accordion state — lazy init từ localStorage.
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    loadAccordionState(),
  );

  // Re-resolve khi pathname đổi: nhóm active luôn mở.
  const effectiveOpen = useMemo(
    () => resolveGroups(visibleGroups, openMap, location.pathname),
    [visibleGroups, openMap, location.pathname],
  );

  // Đồng bộ xuống localStorage khi user toggle thủ công (không lưu trạng
  // thái ép mở do route active — chỉ lưu intent của user).
  useEffect(() => {
    saveAccordionState(openMap);
  }, [openMap]);

  function toggleGroup(groupId: string) {
    setOpenMap((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

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
          {/* Dashboard riêng (không bọc accordion) */}
          {visibleDashboard ? (
            <NavLink
              to={visibleDashboard.to}
              className={({ isActive }) =>
                [
                  styles.navItem,
                  isActive ? styles.active : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              title={collapsed ? visibleDashboard.label : undefined}
              onClick={isDrawer ? onClose : undefined}
            >
              <span className={styles.navIcon}>
                <visibleDashboard.Icon size={20} />
              </span>
              {!collapsed && (
                <span className={styles.navLabel}>
                  {visibleDashboard.label}
                </span>
              )}
            </NavLink>
          ) : null}

          {/* Các nhóm accordion */}
          {visibleGroups.map((group) => {
            const isOpen = effectiveOpen[group.id];
            const groupHasActive = group.items.some(
              (it) => it.to === location.pathname,
            );
            return (
              <section
                key={group.id}
                className={styles.group}
                aria-labelledby={`sidebar-group-${group.id}`}
              >
                {!collapsed ? (
                  <button
                    id={`sidebar-group-${group.id}`}
                    type="button"
                    className={[
                      styles.groupHeader,
                      groupHasActive ? styles.groupHeaderActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isOpen}
                    aria-controls={`sidebar-group-panel-${group.id}`}
                  >
                    <span className={styles.groupLabel}>{group.label}</span>
                    <ChevronDown
                      size={16}
                      className={[
                        styles.groupChevron,
                        isOpen ? styles.groupChevronOpen : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-hidden="true"
                    />
                  </button>
                ) : null}

                <div
                  id={`sidebar-group-panel-${group.id}`}
                  className={[
                    styles.groupPanel,
                    !isOpen && !collapsed ? styles.groupPanelClosed : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role="region"
                  aria-hidden={!isOpen && !collapsed}
                >
                  {group.items.map(({ label, to, Icon }) => {
                    const isActive =
                      location.pathname === to ||
                      location.pathname.startsWith(`${to}/`);
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
                </div>
              </section>
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
