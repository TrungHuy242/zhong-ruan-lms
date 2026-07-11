/**
 * SearchBar — Thanh tìm kiếm với debounce 450ms, autoFocus, clear button,
 * hiển thị Ctrl+K shortcut hint.
 *
 * Component controlled hoàn toàn — parent giữ `keyword` state và nhận callback
 * khi user thay đổi (onChangeDebounced) sau khi đã qua debounce.
 *
 * Lý do tách component:
 *   - Dùng lại cho SearchBar trên page + CommandPalette modal.
 *   - Đảm bảo hành vi debounce + clear + shortcut hiển thị giống nhau giữa 2 chỗ.
 *
 * Không xử lý submit: parent quyết định khi nào "apply" (debounce đã đủ).
 */
import { ChangeEvent, KeyboardEvent, forwardRef } from "react";
import { Search as SearchIcon, X as XIcon } from "lucide-react";
import { Input } from "../../../shared/components/ui";
import styles from "./SearchBar.module.css";

export interface SearchBarProps {
  /** Giá trị hiện tại (controlled). */
  value: string;
  /** Callback mỗi khi user gõ — KHÔNG debounce. */
  onChange: (next: string) => void;
  /**
   * Callback khi user nhấn Enter — dùng để apply ngay (skip debounce).
   * Nếu không truyền, Enter sẽ không có tác dụng đặc biệt.
   */
  onSubmit?: () => void;
  /** Placeholder tuỳ biến. */
  placeholder?: string;
  /** Auto focus khi mount (mặc định false). */
  autoFocus?: boolean;
  /** Hiển thị nhãn "Ctrl K" bên phải (mặc định false). */
  showShortcutHint?: boolean;
  /** Size input. */
  size?: "md" | "lg";
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar(
    {
      value,
      onChange,
      onSubmit,
      placeholder = "Nhập từ khoá cần tìm...",
      autoFocus = false,
      showShortcutHint = false,
      size = "md",
    },
    ref
  ) {
    function handleChange(e: ChangeEvent<HTMLInputElement>) {
      onChange(e.target.value);
    }
    function handleKey(e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Enter") {
        e.preventDefault();
        onSubmit?.();
      }
    }
    function clear() {
      onChange("");
    }
    return (
      <div
        className={[styles.wrapper, size === "lg" ? styles.lg : ""].join(" ")}
      >
        <Input
          ref={ref}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKey}
          leftIcon={<SearchIcon size={size === "lg" ? 18 : 16} />}
          rightIcon={
            value ? (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={clear}
                aria-label="Xoá từ khoá"
                tabIndex={-1}
              >
                <XIcon size={14} />
              </button>
            ) : showShortcutHint ? (
              <kbd className={styles.kbd}>Ctrl K</kbd>
            ) : undefined
          }
          autoFocus={autoFocus}
        />
      </div>
    );
  }
);