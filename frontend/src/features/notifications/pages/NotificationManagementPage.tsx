import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Button,
  ConfirmDialog,
  Input,
  Pagination,
  Table,
  type TableColumn,
} from "../../../shared/components/ui";
import { NotificationFormModal } from "../../../shared/components/modals/NotificationFormModal";
import { NotificationDetailModal } from "../components/NotificationDetailModal";
import {
  deleteNotification,
  listNotifications,
  NOTIFICATION_PAGE_SIZE,
  type Notification,
} from "../services/notificationApi";
import { ApiError } from "../../../shared/api";
import { useNotifications } from "../../../shared/contexts/NotificationContext";
import { authStorage } from "../../../shared/storage/authStorage";
import {
  CheckCheck,
  Edit3,
  Eye,
  Plus,
  Search,
  Trash2,
  X as XIcon,
  Bell as BellIcon,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import styles from "./NotificationManagementPage.module.css";

type ReadFilter = "ALL" | "READ" | "UNREAD";

interface ConfirmState {
  open: boolean;
  loading: boolean;
  notification: Notification | null;
}

const INITIAL_FILTERS = {
  search: "",
  searchApplied: "",
  readFilter: "ALL" as ReadFilter,
  page: 1,
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function NotificationManagementPage() {
  const currentUser = authStorage.getUser();
  const canCreate = currentUser?.role === "ADMIN";
  const { unreadCount, refresh, markAll, markOneRead } = useNotifications();

  // ===== URL sync =====
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    ...INITIAL_FILTERS,
    search: searchParams.get("search") ?? "",
    searchApplied: searchParams.get("search") ?? "",
    readFilter: (searchParams.get("read") as ReadFilter) ?? "ALL",
    page: Number(searchParams.get("page") ?? "1") || 1,
  }));
  const [highlightId, setHighlightId] = useState<number | null>(
    Number(searchParams.get("highlight")) || null
  );

  useEffect(() => {
    const next: Record<string, string> = {};
    if (filters.searchApplied) next.search = filters.searchApplied;
    if (filters.readFilter !== "ALL") next.read = filters.readFilter;
    if (filters.page > 1) next.page = String(filters.page);
    if (highlightId) next.highlight = String(highlightId);
    setSearchParams(next, { replace: true });
  }, [filters.searchApplied, filters.readFilter, filters.page, highlightId, setSearchParams]);

  // ===== Data state =====
  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await listNotifications({
        search: filters.searchApplied || undefined,
        isRead:
          filters.readFilter === "READ"
            ? true
            : filters.readFilter === "UNREAD"
            ? false
            : undefined,
        page: filters.page,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được danh sách thông báo";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [filters.searchApplied, filters.readFilter, filters.page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // ===== Debounce search =====
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setFilters((prev) =>
        prev.search === prev.searchApplied
          ? prev
          : { ...prev, searchApplied: prev.search, page: 1 }
      );
    }, 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [filters.search]);

  // ===== Filters =====
  function handleSearchInput(e: ChangeEvent<HTMLInputElement>) {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  }
  function clearSearch() {
    setFilters((prev) => ({
      ...prev,
      search: "",
      searchApplied: "",
      page: 1,
    }));
  }
  function handleReadChange(e: ChangeEvent<HTMLSelectElement>) {
    setFilters((prev) => ({
      ...prev,
      readFilter: e.target.value as ReadFilter,
      page: 1,
    }));
  }

  // ===== Pagination =====
  const totalPages = Math.max(1, Math.ceil(total / NOTIFICATION_PAGE_SIZE));
  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  // ===== Modal state =====
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | string | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    loading: false,
    notification: null,
  });

  const [markAllLoading, setMarkAllLoading] = useState(false);

  // Dropdown action
  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setOpenActionId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openCreate() {
    setFormModalOpen(true);
  }
  function openDetail(n: Notification) {
    setDetailId(n.id);
    setDetailOpen(true);
    setOpenActionId(null);
  }
  function openDelete(n: Notification) {
    setConfirm({ open: true, loading: false, notification: n });
    setOpenActionId(null);
  }

  async function handleMarkOne(n: Notification) {
    setOpenActionId(null);
    await markOneRead(n.id);
    // Cập nhật local row ngay (optimistic).
    setItems((prev) =>
      prev.map((it) => (it.id === n.id ? { ...it, isRead: true } : it))
    );
    setBanner({ type: "success", text: "Đã đánh dấu thông báo là đã đọc" });
  }

  async function handleMarkAll() {
    setMarkAllLoading(true);
    try {
      await markAll();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setBanner({ type: "success", text: "Đã đánh dấu tất cả thông báo là đã đọc" });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không thể đánh dấu tất cả";
      setBanner({ type: "error", text: message });
    } finally {
      setMarkAllLoading(false);
    }
  }

  async function handleCreateSuccess(created: Notification[]) {
    setFormModalOpen(false);
    setBanner({
      type: "success",
      text: `Đã gửi thông báo tới ${created.length} người dùng`,
    });
    await refresh();
    await loadList();
  }

  async function handleConfirmDelete() {
    if (!confirm.notification) return;
    setConfirm((p) => ({ ...p, loading: true }));
    try {
      await deleteNotification(confirm.notification.id);
      setBanner({ type: "success", text: "Đã chuyển thông báo vào thùng rác" });
      setConfirm({ open: false, loading: false, notification: null });
      await loadList();
      await refresh();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Thao tác thất bại";
      setBanner({ type: "error", text: message });
      setConfirm((p) => ({ ...p, loading: false }));
    }
  }

  // Auto-open detail modal if ?highlight=<id>
  useEffect(() => {
    if (!highlightId) return;
    // Chỉ mở nếu data đã load và tìm thấy id trong trang hiện tại.
    if (loading) return;
    const found = items.find((n) => n.id === highlightId);
    if (found) {
      setDetailId(highlightId);
      setDetailOpen(true);
      setHighlightId(null); // clear để không mở lại
    }
  }, [highlightId, items, loading]);

  // ===== Table columns =====
  const columns: TableColumn<Notification>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Tiêu đề",
        render: (n) => (
          <span
            className={[
              styles.titleCell,
              !n.isRead ? styles.titleUnread : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {!n.isRead ? (
              <span className={styles.unreadDot} aria-hidden="true" />
            ) : null}
            {n.title}
          </span>
        ),
      },
      {
        key: "message",
        header: "Nội dung",
        render: (n) => (
          <span className={styles.messageCell}>
            {n.message.length > 80 ? n.message.slice(0, 80) + "…" : n.message}
          </span>
        ),
      },
      {
        key: "audience",
        header: "Đối tượng",
        render: (n) => (
          <span className={styles.audienceCell}>User #{n.userId}</span>
        ),
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (n) => (
          <span
            className={[
              styles.badge,
              n.isRead ? styles.badgeRead : styles.badgeUnread,
            ].join(" ")}
          >
            {n.isRead ? "Đã đọc" : "Chưa đọc"}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Ngày tạo",
        render: (n) => formatDateTime(n.createdAt),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (n) => {
          const isOpen = openActionId === n.id;
          return (
            <div
              ref={isOpen ? actionMenuRef : undefined}
              className={styles.actionWrap}
            >
              <button
                type="button"
                className={styles.actionTrigger}
                aria-label="Hành động"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenActionId(isOpen ? null : n.id);
                }}
              >
                <span aria-hidden="true">⋯</span>
              </button>
              {isOpen ? (
                <div role="menu" className={styles.actionMenu}>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.actionItem}
                    onClick={() => openDetail(n)}
                  >
                    <Eye size={14} /> Xem chi tiết
                  </button>
                  {!n.isRead ? (
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.actionItem}
                      onClick={() => handleMarkOne(n)}
                    >
                      <CheckCheck size={14} /> Đánh dấu đã đọc
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    className={[styles.actionItem, styles.actionItemDanger].join(
                      " "
                    )}
                    onClick={() => openDelete(n)}
                  >
                    <Trash2 size={14} /> Xoá
                  </button>
                </div>
              ) : null}
            </div>
          );
        },
      },
    ],
    [openActionId]
  );

  const isFiltered =
    Boolean(filters.searchApplied) || filters.readFilter !== "ALL";

  const emptyState = (
    <div className={styles.emptyState}>
      <BellIcon size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        {isFiltered
          ? "Không tìm thấy thông báo phù hợp bộ lọc"
          : "Chưa có thông báo nào"}
      </p>
      <p className={styles.emptyHint}>
        {isFiltered
          ? "Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm."
          : canCreate
          ? "Bắt đầu bằng cách tạo thông báo đầu tiên."
          : "Hệ thống sẽ gửi thông báo khi có sự kiện mới."}
      </p>
    </div>
  );

  // Keep selected item in sync if backend mutates it (e.g. after refresh).
  useEffect(() => {
    if (!detailOpen || detailId == null) return;
    const fresh = items.find((it) => it.id === detailId);
    if (fresh) {
      // No-op: we already load fresh in the detail modal itself.
    }
  }, [items, detailId, detailOpen]);

  // Avoid unused-var warning for Edit3 icon if reused later.
  void Edit3;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý thông báo</h1>
          <p className={styles.subtitle}>
            Theo dõi, đánh dấu đã đọc và gửi thông báo tới người dùng.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            size="md"
            leftIcon={<CheckCheck size={16} />}
            onClick={handleMarkAll}
            isLoading={markAllLoading}
            disabled={unreadCount === 0}
          >
            Đánh dấu tất cả đã đọc
            {unreadCount > 0 ? (
              <span className={styles.countChip}>{unreadCount}</span>
            ) : null}
          </Button>
          {canCreate ? (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus size={16} />}
              onClick={openCreate}
            >
              Tạo thông báo
            </Button>
          ) : null}
        </div>
      </header>

      {banner ? (
        <Alert
          variant={banner.type === "success" ? "success" : "error"}
          onClose={() => setBanner(null)}
        >
          {banner.text}
        </Alert>
      ) : null}

      <div className={styles.tableCard}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Input
              placeholder="Tìm theo tiêu đề hoặc nội dung"
              value={filters.search}
              onChange={handleSearchInput}
              leftIcon={<Search size={16} />}
              rightIcon={filters.search ? <XIcon size={14} /> : undefined}
              onRightIconClick={filters.search ? clearSearch : undefined}
            />
          </div>

          <label className={styles.filterLabel}>
            <span>Trạng thái</span>
            <select
              className={styles.select}
              value={filters.readFilter}
              onChange={handleReadChange}
            >
              <option value="ALL">Tất cả</option>
              <option value="UNREAD">Chưa đọc</option>
              <option value="READ">Đã đọc</option>
            </select>
          </label>
        </div>

        {/* Error state */}
        {loadError ? (
          <div className={styles.errorWrap}>
            <Alert variant="error">{loadError}</Alert>
            <Button variant="secondary" size="sm" onClick={loadList}>
              Thử lại
            </Button>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={items}
              loading={loading}
              skeletonRows={6}
              rowKey={(n) => n.id}
              emptyState={emptyState}
              rowClassName={(n) => (!n.isRead ? styles.rowUnread : undefined)}
            />

            {!loading && items.length > 0 ? (
              <div className={styles.tableFooter}>
                <span className={styles.totalLabel}>
                  Hiển thị <b>{items.length}</b> / <b>{total}</b> thông báo
                </span>
                <Pagination
                  currentPage={filters.page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      <NotificationFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <NotificationDetailModal
        open={detailOpen}
        notificationId={detailId}
        onClose={() => setDetailOpen(false)}
      />

      <ConfirmDialog
        open={confirm.open}
        loading={confirm.loading}
        title="Xoá thông báo?"
        message={
          <>
            Bạn sắp xoá thông báo <b>{confirm.notification?.title}</b>. Đây là
            <b> xoá mềm</b> — thông báo vẫn có thể được khôi phục lại sau.
          </>
        }
        confirmText="Xoá"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirm((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}