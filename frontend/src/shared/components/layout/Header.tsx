import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  LogOut,
  Menu,
  User as UserIcon,
} from "lucide-react";
import { authStorage } from "../../storage/authStorage";
import { useNotifications } from "../../contexts/NotificationContext";
import { NotificationPanel } from "../../../features/notifications/components/NotificationPanel";
import styles from "./Header.module.css";

interface HeaderProps {
  onMenuClick: () => void;
}

function badgeText(count: number): string {
  if (count <= 0) return "";
  if (count > 9) return "9+";
  return String(count);
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const user = authStorage.getUser();
  const { unreadCount } = useNotifications();

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

  function handleBellToggle() {
    setBellOpen((v) => !v);
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

      {/* Bell */}
      <div className={styles.bellArea} ref={bellRef}>
        <button
          className={styles.bellBtn}
          onClick={handleBellToggle}
          aria-label="Thông báo"
          aria-haspopup="dialog"
          aria-expanded={bellOpen}
        >
          <Bell size={20} />
          {unreadCount > 0 ? (
            <span className={styles.bellBadge}>{badgeText(unreadCount)}</span>
          ) : null}
        </button>

        {bellOpen ? (
          <NotificationPanel onClose={() => setBellOpen(false)} />
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