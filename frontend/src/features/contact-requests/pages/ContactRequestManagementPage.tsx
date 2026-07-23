/**
 * ContactRequestManagementPage — Trang admin quản lý Yêu cầu tư vấn.
 *
 * Pattern tham chiếu: features/pricing/pages/PricingManagementPage.tsx
 *   - Toolbar: search + filter (status).
 *   - Table sort + filter + URL query sync + skeleton loading.
 *   - Pagination + counter.
 *   - Click row → mở detail modal (đổi status inline).
 *
 * Tính năng:
 *   - Search theo tên/email/SĐT/lời nhắn (server-side qua keyword).
 *   - Filter theo status NEW / CONTACTED / CLOSED.
 *   - Hiển thị thống kê nhỏ (NEW / CONTACTED / CLOSED counts).
 *   - Soft-delete từ row (chuyển vào thùng rác) + soft-delete trong modal.
 */
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Pagination,
  Table,
  type SortConfig,
  type TableColumn,
} from "../../../shared/components/ui";
import { ApiError } from "../../../shared/api";
import { authStorage } from "../../../shared/storage/authStorage";
import { isAdmin } from "../../../shared/utils/auth";
import {
  CircleDot,
  Eye,
  MessageSquare,
  Search as SearchIcon,
  Trash2,
  X as XIcon,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  CONTACT_REQUEST_PAGE_SIZE,
  STATUS_LABELS,
  deleteContactRequest,
  listContactRequests,
  type ContactRequest,
  type ContactStatus,
} from "../services/contactRequestApi";
import { ContactRequestDetailModal } from "../components/ContactRequestDetailModal";
import styles from "./ContactRequestManagementPage.module.css";

const SORTABLE_CONTACT_KEYS = [
  "fullName",
  "email",
  "phone",
  "status",
  "createdAt",
  "updatedAt",
] as const;
type SortableContactKey = (typeof SORTABLE_CONTACT_KEYS)[number];
const SORTABLE_KEY_SET = new Set<string>(SORTABLE_CONTACT_KEYS);
function isSortableContactKey(k: string): k is SortableContactKey {
  return SORTABLE_KEY_SET.has(k);
}

interface FilterState {
  search: string;
  searchApplied: string;
  status: ContactStatus | "ALL";
  page: number;
  sort: SortConfig;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  searchApplied: "",
  status: "ALL",
  page: 1,
  sort: { key: "createdAt", order: "desc" },
};

const STATUS_OPTIONS: Array<ContactStatus | "ALL"> = [
  "ALL",
  "NEW",
  "CONTACTED",
  "CLOSED",
];

interface ConfirmState {
  open: boolean;
  loading: boolean;
  contact: ContactRequest | null;
}

function classNames(...values: Array<string | false | undefined | null>): string {
  return values.filter(Boolean).join(" ");
}

function formatShortDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

const STATUS_BADGE_CLASS: Record<ContactStatus, string> = {
  NEW: styles.status_NEW,
  CONTACTED: styles.status_CONTACTED,
  CLOSED: styles.status_CLOSED,
};

export function ContactRequestManagementPage() {
  const currentUser = authStorage.getUser();
  // Theo SPEC: trang này chỉ dành cho ADMIN. Nếu role khác mở được thì vẫn cho
  // xem (read-only) nhưng không cho đổi status / xoá.
  const canManage = isAdmin(currentUser?.role);

  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => {
    const init: FilterState = { ...INITIAL_FILTERS };
    const sp = searchParams.get("search");
    if (sp) {
      init.search = sp;
      init.searchApplied = sp;
    }
    const st = searchParams.get("status");
    if (st && STATUS_OPTIONS.includes(st as FilterState["status"])) {
      init.status = st as FilterState["status"];
    }
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");
    if (sortBy && isSortableContactKey(sortBy)) {
      init.sort = {
        key: sortBy,
        order: sortOrder === "asc" ? "asc" : "desc",
      };
    }
    const p = Number(searchParams.get("page") ?? "1");
    if (p > 1) init.page = p;
    return init;
  });

  // Sync URL
  useEffect(() => {
    const next: Record<string, string> = {};
    if (filters.searchApplied) next.search = filters.searchApplied;
    if (filters.status !== "ALL") next.status = filters.status;
    if (filters.sort.key !== "createdAt" || filters.sort.order !== "desc") {
      next.sortBy = filters.sort.key;
      next.sortOrder = filters.sort.order;
    }
    if (filters.page > 1) next.page = String(filters.page);
    setSearchParams(next, { replace: true });
  }, [
    filters.searchApplied,
    filters.status,
    filters.sort.key,
    filters.sort.order,
    filters.page,
    setSearchParams,
  ]);

  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<{
    NEW: number;
    CONTACTED: number;
    CLOSED: number;
  }>({ NEW: 0, CONTACTED: 0, CLOSED: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await listContactRequests({
        page: filters.page,
        limit: CONTACT_REQUEST_PAGE_SIZE,
        sortBy: filters.sort.key as SortableContactKey,
        sortOrder: filters.sort.order,
        search: filters.searchApplied || undefined,
        status: filters.status === "ALL" ? undefined : filters.status,
      });
      setContacts(result.contacts);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
      setStats(result.stats.byStatus);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được danh sách yêu cầu";
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [
    filters.page,
    filters.sort.key,
    filters.sort.order,
    filters.searchApplied,
    filters.status,
  ]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Debounce search input
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
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

  function handleSearchInput(e: ChangeEvent<HTMLInputElement>) {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  }
  function clearSearch() {
    setFilters((prev) => ({ ...prev, search: "", searchApplied: "", page: 1 }));
  }
  function handleStatusChange(value: ContactStatus | "ALL") {
    setFilters((prev) => ({ ...prev, status: value, page: 1 }));
  }
  function handleSortChange(next: SortConfig) {
    setFilters((prev) => ({ ...prev, sort: next, page: 1 }));
  }
  function handlePageChange(p: number) {
    setFilters((prev) => ({ ...prev, page: p }));
  }

  // Modal + confirm state
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeContact, setActiveContact] = useState<ContactRequest | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    loading: false,
    contact: null,
  });

  function openDetail(c: ContactRequest) {
    setActiveContact(c);
    setDetailOpen(true);
  }

  async function handleConfirmDelete() {
    if (!confirm.contact) return;
    setConfirm((p) => ({ ...p, loading: true }));
    try {
      await deleteContactRequest(confirm.contact.id);
      setBanner({
        type: "success",
        text: `Đã chuyển yêu cầu của "${confirm.contact.fullName}" vào thùng rác`,
      });
      setConfirm({ open: false, loading: false, contact: null });
      loadContacts();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không xoá được yêu cầu";
      setBanner({ type: "error", text: msg });
      setConfirm((p) => ({ ...p, loading: false }));
    }
  }

  const columns: TableColumn<ContactRequest>[] = [
    {
      key: "fullName",
      header: "Họ tên",
      sortable: true,
      render: (c) => <span style={{ fontWeight: 600 }}>{c.fullName}</span>,
    },
    {
      key: "phone",
      header: "Số điện thoại",
      sortable: true,
      render: (c) => (
        <a href={`tel:${c.phone}`} className={styles.valueLink}>
          {c.phone}
        </a>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      render: (c) => (
        <a href={`mailto:${c.email}`} className={styles.valueLink}>
          {c.email}
        </a>
      ),
    },
    {
      key: "message",
      header: "Lời nhắn",
      render: (c) => (
        <span className={styles.messageCell}>{truncate(c.message, 50)}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      sortable: true,
      render: (c) => (
        <span className={classNames(styles.statusBadge, STATUS_BADGE_CLASS[c.status])}>
          <CircleDot size={11} aria-hidden="true" />
          {STATUS_LABELS[c.status]}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Ngày gửi",
      sortable: true,
      render: (c) => (
        <span className={styles.dateCell}>{formatShortDateTime(c.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
        <div className={styles.actionWrap}>
          <button
            type="button"
            className={styles.actionTrigger}
            aria-label="Xem chi tiết"
            title="Xem chi tiết"
            onClick={() => openDetail(c)}
          >
            <Eye size={14} />
          </button>
          {canManage ? (
            <button
              type="button"
              className={classNames(styles.actionTrigger, styles.actionDanger)}
              aria-label="Xoá"
              title="Xoá (đưa vào thùng rác)"
              onClick={() => setConfirm({ open: true, loading: false, contact: c })}
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const emptyState = (
    <div className={styles.emptyState}>
      <MessageSquare size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        {filters.searchApplied || filters.status !== "ALL"
          ? "Không tìm thấy yêu cầu phù hợp"
          : "Chưa có yêu cầu tư vấn nào"}
      </p>
      <p className={styles.emptyHint}>
        Yêu cầu mới sẽ tự động xuất hiện khi có khách gửi form ở trang Liên hệ.
      </p>
    </div>
  );

  const statusFilterActive = filters.status !== "ALL";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Yêu cầu tư vấn</h1>
          <p className={styles.subtitle}>
            Quản lý các yêu cầu liên hệ gửi từ form trên trang Liên hệ công khai
            (<code>/lien-he</code>). Cập nhật trạng thái và phản hồi khách hàng.
          </p>
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

      {!canManage ? (
        <Alert variant="info">
          Bạn đang xem với quyền hạn chế. Chỉ quản trị viên mới có thể đổi trạng
          thái hoặc xoá yêu cầu.
        </Alert>
      ) : null}

      {/* Stats nhỏ */}
      <div className={styles.statRow}>
        <div className={classNames(styles.statCard, styles.statCardNEW)}>
          <span className={styles.statLabel}>Mới</span>
          <span className={styles.statValue}>{stats.NEW}</span>
        </div>
        <div className={classNames(styles.statCard, styles.statCardCONTACTED)}>
          <span className={styles.statLabel}>Đã liên hệ</span>
          <span className={styles.statValue}>{stats.CONTACTED}</span>
        </div>
        <div className={classNames(styles.statCard, styles.statCardCLOSED)}>
          <span className={styles.statLabel}>Đã đóng</span>
          <span className={styles.statValue}>{stats.CLOSED}</span>
        </div>
      </div>

      <Card padding="md" className={styles.tableCard}>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Input
              placeholder="Tìm theo tên, email hoặc số điện thoại"
              value={filters.search}
              onChange={handleSearchInput}
              leftIcon={<SearchIcon size={16} />}
              rightIcon={filters.search ? <XIcon size={14} /> : undefined}
              onRightIconClick={filters.search ? clearSearch : undefined}
            />
          </div>

          <div className={styles.toolbarActions}>
            <label className={styles.statusFilterLabel}>
              <span>Trạng thái:</span>
              <select
                className={styles.statusFilterSelect}
                value={filters.status}
                onChange={(e) =>
                  handleStatusChange(e.target.value as ContactStatus | "ALL")
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "ALL" ? "Tất cả" : STATUS_LABELS[s as ContactStatus]}
                  </option>
                ))}
              </select>
            </label>
            {statusFilterActive ? (
              <button
                type="button"
                className={styles.clearFilterBtn}
                onClick={() => handleStatusChange("ALL")}
              >
                <XIcon size={12} /> Bỏ lọc
              </button>
            ) : null}
          </div>
        </div>

        {loadError ? (
          <div className={styles.errorWrap}>
            <Alert variant="error">{loadError}</Alert>
            <Button variant="secondary" size="sm" onClick={loadContacts}>
              Thử lại
            </Button>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={contacts}
              loading={loading}
              skeletonRows={8}
              rowKey={(c) => c.id}
              emptyState={emptyState}
              sortable
              sortConfig={filters.sort}
              onSortChange={handleSortChange}
            />

            {!loading && contacts.length > 0 ? (
              <div className={styles.tableFooter}>
                <span className={styles.totalLabel}>
                  Hiển thị <b>{contacts.length}</b> / <b>{total}</b> yêu cầu
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
      </Card>

      <ContactRequestDetailModal
        open={detailOpen}
        contact={activeContact}
        onChanged={loadContacts}
        onClose={() => {
          setDetailOpen(false);
          setActiveContact(null);
        }}
      />

      <ConfirmDialog
        open={confirm.open}
        loading={confirm.loading}
        title="Xoá yêu cầu tư vấn?"
        message={
          confirm.contact ? (
            <>
              Yêu cầu của <b>{confirm.contact.fullName}</b> sẽ chuyển vào Thùng
              rác. Bạn có thể khôi phục lại sau khi xoá.
            </>
          ) : null
        }
        confirmText="Xoá"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirm({ open: false, loading: false, contact: null })}
      />
    </div>
  );
}
