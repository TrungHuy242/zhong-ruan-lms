/**
 * BulkActionBar — thanh action nổi khi có selection.
 *
 * GENERIC — tái sử dụng cho mọi feature cần bulk select (Users / Files / ...)
 * thay vì viết riêng. Parent truyền:
 *   - selectedCount
 *   - itemLabel: danh từ ("người dùng" / "file" / ...)
 *   - actions: danh sách action con (xoá, đổi trạng thái, tải xuống, ...)
 *   - loading / onClearSelection
 *
 * UI sticky trong card, hiện khi selectedCount > 0.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, X as XIcon } from "lucide-react";
import { Button } from "../ui";
import styles from "./BulkActionBar.module.css";

export interface BulkAction {
  /** Key duy nhất trong danh sách action. */
  key: string;
  /** Nhãn hiển thị trên nút. */
  label: string;
  /** Icon bên trái (ReactNode). */
  icon?: ReactNode;
  /** Variant — "danger" cho xoá, "secondary" cho còn lại. */
  variant?: "primary" | "secondary" | "danger";
  /**
   * Nếu có `subOptions`, nút này dropdown — click mở menu để chọn sub-option.
   * Mỗi sub-option gọi cùng 1 callback onAction với key khác nhau.
   */
  subOptions?: { key: string; label: string }[];
  /** Callback khi user chọn action (hoặc sub-option). */
  onAction: (key: string) => void;
}

export interface BulkActionBarProps {
  selectedCount: number;
  /** Danh từ tiếng Việt cho 1 item ("người dùng", "file"...). */
  itemLabel: string;
  /** Loading — disable tất cả action. */
  loading?: boolean;
  /** Danh sách action hiển thị (Xoá / Tải / Đổi trạng thái / ...). */
  actions: BulkAction[];
  /** Xoá toàn bộ selection. */
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  itemLabel,
  loading = false,
  actions,
  onClearSelection,
}: BulkActionBarProps) {
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openSubMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenSubMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openSubMenu]);

  if (selectedCount <= 0) return null;

  function handleAction(action: BulkAction, subKey?: string) {
    setOpenSubMenu(null);
    action.onAction(subKey ?? action.key);
  }

  return (
    <div className={styles.bar} role="region" aria-label="Hành động hàng loạt">
      <div className={styles.info}>
        <span className={styles.count}>{selectedCount}</span>
        <span className={styles.text}>{itemLabel} đã chọn</span>
      </div>

      <div className={styles.actions}>
        {actions.map((action) => {
          if (action.subOptions && action.subOptions.length > 0) {
            const isOpen = openSubMenu === action.key;
            return (
              <div key={action.key} ref={isOpen ? menuRef : null} className={styles.menuWrap}>
                <Button
                  variant={action.variant ?? "secondary"}
                  size="sm"
                  leftIcon={action.icon}
                  rightIcon={<ChevronDown size={14} />}
                  onClick={() => setOpenSubMenu(isOpen ? null : action.key)}
                  disabled={loading}
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                >
                  {action.label}
                </Button>
                {isOpen ? (
                  <div role="menu" className={styles.menu}>
                    {action.subOptions.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        role="menuitem"
                        className={styles.menuItem}
                        onClick={() => handleAction(action, opt.key)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <Button
              key={action.key}
              variant={action.variant ?? "secondary"}
              size="sm"
              leftIcon={action.icon}
              onClick={() => handleAction(action)}
              disabled={loading}
            >
              {action.label}
            </Button>
          );
        })}

        <button
          type="button"
          className={styles.clearBtn}
          aria-label="Bỏ chọn tất cả"
          onClick={onClearSelection}
          disabled={loading}
        >
          <XIcon size={16} />
        </button>
      </div>
    </div>
  );
}