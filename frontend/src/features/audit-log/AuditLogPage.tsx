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
  Input,
  Pagination,
  Table,
  type TableColumn,
} from "../../shared/components/ui";
import { AuditLogDetailModal } from "./AuditLogDetailModal";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_GROUPS,
  AUDIT_GROUP_LABELS,
  listAuditLogs,
  type AuditAction,
  type AuditActionGroup,
  type AuditLog,
} from "./auditLogApi";
import { ApiError } from "../../shared/lib/api";
import { listUsers, type User } from "../users/userApi";
import { ScrollText, Search, X as XIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import styles from "./AuditLogPage.module.css";

interface FiltersState {
  search: string;
  searchApplied: string;
  action: "" | AuditAction;
  userId: "" | number;
  from: string; // YYYY-MM-DD
  to: string;
  page: number;
}

const INITIAL_FILTERS: FiltersState = {
  search: "",
  searchApplied: "",
  action: "",
  userId: "",
  from: "",
  to: "",
  page: 1,
};

const GROUP_CLASS: Record<AuditActionGroup, string> = {
  create: styles.badgeCreate ?? "",
  update: styles.badgeUpdate ?? "",
  delete: styles.badgeDelete ?? "",
  auth: styles.badgeAuth ?? "",
  restore: styles.badgeRestore ?? "",
  other: styles.badgeOther ?? "",
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

function isFiltersActive(f: FiltersState): boolean {
  return (
    Boolean(f.searchApplied) ||
    Boolean(f.action) ||
    Boolean(f.userId) ||
    Boolean(f.from) ||
    Boolean(f.to)
  );
}

export function AuditLogPage() {
  // ===== URL sync =====
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<FiltersState>(() => {
    const initial: FiltersState = { ...INITIAL_FILTERS };
    const action = searchParams.get("action");
    if (action && (AUDIT_ACTIONS as readonly string[]).includes(action)) {
      initial.action = action as AuditAction;
    }
    const userId = searchParams.get("userId");
    if (userId) initial.userId = Number(userId) || "";
    const from = searchParams.get("from");
    if (from) initial.from = from;
    const to = searchParams.get("to");
    if (to) initial.to = to;
    const search = searchParams.get("search");
    if (search) {
      initial.search = search;
      initial.searchApplied = search;
    }
    const page = Number(searchParams.get("page") ?? "1");
    if (page > 1) initial.page = page;
    return initial;
  });

  useEffect(() => {
    const next: Record<string, string> = {};
    if (filters.searchApplied) next.search = filters.searchApplied;
    if (filters.action) next.action = filters.action;
    if (filters.userId !== "") next.userId = String(filters.userId);
    if (filters.from) next.from = filters.from;
    if (filters.to) next.to = filters.to;
    if (filters.page > 1) next.page = String(filters.page);
    setSearchParams(next, { replace: true });
  }, [
    filters.searchApplied,
    filters.action,
    filters.userId,
    filters.from,
    filters.to,
    filters.page,
    setSearchParams,
  ]);

  // ===== Data state =====
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ===== Users dropdown =====
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // ===== Detail modal =====
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  // ===== Filter actions =====
  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await listAuditLogs({
        userId: typeof filters.userId === "number" ? filters.userId : undefined,
        action: filters.action || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        search: filters.searchApplied || undefined,
        page: filters.page,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được danh sách nhật ký";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [filters.userId, filters.action, filters.from, filters.to, filters.searchApplied, filters.page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Load users once for dropdown.
  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      setUsersLoading(true);
      try {
        // Lấy nhiều nhất có thể — listUsers hiện trả về tất cả users.
        const result = await listUsers({});
        if (cancelled) return;
        const list = Array.isArray(result.users) ? result.users : [];
        // Loại bỏ user đã xoá mềm.
        const active = list.filter((u) => !u.deletedAt);
        // Sort theo tên để dropdown dễ tra cứu.
        active.sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
        setUsers(active);
      } catch {
        // Không block UI nếu user list fail — chỉ disable dropdown user filter.
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    }
    loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

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
    }, 450);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [filters.search]);

  // ===== Handlers =====
  function handleSearchInput(e: ChangeEvent<HTMLInputElement>) {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  }
  function clearSearch() {
    setFilters((prev) => ({ ...prev, search: "", searchApplied: "", page: 1 }));
  }
  function handleActionChange(e: ChangeEvent<HTMLSelectElement>) {
    setFilters((prev) => ({
      ...prev,
      action: e.target.value as "" | AuditAction,
      page: 1,
    }));
  }
  function handleUserChange(e: ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setFilters((prev) => ({
      ...prev,
      userId: val ? Number(val) : "",
      page: 1,
    }));
  }
  function handleFromChange(e: ChangeEvent<HTMLInputElement>) {
    setFilters((prev) => ({ ...prev, from: e.target.value, page: 1 }));
  }
  function handleToChange(e: ChangeEvent<HTMLInputElement>) {
    setFilters((prev) => ({ ...prev, to: e.target.value, page: 1 }));
  }
  function clearAllFilters() {
    setFilters({ ...INITIAL_FILTERS });
  }
  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function openDetail(log: AuditLog) {
    setDetailLog(log);
    setDetailOpen(true);
  }

  // ===== Columns =====
  const columns: TableColumn<AuditLog>[] = useMemo(
    () => [
      {
        key: "actor",
        header: "Người thực hiện",
        render: (log) => {
          const actor = log.user;
          const initials = actor
            ? actor.fullName
                .trim()
                .split(/\s+/)
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()
            : "?";
          return (
            <div className={styles.actorCell}>
              <span className={styles.avatar}>{initials}</span>
              <div className={styles.actorInfo}>
                <span className={styles.actorName}>
                  {actor?.fullName ?? "Không xác định"}
                </span>
                <span className={styles.actorEmail}>
                  {actor?.email ?? `ID: ${log.userId ?? "—"}`}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: "action",
        header: "Hành động",
        render: (log) => {
          const group =
            AUDIT_ACTION_GROUPS[log.action as AuditAction] ?? "other";
          const label =
            AUDIT_ACTION_LABELS[log.action as AuditAction] ?? log.action;
          return (
            <div className={styles.actionCell}>
              <span className={[styles.badge, GROUP_CLASS[group]].join(" ")}>
                {AUDIT_GROUP_LABELS[group]}
              </span>
              <span className={styles.actionLabel}>{label}</span>
            </div>
          );
        },
      },
      {
        key: "target",
        header: "Đối tượng",
        render: (log) => (
          <span className={styles.targetCell}>
            {log.target ?? <span className={styles.dim}>—</span>}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Thời gian",
        render: (log) => (
          <span className={styles.timeCell}>{formatDateTime(log.createdAt)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (log) => (
          <button
            type="button"
            className={styles.viewBtn}
            onClick={() => openDetail(log)}
          >
            Xem chi tiết
          </button>
        ),
      },
    ],
    []
  );

  const filtered = isFiltersActive(filters);

  const emptyState = (
    <div className={styles.emptyState}>
      <ScrollText size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        {filtered
          ? "Không tìm thấy nhật ký phù hợp bộ lọc"
          : "Chưa có nhật ký nào"}
      </p>
      <p className={styles.emptyHint}>
        {filtered
          ? "Thử bỏ bớt bộ lọc hoặc thay đổi từ khoá tìm kiếm."
          : "Nhật ký sẽ xuất hiện khi có hoạt động đầu tiên trên hệ thống."}
      </p>
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Nhật ký hệ thống</h1>
          <p className={styles.subtitle}>
            Theo dõi mọi hành động nhạy cảm của người dùng và hệ thống.
          </p>
        </div>
      </header>

      <div className={styles.tableCard}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Input
              placeholder="Tìm theo tên, email, mô tả đối tượng..."
              value={filters.search}
              onChange={handleSearchInput}
              leftIcon={<Search size={16} />}
              rightIcon={filters.search ? <XIcon size={14} /> : undefined}
              onRightIconClick={filters.search ? clearSearch : undefined}
            />
          </div>

          <label className={styles.filterLabel}>
            <span>Hành động</span>
            <select
              className={styles.select}
              value={filters.action}
              onChange={handleActionChange}
            >
              <option value="">Tất cả</option>
              {AUDIT_ACTIONS.map((act) => (
                <option key={act} value={act}>
                  {AUDIT_ACTION_LABELS[act]}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filterLabel}>
            <span>Người thực hiện</span>
            <select
              className={styles.select}
              value={filters.userId === "" ? "" : String(filters.userId)}
              onChange={handleUserChange}
              disabled={usersLoading}
            >
              <option value="">Tất cả</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filterLabel}>
            <span>Từ ngày</span>
            <input
              type="date"
              className={styles.dateInput}
              value={filters.from}
              onChange={handleFromChange}
              max={filters.to || undefined}
            />
          </label>

          <label className={styles.filterLabel}>
            <span>Đến ngày</span>
            <input
              type="date"
              className={styles.dateInput}
              value={filters.to}
              onChange={handleToChange}
              min={filters.from || undefined}
            />
          </label>

          {filtered ? (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Xoá bộ lọc
            </Button>
          ) : null}
        </div>

        {/* Error */}
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
              rowKey={(log) => log.id}
              emptyState={emptyState}
            />

            {!loading && items.length > 0 ? (
              <div className={styles.tableFooter}>
                <span className={styles.totalLabel}>
                  Hiển thị <b>{items.length}</b> / <b>{total}</b> bản ghi
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

      <AuditLogDetailModal
        open={detailOpen}
        log={detailLog}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}