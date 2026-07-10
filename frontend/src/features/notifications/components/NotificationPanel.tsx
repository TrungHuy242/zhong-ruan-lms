/**
 * NotificationPanel — Notification Center lớn (thay cho Bell dropdown cũ).
 *
 * Tính năng:
 *   - Header: tiêu đề "Thông báo" + nút "Đánh dấu tất cả đã đọc" + "Xem tất cả"
 *   - Search input (debounce 400ms) + tabs filter (Tất cả / Chưa đọc / Đã đọc)
 *   - Infinite scroll (IntersectionObserver) qua useInfiniteScroll
 *   - Group theo ngày (Hôm nay / Hôm qua / 7 ngày trước / Cũ hơn)
 *   - Sticky group headers
 *   - Realtime inject qua `incomingItem` prop (do Header/AdminLayout cung cấp,
 *     đã được NotificationContext merge vào state).
 *   - Toast nhỏ khi có noti mới (nếu bật prop showNewToast).
 */

import {
  ChangeEvent,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Input,
} from "../../../shared/components/ui";
import {
  listNotifications,
  type Notification,
  type NotificationStatusFilter,
} from "../services/notificationApi";
import { ApiError } from "../../../shared/api";
import { useInfiniteScroll } from "../../../shared/hooks/useInfiniteScroll";
import { useNotifications } from "../../../shared/contexts/NotificationContext";
import {
  NOTIFICATION_TIME_GROUP_ORDER,
  NotificationGroupHeader,
  getNotificationTimeGroup,
  type NotificationTimeGroup,
} from "./NotificationGroupHeader";
import {
  CheckCheck,
  Search as SearchIcon,
  X as XIcon,
  BellOff,
  RefreshCw,
  Inbox,
} from "lucide-react";
import styles from "./NotificationPanel.module.css";
import { NotificationDetailModal } from "./NotificationDetailModal";

export interface NotificationPanelProps {
  /** Callback đóng panel (click ra ngoài, ESC, click item, ...). */
  onClose: () => void;
  /**
   * Có nên hiển thị toast nhỏ báo "Bạn có thông báo mới" khi có event realtime.
   * Mặc định false — Header tự quản lý toast riêng để tránh double.
   */
  showNewToast?: boolean;
}

const SEARCH_DEBOUNCE_MS = 400;

/**
 * Lưu searchText vào state tạm (controlled input) — debounce 400ms mới gọi API.
 */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
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

const TYPE_LABEL: Record<Notification["type"], string> = {
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  ERROR: "ERROR",
};

const TYPE_CLASS: Record<Notification["type"], string> = {
  INFO: styles.itemTypeInfo,
  SUCCESS: styles.itemTypeSuccess,
  WARNING: styles.itemTypeWarning,
  ERROR: styles.itemTypeError,
};

const PAGE_SIZE = 20;

interface PendingMarkRead {
  ids: Set<number | string>;
}

export function NotificationPanel({
  onClose,
  showNewToast = false,
}: NotificationPanelProps) {
  const navigate = useNavigate();

  // ===== Filters state =====
  const [statusFilter, setStatusFilter] = useState<NotificationStatusFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const searchApplied = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  // ===== Pagination state =====
  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Track các id đang trong quá trình mark-read (tránh click trùng).
  const pendingRef = useRef<PendingMarkRead>({ ids: new Set() });

  // Lấy mark-read/mark-all từ context để Bell badge cũng update ngay.
  const { markOneRead, markAll: contextMarkAll } = useNotifications();

  // Toast state khi có noti mới.
  const [newToast, setNewToast] = useState<Notification | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | string | null>(null);

  // ===== Derived: pageSize + hasMore =====
  const hasMore = items.length < total;

  /**
   * Group items theo thời gian — trả về Map<group, Notification[]>.
   * Giữ nguyên thứ tự items (BE đã sort createdAt desc).
   */
  const groupedItems = useMemo(() => {
    const map = new Map<NotificationTimeGroup, Notification[]>();
    for (const g of NOTIFICATION_TIME_GROUP_ORDER) {
      map.set(g, []);
    }
    for (const n of items) {
      const g = getNotificationTimeGroup(n.createdAt);
      map.get(g)?.push(n);
    }
    return map;
  }, [items]);

  // Unread count local (trong items đã load — dùng cho tab badge).
  const unreadInList = useMemo(
    () => items.filter((n) => !n.isRead).length,
    [items]
  );

  // ===== Load list =====
  const resetAndLoad = useCallback(
    async (filter: NotificationStatusFilter, search: string) => {
      setLoadingFirst(true);
      setLoadError(null);
      try {
        const isRead =
          filter === "READ" ? true : filter === "UNREAD" ? false : undefined;
        const result = await listNotifications({
          search: search || undefined,
          isRead,
          page: 1,
          pageSize: PAGE_SIZE,
        });
        setItems(result.items);
        setTotal(result.total);
        setPage(1);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Không tải được danh sách thông báo";
        setLoadError(message);
      } finally {
        setLoadingFirst(false);
      }
    },
    []
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loadError) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const isRead =
        statusFilter === "READ" ? true : statusFilter === "UNREAD" ? false : undefined;
      const result = await listNotifications({
        search: searchApplied || undefined,
        isRead,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });
      setItems((prev) => {
        // Chống duplicate id (phòng trường hợp BE trả overlap giữa 2 page).
        const existing = new Set(prev.map((p) => p.id));
        const appended = result.items.filter((it) => !existing.has(it.id));
        return [...prev, ...appended];
      });
      setTotal(result.total);
      setPage(nextPage);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải thêm được thông báo";
      setLoadError(message);
    } finally {
      setLoadingMore(false);
    }
  }, [
    loadingMore,
    hasMore,
    loadError,
    page,
    statusFilter,
    searchApplied,
  ]);

  // ===== Effects =====
  // Reset + load khi filter hoặc search thay đổi.
  useEffect(() => {
    void resetAndLoad(statusFilter, searchApplied);
  }, [statusFilter, searchApplied, resetAndLoad]);

  // Đóng toast sau 4s.
  useEffect(() => {
    if (!newToast) return;
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setNewToast(null);
    }, 4000);
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [newToast]);

  // ESC để đóng panel.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (detailOpen) return; // để Modal tự xử lý
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, detailOpen]);

  // ===== Infinite scroll sentinel =====
  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    onLoadMore: loadMore,
    isLoading: loadingMore,
    hasMore,
  });

  // ===== Handlers =====
  function handleSearchInput(e: ChangeEvent<HTMLInputElement>) {
    setSearchInput(e.target.value);
  }
  function clearSearch() {
    setSearchInput("");
  }

  function handleTabChange(next: NotificationStatusFilter) {
    if (next === statusFilter) return;
    setStatusFilter(next);
    setPage(1);
  }

  async function handleItemClick(n: Notification) {
    setDetailId(n.id);
    setDetailOpen(true);
  }

  async function handleMarkOne(n: Notification, e: ReactMouseEvent) {
    e.stopPropagation();
    if (pendingRef.current.ids.has(n.id) || n.isRead) return;
    pendingRef.current.ids.add(n.id);
    // Optimistic: cập nhật state ngay.
    setItems((prev) =>
      prev.map((it) => (it.id === n.id ? { ...it, isRead: true } : it))
    );
    try {
      // markOneRead từ context — đã handle optimistic + revert + cập nhật
      // Bell badge đồng thời.
      await markOneRead(n.id);
      // BE đã emit `notification:read` qua socket → context sẽ đồng bộ các tab khác.
    } catch {
      // Revert nếu fail (markOneRead đã revert local của nó; nhưng panel list
      // do chúng ta quản lý riêng, cần revert thủ công).
      setItems((prev) =>
        prev.map((it) =>
          it.id === n.id ? { ...it, isRead: false } : it
        )
      );
    } finally {
      pendingRef.current.ids.delete(n.id);
    }
  }

  async function handleMarkAll() {
    try {
      await contextMarkAll();
      setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không thể đánh dấu tất cả";
      setLoadError(message);
    }
  }

  function handleViewAll() {
    onClose();
    navigate("/notifications");
  }

  // Khi đóng detail modal: refresh nhẹ để đồng bộ isRead state giữa panel và
  // context (detail modal đã auto-mark-read qua context).
  function handleDetailClose() {
    setDetailOpen(false);
    void resetAndLoad(statusFilter, searchApplied);
  }

  /**
   * Inject 1 notification từ socket event — gọi từ consumer (Header/AdminLayout).
   * Hàm này được expose qua window.__notificationPanelApi (Header set).
   * Xem Header.tsx để rõ cơ chế.
   */
  useEffect(() => {
    const api = (window as unknown as {
      __notificationPanelApi?: {
        inject: (n: Notification) => void;
      };
    }).__notificationPanelApi;
    if (!api) return;
    api.inject = (n: Notification) => {
      setItems((prev) => {
        // Bỏ qua nếu đã có (tránh duplicate giữa REST refresh và socket).
        if (prev.some((p) => p.id === n.id)) return prev;
        // Chèn ở đầu nếu cùng statusFilter, ngược lại bỏ qua để tránh "lẫn"
        // giữa các tab.
        if (statusFilter === "READ" && !n.isRead) return prev;
        if (statusFilter === "UNREAD" && n.isRead) return prev;
        return [n, ...prev];
      });
      setTotal((t) => t + 1);
      if (showNewToast) setNewToast(n);
    };
    return () => {
      if (api.inject) api.inject = () => undefined;
    };
  }, [statusFilter, showNewToast]);

  /**
   * Refresh state khi context (hoặc socket reconnect) catch-up xong — đồng bộ
   * lại danh sách mà không reset về page 1.
   */
  useEffect(() => {
    const api = (window as unknown as {
      __notificationPanelApi?: {
        refresh?: () => void;
      };
    }).__notificationPanelApi;
    if (!api) return;
    api.refresh = () => {
      void resetAndLoad(statusFilter, searchApplied);
    };
    return () => {
      if (api.refresh) api.refresh = () => undefined;
    };
  }, [resetAndLoad, statusFilter, searchApplied]);

  // ===== Render helpers =====
  function renderEmpty() {
    if (statusFilter === "UNREAD") {
      return (
        <div className={styles.empty}>
          <BellOff size={42} className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyTitle}>Không có thông báo chưa đọc nào</p>
          <p className={styles.emptyHint}>
            Bạn đã đọc hết thông báo. Thông báo mới sẽ xuất hiện tại đây.
          </p>
        </div>
      );
    }
    if (statusFilter === "READ") {
      return (
        <div className={styles.empty}>
          <Inbox size={42} className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyTitle}>Chưa có thông báo đã đọc</p>
          <p className={styles.emptyHint}>
            Các thông báo đã đọc sẽ hiển thị tại đây.
          </p>
        </div>
      );
    }
    if (searchApplied) {
      return (
        <div className={styles.empty}>
          <SearchIcon size={42} className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyTitle}>Không tìm thấy kết quả</p>
          <p className={styles.emptyHint}>
            Thử từ khoá khác hoặc xoá bộ lọc đang áp dụng.
          </p>
        </div>
      );
    }
    return (
      <div className={styles.empty}>
        <Inbox size={42} className={styles.emptyIcon} aria-hidden="true" />
        <p className={styles.emptyTitle}>Chưa có thông báo nào</p>
        <p className={styles.emptyHint}>
          Hệ thống sẽ gửi thông báo khi có sự kiện mới.
        </p>
      </div>
    );
  }

  function renderItem(n: Notification) {
    const unread = !n.isRead;
    return (
      <button
        key={n.id}
        type="button"
        className={[styles.item, unread ? styles.itemUnread : styles.itemRead]
          .filter(Boolean)
          .join(" ")}
        onClick={() => handleItemClick(n)}
        aria-label={n.title}
      >
        <span
          className={[styles.itemDot, unread ? styles.itemDotUnread : ""]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        />
        <span className={styles.itemBody}>
          <span className={styles.itemHeader}>
            <span
              className={[
                styles.itemTitle,
                unread ? styles.itemTitleUnread : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {n.title}
            </span>
            <span
              className={[styles.itemType, TYPE_CLASS[n.type]].join(" ")}
              aria-hidden="true"
            >
              {TYPE_LABEL[n.type]}
            </span>
          </span>
          {n.message ? (
            <span className={styles.itemPreview}>{n.message}</span>
          ) : null}
          <span className={styles.itemHeader}>
            <span className={styles.itemMeta}>{relativeTime(n.createdAt)}</span>
            <span className={styles.itemActions}>
              {unread ? (
                <button
                  type="button"
                  className={styles.itemActionBtn}
                  onClick={(e) => handleMarkOne(n, e)}
                  aria-label="Đánh dấu đã đọc"
                  disabled={pendingRef.current.ids.has(n.id)}
                >
                  <CheckCheck size={13} aria-hidden="true" />
                  Đánh dấu đã đọc
                </button>
              ) : null}
            </span>
          </span>
        </span>
      </button>
    );
  }

  const hasItems = items.length > 0;
  const unreadTabCount = statusFilter === "UNREAD" ? items.length : unreadInList;

  return (
    <>
      <div className={styles.panel} role="dialog" aria-label="Trung tâm thông báo">
        {/* ===== Header ===== */}
        <header className={styles.panelHeader}>
          <h3 className={styles.panelTitle}>Thông báo</h3>
          <div className={styles.panelHeaderActions}>
            <button
              type="button"
              className={styles.panelHeaderLink}
              onClick={handleMarkAll}
              disabled={loadingFirst || unreadInList === 0}
              aria-label="Đánh dấu tất cả đã đọc"
            >
              <CheckCheck size={14} aria-hidden="true" />
              Đánh dấu tất cả đã đọc
            </button>
            <button
              type="button"
              className={styles.panelHeaderLink}
              onClick={handleViewAll}
            >
              Xem tất cả
            </button>
          </div>
        </header>

        {/* ===== Toolbar: search + tabs ===== */}
        <div className={styles.toolbar}>
          <Input
            placeholder="Tìm theo tiêu đề hoặc nội dung"
            value={searchInput}
            onChange={handleSearchInput}
            leftIcon={<SearchIcon size={16} />}
            rightIcon={searchInput ? <XIcon size={14} /> : undefined}
            onRightIconClick={searchInput ? clearSearch : undefined}
            className={styles.searchInput}
            aria-label="Tìm kiếm thông báo"
          />
          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "ALL"}
              className={[styles.tab, statusFilter === "ALL" ? styles.tabActive : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleTabChange("ALL")}
            >
              Tất cả
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "UNREAD"}
              className={[
                styles.tab,
                statusFilter === "UNREAD" ? styles.tabActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleTabChange("UNREAD")}
            >
              Chưa đọc
              {unreadTabCount > 0 ? (
                <span className={styles.tabBadge}>
                  {unreadTabCount > 99 ? "99+" : unreadTabCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "READ"}
              className={[
                styles.tab,
                statusFilter === "READ" ? styles.tabActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleTabChange("READ")}
            >
              Đã đọc
            </button>
          </div>
        </div>

        {/* ===== Body ===== */}
        <div className={styles.body}>
          {loadError ? (
            <div className={styles.errorBox}>
              <Alert variant="error">{loadError}</Alert>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw size={14} />}
                onClick={() => resetAndLoad(statusFilter, searchApplied)}
              >
                Thử lại
              </Button>
            </div>
          ) : loadingFirst ? (
            <div className={styles.skeletonList}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div className={styles.skeletonRow} key={i}>
                  <span className={styles.skeletonDot} />
                  <div className={styles.skeletonLines}>
                    <span
                      className={[styles.skeletonLine, styles.skeletonLineShort].join(" ")}
                    />
                    <span className={styles.skeletonLine} />
                  </div>
                </div>
              ))}
            </div>
          ) : !hasItems ? (
            renderEmpty()
          ) : (
            <>
              {NOTIFICATION_TIME_GROUP_ORDER.map((g) => {
                const list = groupedItems.get(g) ?? [];
                if (list.length === 0) return null;
                return (
                  <div key={g}>
                    <NotificationGroupHeader group={g} />
                    {list.map((n) => renderItem(n))}
                  </div>
                );
              })}
              {/* sentinel cho infinite scroll */}
              <div ref={sentinelRef} aria-hidden="true" />
              {loadingMore ? (
                <div className={styles.loadingMore} role="status">
                  <span className={styles.loadingMoreDot} />
                  <span className={styles.loadingMoreDot} />
                  <span className={styles.loadingMoreDot} />
                  <span>Đang tải thêm...</span>
                </div>
              ) : !hasMore ? (
                <div className={styles.loadingMore}>
                  <span style={{ opacity: 0.7 }}>Đã hiển thị tất cả</span>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* ===== Footer summary ===== */}
        {!loadingFirst && !loadError && hasItems ? (
          <div className={styles.footerSummary}>
            <span>
              Hiển thị <b>{items.length}</b> / <b>{total}</b>
            </span>
          </div>
        ) : null}
      </div>

      {/* Detail modal — dùng lại component đã có */}
      <NotificationDetailModal
        open={detailOpen}
        notificationId={detailId}
        onClose={handleDetailClose}
      />

      {/* Toast nhỏ báo có noti mới — đặt cố định góc dưới phải viewport, không
          che UI của panel. */}
      {newToast ? (
        <div
          role="status"
          aria-live="polite"
          onClick={() => {
            setNewToast(null);
            handleItemClick(newToast);
          }}
          style={{
            position: "fixed",
            right: "var(--space-6)",
            bottom: "var(--space-6)",
            zIndex: 80,
            cursor: "pointer",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--brand-primary)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-modal)",
            padding: "var(--space-3) var(--space-4)",
            maxWidth: "320px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <strong
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {newToast.title}
          </strong>
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              lineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {newToast.message}
          </span>
        </div>
      ) : null}
    </>
  );
}