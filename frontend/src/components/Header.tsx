import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, LogOut, User as UserIcon } from "lucide-react";
import { authStorage } from "../lib/authStorage";
import styles from "./Header.module.css";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const user = authStorage.getUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = user?.fullName
    ? user.fullName
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  // Close dropdown when clicking outside.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  function handleLogout() {
    authStorage.clear();
    navigate("/login", { replace: true });
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

      {/* User info + dropdown */}
      <div className={styles.userArea} ref={dropdownRef}>
        <button
          className={styles.userBtn}
          onClick={() => setDropdownOpen((v) => !v)}
          aria-expanded={dropdownOpen}
          aria-haspopup="menu"
        >
          <span className={styles.avatar}>{initials}</span>
          <span className={styles.userName}>{user?.fullName ?? "Người dùng"}</span>
        </button>

        {dropdownOpen && (
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
