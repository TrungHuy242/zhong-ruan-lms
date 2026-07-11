/**
 * RecentSearch — danh sách 10 từ khoá tìm kiếm gần nhất của user.
 *
 * Hành vi:
 *   - Click 1 item → gọi `onPick(keyword)` (parent thường set keyword + apply ngay).
 *   - Click nút X trên từng item → gọi `onRemoveOne(id)` để xoá 1 mục.
 *   - Click "Xoá tất cả" → gọi `onClearAll()` (parent show ConfirmDialog trước khi xoá).
 *
 * Loading: hiển thị 4 skeleton row.
 * Empty: hiển thị card khuyến khích user search.
 * Error: hiển thị Alert + nút "Thử lại" gọi `onRetry()`.
 *
 * Component hoàn toàn controlled (data + handlers đều từ parent) — phù hợp với
 * pattern fetch dữ liệu trong GlobalSearchPage để có thể refresh sau khi xoá.
 */
import { Fragment, ReactNode } from "react";
import {
  Alert,
  Button,
  Skeleton,
} from "../../../shared/components/ui";
import {
  Clock,
  Search as SearchIcon,
  Trash2,
  X as XIcon,
} from "lucide-react";
import type { SearchHistoryItem } from "../types/search.types";
import styles from "./RecentSearch.module.css";

export interface RecentSearchProps {
  /** Danh sách từ khoá gần nhất — đã sort desc theo createdAt. */
  items: SearchHistoryItem[];
  /** Đang tải dữ liệu. */
  loading?: boolean;
  /** Lỗi (null = không có). */
  error?: string | null;
  /** Click vào 1 item (parent set keyword + apply). */
  onPick: (keyword: string) => void;
  /** Xoá 1 item theo id. */
  onRemoveOne: (id: number) => void | Promise<void>;
  /** Xoá toàn bộ (parent nên show ConfirmDialog trước). */
  onClearAll: () => void | Promise<void>;
  /** Thử lại khi lỗi. */
  onRetry?: () => void;
  /** Disable toàn bộ (VD: đang trong quá trình xoá). */
  disabled?: boolean;
  /** Render prop cho header phụ (parent có thể thêm "Xoá tất cả"). */
  headerExtra?: ReactNode;
}

export function RecentSearch({
  items,
  loading,
  error,
  onPick,
  onRemoveOne,
  onClearAll,
  onRetry,
  disabled,
  headerExtra,
}: RecentSearchProps) {
  // ===== Loading =====
  if (loading) {
    return (
      <section className={styles.wrap} aria-labelledby="recent-heading">
        <div className={styles.header}>
          <h2 id="recent-heading" className={styles.title}>
            <Clock size={16} aria-hidden="true" />
            Tìm kiếm gần đây
          </h2>
        </div>
        <div className={styles.list} aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.row}>
              <Skeleton variant="text" width="60%" height={18} />
              <Skeleton variant="text" width="20%" height={14} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ===== Error =====
  if (error) {
    return (
      <section className={styles.wrap} aria-labelledby="recent-heading">
        <div className={styles.header}>
          <h2 id="recent-heading" className={styles.title}>
            <Clock size={16} aria-hidden="true" />
            Tìm kiếm gần đây
          </h2>
        </div>
        <Alert variant="error">{error}</Alert>
        {onRetry ? (
          <div className={styles.retryRow}>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Thử lại
            </Button>
          </div>
        ) : null}
      </section>
    );
  }

  // ===== Empty =====
  if (items.length === 0) {
    return (
      <section className={styles.wrap} aria-labelledby="recent-heading">
        <div className={styles.header}>
          <h2 id="recent-heading" className={styles.title}>
            <Clock size={16} aria-hidden="true" />
            Tìm kiếm gần đây
          </h2>
        </div>
        <div className={styles.empty}>
          <SearchIcon size={32} aria-hidden="true" />
          <p className={styles.emptyTitle}>Chưa có tìm kiếm nào</p>
          <p className={styles.emptyHint}>
            Các từ khoá bạn đã tìm sẽ xuất hiện tại đây để dùng lại nhanh.
          </p>
        </div>
      </section>
    );
  }

  // ===== List =====
  return (
    <section className={styles.wrap} aria-labelledby="recent-heading">
      <div className={styles.header}>
        <h2 id="recent-heading" className={styles.title}>
          <Clock size={16} aria-hidden="true" />
          Tìm kiếm gần đây
          <span className={styles.count}>{items.length}</span>
        </h2>
        {headerExtra ?? (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 size={14} />}
            onClick={onClearAll}
            disabled={disabled}
          >
            Xoá tất cả
          </Button>
        )}
      </div>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.row}>
            <button
              type="button"
              className={styles.pickBtn}
              onClick={() => onPick(item.keyword)}
              disabled={disabled}
              aria-label={`Tìm lại với từ khoá ${item.keyword}`}
            >
              <SearchIcon size={14} className={styles.pickIcon} aria-hidden="true" />
              <span className={styles.keyword}>{item.keyword}</span>
              <span className={styles.time}>{formatRelative(item.createdAt)}</span>
            </button>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => onRemoveOne(item.id)}
              disabled={disabled}
              aria-label={`Xoá mục ${item.keyword}`}
              title="Xoá mục này"
            >
              <XIcon size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diffMs = Date.now() - t;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  // Fallback: dd/MM
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
}

// Keep Fragment import warning-safe khi không dùng trực tiếp.
void Fragment;