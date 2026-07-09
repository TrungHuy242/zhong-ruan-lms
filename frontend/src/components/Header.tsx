import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  LogOut,
  Menu,
  User as UserIcon,
} from "lucide-react";
import { authStorage } from "../lib/authStorage";
import { useNotifications } from "../lib/NotificationContext";
import type { Notification } from "../lib/notificationApi";
import styles from "./Header.module.css";

interface HeaderProps {
  onMenuClick: () => void;
}

function relativeTime(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const diffMs = Date.now() - new Date(value).getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} giờ trước`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD} ngày trước`;
    return new Date(value).toLocaleDateString("vi-VN");
  } catch {
    return "";
  }
}

function badgeText(count: number): string {
  if (count <= 0) return "";
  if (count > 9) return "9+";
  return String(count);
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const user = authStorage.getUser();
  const { unreadCount, recent, markOneRead, markAll } = useNotifications();

  const [userOpen, setUserOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const initials = user?.fullName
    ? user.fullName
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  // Đóng dropdown khi click ra ngoài.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userOpen && userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
      if (bellOpen && bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    if (userOpen || bellOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userOpen, bellOpen]);

  function handleLogout() {
    authStorage.clear();
    navigate("/login", { replace: true });
  }

  function handleBellClickItem(n: Notification) {
    setBellOpen(false);
    // Đánh dấu đã đọc (optimistic) + navigate tới trang với highlight.
    if (!n.isRead) {
      markOneRead(n.id);
    }
    navigate(`/notifications?highlight=${n.id}`);
  }

  async function handleMarkAllClick() {
    await markAll();
    // Giữ dropdown mở để user thấy badge update.
  }

  return (
    <header className={styles.header}>
      {/* Hamburger — only visible on mobile/tablet */}
      <button
        className={styles.hamburger}
        onClick={onMenuClick}
        aria-label="Mở menu điều hướng"
      >
        <Menu size={22} />
      </button>

      {/* Spacer so title is pushed to the right */}
      <div className={styles.spacer} />

      {/* Bell + User */}
      <div className={styles.bellArea} ref={bellRef}>
        <button
          className={styles.bellBtn}
          onClick={() => setBellOpen((v) => !v)}
          aria-label="Thông báo"
          aria-haspopup="menu"
          aria-expanded={bellOpen}
        >
          <Bell size={20} />
          {unreadCount > 0 ? (
            <span className={styles.bellBadge}>{badgeText(unreadCount)}</span>
          ) : null}
        </button>

        {bellOpen ? (
          <div className={styles.bellDropdown} role="menu" aria-label="Thông báo">
            <div className={styles.bellDropdownHeader}>
              <span className={styles.bellDropdownTitle}>Thông báo</span>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    className={styles.bellDropdownLink}
                    onClick={handleMarkAllClick}
                    aria-label="Đánh dấu tất cả đã đọc"
                  >
                    <CheckCheck
                      size={14}
                      style={{ verticalAlign: "middle", marginRight: 4 }}
                    />
                    Đánh dấu tất cả đã đọc
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.bellDropdownLink}
                  onClick={() => {
                    setBellOpen(false);
                    navigate("/notifications");
                  }}
                >
                  Xem tất cả
                </button>
              </div>
            </div>
            <div className={styles.bellDropdownList}>
              {recent.length === 0 ? (
                <div className={styles.bellEmpty}>Không có thông báo mới</div>
              ) : (
                recent.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    role="menuitem"
                    className={styles.bellItem}
                    onClick={() => handleBellClickItem(n)}
                  >
                    <span
                      className={[
                        styles.bellItemDot,
                        !n.isRead && styles.bellItemDotUnread,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-hidden="true"
                    />
                    <span className={styles.bellItemBody}>
                      <span
                        className={[
                          styles.bellItemTitle,
                          !n.isRead && styles.bellItemTitleUnread,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {n.title}
                      </span>
                      <span className={styles.bellItemMeta}>
                        {relativeTime(n.createdAt)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* User info + dropdown */}
      <div className={styles.userArea} ref={userRef}>
        <button
          className={styles.userBtn}
          onClick={() => setUserOpen((v) => !v)}
          aria-expanded={userOpen}
          aria-haspopup="menu"
        >
          <span className={styles.avatar}>{initials}</span>
          <span className={styles.userName}>{user?.fullName ?? "Người dùng"}</span>
        </button>

        {userOpen && (
          <div className={styles.dropdown} role="menu">
            <div className={styles.dropdownHeader}>
              <span className={styles.dropdownName}>{user?.fullName}</span>
              <span className={styles.dropdownEmail}>{user?.email}</span>
            </div>
            <div className={styles.dropdownDivider} />
            <button
              className={styles.dropdownItem}
              role="menuitem"
              onClick={handleLogout}
            >
              <LogOut size={15} />
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

// Tránh TS unused warning cho UserIcon khi import trùng.
void UserIcon;