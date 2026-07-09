/**
 * BulkActionBar — thanh action nổi khi có user đang chọn.
 *
 * Hiện: "Đã chọn N user" + nút Xoá + nút Đổi trạng thái (dropdown chọn status).
 * Parent xử lý ConfirmDialog + gọi API — component này chỉ render UI + callback.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "../../../shared/components/ui";
import type { UserStatus } from "../types/user.types";
import { ChevronDown, Trash2, ToggleRight, X as XIcon } from "lucide-react";
import styles from "./BulkActionBar.module.css";

export interface BulkActionBarProps {
  selectedCount: number;
  loading?: boolean;
  onDelete: () => void;
  onChangeStatus: (status: UserStatus) => void;
  onClearSelection: () => void;
}

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
  { value: "SUSPENDED", label: "Bị đình chỉ" },
];

export function BulkActionBar({
  selectedCount,
  loading = false,
  onDelete,
  onChangeStatus,
  onClearSelection,
}: BulkActionBarProps) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Click outside để đóng dropdown status
  useEffect(() => {
    if (!statusMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [statusMenuOpen]);

  if (selectedCount <= 0) return null;

  function pickStatus(status: UserStatus) {
    setStatusMenuOpen(false);
    onChangeStatus(status);
  }

  return (
    <div className={styles.bar} role="region" aria-label="Hành động hàng loạt">
      <div className={styles.info}>
        <span className={styles.count}>{selectedCount}</span>
        <span className={styles.text}>
          người dùng đã chọn
        </span>
      </div>

      <div className={styles.actions}>
        <div ref={menuRef} className={styles.statusWrap}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ToggleRight size={14} />}
            rightIcon={<ChevronDown size={14} />}
            onClick={() => setStatusMenuOpen((v) => !v)}
            disabled={loading}
            aria-expanded={statusMenuOpen}
            aria-haspopup="menu"
          >
            Đổi trạng thái
          </Button>
          {statusMenuOpen ? (
            <div role="menu" className={styles.statusMenu}>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitem"
                  className={styles.statusItem}
                  onClick={() => pickStatus(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <Button
          variant="danger"
          size="sm"
          leftIcon={<Trash2 size={14} />}
          onClick={onDelete}
          disabled={loading}
        >
          Xoá
        </Button>

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