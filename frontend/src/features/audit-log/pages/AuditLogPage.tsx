/**
 * AuditLogPage — Audit Center.
 *
 * Tính năng:
 *   - Chỉ Table view (ẩn Timeline view theo quyết định audit 2026-08)
 *   - Filter nâng cao (search/user/action/module/date) — sync URL
 *   - AuditActionBadge tone-based (CSS token theo DESIGN.md)
 *   - AuditLogDetailModal với Before/After + Copy JSON + Quick Link
 *   - Export CSV (client-side, page hiện tại) — RFC 4180 + UTF-8 BOM
 *   - Loading skeleton / Empty state / Error Alert + nút Thử lại
 *   - Responsive desktop + mobile
 *
 * Ẩn UI theo audit 2026-08:
 *   - Timeline view: ẩn, AuditTimeline component vẫn còn trong codebase
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Button,
  Card,
  Pagination,
  Table,
  type TableColumn,
} from "../../../shared/components/ui";
import { AuditLogDetailModal } from "../components/AuditLogDetailModal";
import { AuditFilter, EMPTY_AUDIT_FILTERS } from "../components/AuditFilter";
import { AuditActionBadge } from "../components/AuditActionBadge";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTIONS,
  AUDIT_MODULE_LABELS,
  AUDIT_MODULES,
  exportAuditLogsCsv,
  listAuditLogs,
  type AuditAction,
  type AuditLog,
  type AuditModule,
} from "../services/auditLogApi";
import { ApiError } from "../../../shared/api";
import { useToast } from "../../../shared/contexts/ToastContext";
import { listUsers, type User } from "../../users";
import {
  Download,
  ScrollText,
  Search as SearchIcon,
  SlidersHorizontal,
  X as XIcon,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import styles from "./AuditLogPage.module.css";

// ===== Filter state =====
interface FiltersState {
  search: string;
  searchApplied: string;
  action: "" | AuditAction;
  userId: "" | number;
  module: "" | AuditModule;
  from: string;
  to: string;
  page: number;
}

const INITIAL_FILTERS: FiltersState = {
  search: "",
  searchApplied: "",
  action: "",
  userId: "",
  module: "",
  from: "",
  to: "",
  page: 1,
};

function isFiltersActive(f: FiltersState): boolean {
  return (
    Boolean(f.searchApplied) ||
    Boolean(f.action) ||
    Boolean(f.userId) ||
    Boolean(f.module) ||
    Boolean(f.from) ||
    Boolean(f.to)
  );
}

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

export function AuditLogPage() {
  useEffect(() => {
    document.title = "Nhật ký hệ thống — Zhong Ruan LMS";
  }, []);

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
    const module = searchParams.get("module");
    if (module && (AUDIT_MODULES as readonly string[]).includes(module)) {
      initial.module = module as AuditModule;
    }
    const search = searchParams.get("search");
    if (search) {
      initial.search = search;
      initial.searchApplied = search;
    }
    const page = Number(searchParams.get("page") ?? "1");
    if (page > 1) initial.page = page;
    return initial;
  });

  // Filter state → URL sync
  useEffect(() => {
    const next: Record<string, string> = {};
    if (filters.searchApplied) next.search = filters.searchApplied;
    if (filters.action) next.action = filters.action;
    if (filters.userId !== "") next.userId = String(filters.userId);
    if (filters.module) next.module = filters.module;
    if (filters.from) next.from = filters.from;
    if (filters.to) next.to = filters.to;
    if (filters.page > 1) next.page = String(filters.page);
    setSearchParams(next, { replace: true });
  }, [
    filters.searchApplied,
    filters.action,
    filters.userId,
    filters.module,
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

  // ===== Toast =====
  const toast = useToast();

  // ===== Filter actions =====
  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await listAuditLogs({
        userId: typeof filters.userId === "number" ? filters.userId : undefined,
        action: filters.action || undefined,
        module: filters.module || undefined,
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
  }, [filters.userId, filters.action, filters.module, filters.from, filters.to, filters.searchApplied, filters.page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Load users once for dropdown.
  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      setUsersLoading(true);
      try {
        const result = await listUsers({});
        if (cancelled) return;
        const list = Array.isArray(result.users) ? result.users : [];
        const active = list.filter((u) => !u.deletedAt);
        active.sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
        setUsers(active);
      } catch {
        // Không block UI nếu user list fail.
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
  function clearSearch() {
    setFilters((prev) => ({ ...prev, search: "", searchApplied: "", page: 1 }));
  }
  function handleFilterChange(next: typeof EMPTY_AUDIT_FILTERS) {
    // Normalize userId: AuditFilter dùng string|number (vì dropdown dùng id gốc từ User),
    // còn FiltersState chỉ chấp nhận number|"". Ép về number, fallback "" nếu rỗng/không phải số.
    const rawUser = next.userId;
    let normalizedUser: number | "" = "";
    if (typeof rawUser === "number" && Number.isFinite(rawUser)) {
      normalizedUser = rawUser;
    } else if (typeof rawUser === "string" && rawUser !== "") {
      const n = Number(rawUser);
      if (Number.isFinite(n)) normalizedUser = n;
    }
    setFilters((prev) => ({
      ...prev,
      search: next.search,
      action: next.action,
      userId: normalizedUser,
      module: next.module,
      from: next.from,
      to: next.to,
      page: 1,
    }));
  }
  function clearAllFilters() {
    setFilters((prev) => ({
      ...prev,
      search: "",
      searchApplied: "",
      action: "",
      userId: "",
      module: "",
      from: "",
      to: "",
      page: 1,
    }));
  }
  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }
  function openDetail(log: AuditLog) {
    setDetailLog(log);
    setDetailOpen(true);
  }

  function handleExportCsv() {
    if (items.length === 0) {
      toast.error("Không có dữ liệu để xuất");
      return;
    }
    try {
      exportAuditLogsCsv(items);
      toast.success(`Đã xuất ${items.length} bản ghi ra CSV`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Xuất CSV thất bại";
      toast.error(message);
    }
  }

  // ===== User options cho AuditFilter =====
  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
      })),
    [users]
  );

  // ===== Table columns =====
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
        render: (log) => (
          <div className={styles.actionCell}>
            <AuditActionBadge action={log.action} />
            <span className={styles.actionLabel}>
              {AUDIT_ACTION_LABELS[log.action as AuditAction] ?? log.action}
            </span>
          </div>
        ),
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
      {filtered ? (
        <Button variant="secondary" size="sm" onClick={clearAllFilters}>
          Xoá bộ lọc
        </Button>
      ) : null}
    </div>
  );

  // Lấy phần filters thuần (không có search riêng — AuditFilter quản lý search).
  const filterValues = useMemo(
    () => ({
      search: filters.search,
      action: filters.action,
      userId: filters.userId,
      module: filters.module,
      from: filters.from,
      to: filters.to,
    }),
    [filters.search, filters.action, filters.userId, filters.module, filters.from, filters.to]
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Audit Center</h1>
          <p className={styles.subtitle}>
            Theo dõi mọi hành động nhạy cảm của người dùng và hệ thống.
          </p>
        </div>

        {/* ===== Toolbar: export + clear filters ===== */}
        <div className={styles.headerActions}>
          <div className={styles.exportMenu}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={handleExportCsv}
              disabled={loading || items.length === 0}
              title="Xuất CSV theo trang hiện tại"
            >
              Xuất CSV
            </Button>
          </div>
        </div>
      </header>

      <Card padding="md" className={styles.tableCard}>
        <AuditFilter
          values={filterValues}
          onChange={handleFilterChange}
          users={userOptions}
          usersLoading={usersLoading}
          onSearchChange={(v) => setFilters((prev) => ({ ...prev, search: v }))}
          onClearSearch={clearSearch}
        />

        {/* Active filter chips (UX helper) */}
        {filtered ? (
          <div className={styles.activeFilters}>
            <span className={styles.activeFiltersLabel}>
              <SlidersHorizontal size={14} aria-hidden="true" />
              Đang lọc:
            </span>
            {filters.searchApplied ? (
              <span className={styles.chip}>
                <SearchIcon size={12} aria-hidden="true" />
                &ldquo;{filters.searchApplied}&rdquo;
                <button
                  type="button"
                  aria-label="Bỏ từ khoá"
                  onClick={clearSearch}
                  className={styles.chipClose}
                >
                  <XIcon size={12} />
                </button>
              </span>
            ) : null}
            {filters.action ? (
              <span className={styles.chip}>
                <span>Hành động: {AUDIT_ACTION_LABELS[filters.action] ?? filters.action}</span>
                <button
                  type="button"
                  aria-label="Bỏ action filter"
                  onClick={() => setFilters((p) => ({ ...p, action: "", page: 1 }))}
                  className={styles.chipClose}
                >
                  <XIcon size={12} />
                </button>
              </span>
            ) : null}
            {filters.userId !== "" ? (
              <span className={styles.chip}>
                <span>
                  User: {users.find((u) => u.id === filters.userId)?.fullName ?? `#${filters.userId}`}
                </span>
                <button
                  type="button"
                  aria-label="Bỏ user filter"
                  onClick={() => setFilters((p) => ({ ...p, userId: "", page: 1 }))}
                  className={styles.chipClose}
                >
                  <XIcon size={12} />
                </button>
              </span>
            ) : null}
            {filters.module ? (
              <span className={styles.chip}>
                <span>Module: {AUDIT_MODULE_LABELS[filters.module] ?? filters.module}</span>
                <button
                  type="button"
                  aria-label="Bỏ module filter"
                  onClick={() => setFilters((p) => ({ ...p, module: "", page: 1 }))}
                  className={styles.chipClose}
                >
                  <XIcon size={12} />
                </button>
              </span>
            ) : null}
            {(filters.from || filters.to) ? (
              <span className={styles.chip}>
                <span>
                  {filters.from || "—"} → {filters.to || "—"}
                </span>
                <button
                  type="button"
                  aria-label="Bỏ date filter"
                  onClick={() => setFilters((p) => ({ ...p, from: "", to: "", page: 1 }))}
                  className={styles.chipClose}
                >
                  <XIcon size={12} />
                </button>
              </span>
            ) : null}
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Xoá tất cả
            </Button>
          </div>
        ) : null}

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
            {/* Table view */}
            <Table
              columns={columns}
              data={items}
              loading={loading}
              skeletonRows={6}
              rowKey={(log) => log.id}
              emptyState={emptyState}
            />
          </>
        )}

        {/* Footer — pagination chung cho cả 2 view */}
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
      </Card>

      <AuditLogDetailModal
        open={detailOpen}
        log={detailLog}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}