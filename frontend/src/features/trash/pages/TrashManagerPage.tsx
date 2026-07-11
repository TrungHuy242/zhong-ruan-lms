/**
 * TrashManagerPage — trung tâm quản lý dữ liệu đã xoá (SaaS-style).
 *
 * Luồng tổng thể:
 *   ┌─────────────────────────┐
 *   │ KPI / Stats (TrashStats)│  ← 6 card (Tổng · Hôm nay · 7 ngày · ×4 module)
 *   ├─────────────────────────┤
 *   │ Filter (TrashFilter)    │  ← 4 trục (Module · Người xoá · Khoảng TG · Keyword)
 *   │   Active filter chips   │  ← UX helper hiển thị filter đang áp dụng
 *   │   Bulk action bar       │  ← Khi ≥1 row được chọn
 *   ├─────────────────────────┤
 *   │ Table (shared Table)    │  ← Danh sách + select-all + skeleton
 *   │   Pagination (shared)   │
 *   └─────────────────────────┘
 *
 * State tổ chức:
 *   - `filters` (FiltersState): 1 state lưu tất cả filter cố định + searchApplied + page.
 *   - `keyword` (raw) tách riêng để input controlled + debounce 450ms → `filters.searchApplied`.
 *
 * Đồng bộ URL (useSearchParams):
 *   - Tất cả filter + page đều sync URL.
 *   - URL là single source of truth khi user back/forward.
 *
 * Bulk action (xác nhận bằng ConfirmDialog):
 *   - Bulk Restore: confirmVariant=primary.
 *   - Bulk Force Delete: confirmVariant=danger (luôn có dòng cảnh báo).
 *
 * TrashDetailModal hiển thị khi click action "Xem chi tiết" → lazy fetch detail
 * (snapshot đầy đủ) qua getTrashDetail().
 *
 * Loading / Empty / Error:
 *   - Loading: Table dùng skeletonRows (Table đã tích hợp skeleton inline).
 *   - Empty (filtered): gợi ý "Xoá bộ lọc".
 *   - Empty (no data at all): CTA giải thích khi nào thùng rác có data.
 *   - Error: Alert + nút Thử lại (gọi lại loadList).
 *
 * Audit log:
 *   - BE tự ghi cho Restore / Force Delete / Bulk Restore / Bulk Force Delete.
 *   - FE không cần làm gì ngoài gọi API.
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
  ConfirmDialog,
  Pagination,
  Table,
  type TableColumn,
} from "../../../shared/components/ui";
import { ApiError } from "../../../shared/api";
import {
  TRASH_MODULES,
  TRASH_MODULE_LABELS,
  TRASH_PAGE_SIZE_DEFAULT,
  bulkForceDelete,
  bulkRestore,
  forceDeleteItem,
  getTrashStats,
  listTrashV2,
  restoreItem,
  type BulkTrashItem,
  type ListTrashV2Params,
  type TrashItemV2,
  type TrashModule,
  type TrashStats as TrashStatsData,
} from "../services/trashApi";
import { TrashFilter, EMPTY_TRASH_FILTERS } from "../components/TrashFilter";
import { TrashStats } from "../components/TrashStats";
import { TrashDetailModal } from "../components/TrashDetailModal";
import type { UserOption } from "../components/UserOption";
import { listUsers, type User } from "../../users";
import { authStorage } from "../../../shared/storage/authStorage";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckSquare,
  Eye,
  FileText,
  Filter as FilterIcon,
  Inbox,
  RotateCcw,
  Search as SearchIcon,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Square,
  Trash2,
  User as UserIcon,
  X as XIcon,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import styles from "./TrashManagerPage.module.css";

// ===== Helpers =====
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

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giảng viên",
  STUDENT: "Học viên",
};

const MODULE_TONE: Record<TrashModule, string> = {
  users: "badgeUser",
  notifications: "badgeNotification",
  files: "badgeFile",
  settings: "badgeSetting",
};

const MODULE_ICON: Record<TrashModule, React.ReactNode> = {
  users: <UserIcon size={14} aria-hidden="true" />,
  notifications: <Bell size={14} aria-hidden="true" />,
  files: <FileText size={14} aria-hidden="true" />,
  settings: <SettingsIcon size={14} aria-hidden="true" />,
};

const DEBOUNCE_MS = 450;

// ===== Filters (single source of truth, sync URL) =====
interface FiltersState {
  search: string;
  searchApplied: string;
  module: TrashModule | "all";
  deletedById: "" | number;
  from: string;
  to: string;
  page: number;
}

const INITIAL_FILTERS: FiltersState = {
  search: "",
  searchApplied: "",
  module: "all",
  deletedById: "",
  from: "",
  to: "",
  page: 1,
};

function isFiltersActive(f: FiltersState): boolean {
  return (
    Boolean(f.searchApplied) ||
    f.module !== "all" ||
    f.deletedById !== "" ||
    Boolean(f.from) ||
    Boolean(f.to)
  );
}

// ===== Component =====
type ConfirmKind = "single-restore" | "single-force" | "bulk-restore" | "bulk-force" | null;

export function TrashManagerPage() {
  const currentUser = authStorage.getUser();
  const isAdmin = currentUser?.role === "ADMIN";

  // ===== URL sync =====
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<FiltersState>(() => {
    const initial: FiltersState = { ...INITIAL_FILTERS };
    const module = searchParams.get("module");
    if (module && [...TRASH_MODULES, "all"].includes(module)) {
      initial.module = module as TrashModule | "all";
    }
    const deletedById = searchParams.get("deletedById");
    if (deletedById) initial.deletedById = Number(deletedById) || "";
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
    if (filters.module !== "all") next.module = filters.module;
    if (filters.deletedById !== "") next.deletedById = String(filters.deletedById);
    if (filters.from) next.from = filters.from;
    if (filters.to) next.to = filters.to;
    if (filters.page > 1) next.page = String(filters.page);
    setSearchParams(next, { replace: true });
  }, [
    filters.searchApplied,
    filters.module,
    filters.deletedById,
    filters.from,
    filters.to,
    filters.page,
    setSearchParams,
  ]);

  // ===== Data state =====
  const [items, setItems] = useState<TrashItemV2[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ===== Stats =====
  const [stats, setStats] = useState<TrashStatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ===== Users dropdown =====
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // ===== Selection =====
  const [selected, setSelected] = useState<Set<string>>(new Set()); // key = `${module}:${idOrKey}`

  // ===== Action state =====
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [singleTarget, setSingleTarget] = useState<TrashItemV2 | null>(null);
  const [detailItem, setDetailItem] = useState<TrashItemV2 | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [filters.search]);

  // Auto-clear banner after 4s.
  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 4000);
    return () => window.clearTimeout(t);
  }, [banner]);

  // ===== Load list =====
  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: ListTrashV2Params = {
        module: filters.module === "all" ? null : filters.module,
        keyword: filters.searchApplied || null,
        deletedById: filters.deletedById === "" ? null : filters.deletedById,
        from: filters.from ? `${filters.from}T00:00:00.000Z` : null,
        to: filters.to ? `${filters.to}T23:59:59.999Z` : null,
        page: filters.page,
        limit: TRASH_PAGE_SIZE_DEFAULT,
      };
      const result = await listTrashV2(params);
      setItems(result.items);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được thùng rác";
      setLoadError(message);
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [
    filters.module,
    filters.searchApplied,
    filters.deletedById,
    filters.from,
    filters.to,
    filters.page,
  ]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  // ===== Load stats (1 lần + refresh sau mỗi action) =====
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const result = await getTrashStats();
      setStats(result);
    } catch {
      // Stats lỗi → fallback null (page vẫn hoạt động được).
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // ===== Load users cho dropdown =====
  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      setUsersLoading(true);
      try {
        const result = await listUsers({});
        if (cancelled) return;
        const list = Array.isArray(result.users) ? result.users : [];
        // Chỉ lấy user CHƯA bị xoá mềm.
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

  // Reset selection khi filter/page đổi.
  useEffect(() => {
    setSelected(new Set());
  }, [
    items.length,
    filters.module,
    filters.searchApplied,
    filters.deletedById,
    filters.from,
    filters.to,
    filters.page,
  ]);

  // ===== Handlers =====
  function errorMessage(err: unknown, fallback: string): string {
    if (err instanceof ApiError) return err.message;
    if (err instanceof Error) return err.message;
    return fallback;
  }

  function rowKey(it: TrashItemV2): string {
    return `${it.module}:${it.key ?? it.id}`;
  }

  function toggleRow(it: TrashItemV2) {
    const k = rowKey(it);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(rowKey)));
    }
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function handleSearchChange(raw: string) {
    setFilters((prev) => ({ ...prev, search: raw }));
  }

  function clearSearch() {
    setFilters((prev) => ({ ...prev, search: "", searchApplied: "", page: 1 }));
  }

  function handleFilterChange(next: typeof EMPTY_TRASH_FILTERS) {
    setFilters((prev) => ({
      ...prev,
      search: next.keyword,
      module: next.module,
      deletedById: next.deletedById === "" ? "" : Number(next.deletedById) || "",
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
      module: "all",
      deletedById: "",
      from: "",
      to: "",
      page: 1,
    }));
  }

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  // ===== Action handlers =====
  function askSingleRestore(it: TrashItemV2) {
    setSingleTarget(it);
    setActionError(null);
    setConfirmKind("single-restore");
  }
  function askSingleForce(it: TrashItemV2) {
    setSingleTarget(it);
    setActionError(null);
    setConfirmKind("single-force");
  }
  function askBulkRestore() {
    if (selected.size === 0) return;
    setActionError(null);
    setConfirmKind("bulk-restore");
  }
  function askBulkForce() {
    if (selected.size === 0) return;
    setActionError(null);
    setConfirmKind("bulk-force");
  }
  function openDetail(it: TrashItemV2) {
    setDetailItem(it);
    setDetailOpen(true);
  }
  function closeConfirm() {
    if (actionLoading) return;
    setConfirmKind(null);
    setSingleTarget(null);
    setActionError(null);
  }

  function buildBulkItems(): BulkTrashItem[] {
    const list: BulkTrashItem[] = [];
    for (const it of items) {
      const k = rowKey(it);
      if (!selected.has(k)) continue;
      if (it.module === "settings") {
        list.push({ module: "settings", key: it.key ?? String(it.id) });
      } else {
        list.push({ module: it.module, id: it.id });
      }
    }
    return list;
  }

  async function doSingleRestore() {
    if (!singleTarget) return;
    const it = singleTarget;
    setActionLoading(true);
    setActionError(null);
    try {
      const lookup = it.module === "settings" ? (it.key ?? String(it.id)) : it.id;
      await restoreItem(it.module, lookup);
      setBanner({ type: "success", text: `Khôi phục "${it.label}" thành công` });
      closeConfirm();
      clearSelection();
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      setActionError(errorMessage(err, "Không thể khôi phục"));
    } finally {
      setActionLoading(false);
    }
  }

  async function doSingleForceDelete() {
    if (!singleTarget) return;
    const it = singleTarget;
    setActionLoading(true);
    setActionError(null);
    try {
      const lookup = it.module === "settings" ? (it.key ?? String(it.id)) : it.id;
      await forceDeleteItem(it.module, lookup);
      setBanner({ type: "success", text: `Đã xoá vĩnh viễn "${it.label}"` });
      closeConfirm();
      clearSelection();
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      setActionError(errorMessage(err, "Không thể xoá vĩnh viễn"));
    } finally {
      setActionLoading(false);
    }
  }

  async function doBulkRestore() {
    const items = buildBulkItems();
    if (items.length === 0) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await bulkRestore(items);
      const failedDetail = (result.results ?? []).filter((r) => !r.ok);
      if (result.failed === 0) {
        setBanner({
          type: "success",
          text: `Khôi phục hàng loạt thành công ${result.success}/${result.total} bản ghi`,
        });
      } else {
        setBanner({
          type: "success",
          text: `Khôi phục hàng loạt: ${result.success} thành công, ${result.failed} thất bại`,
        });
        setActionError(
          failedDetail.length > 0
            ? failedDetail.map((r) => `${r.module}:${r.key ?? r.id} — ${r.error}`).join("\n")
            : null
        );
      }
      closeConfirm();
      clearSelection();
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      setActionError(errorMessage(err, "Không thể khôi phục hàng loạt"));
    } finally {
      setActionLoading(false);
    }
  }

  async function doBulkForceDelete() {
    const items = buildBulkItems();
    if (items.length === 0) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await bulkForceDelete(items);
      const failedDetail = (result.results ?? []).filter((r) => !r.ok);
      if (result.failed === 0) {
        setBanner({
          type: "success",
          text: `Đã xoá vĩnh viễn ${result.success}/${result.total} bản ghi`,
        });
      } else {
        setBanner({
          type: "success",
          text: `Xoá vĩnh viễn hàng loạt: ${result.success} thành công, ${result.failed} thất bại`,
        });
        setActionError(
          failedDetail.length > 0
            ? failedDetail.map((r) => `${r.module}:${r.key ?? r.id} — ${r.error}`).join("\n")
            : null
        );
      }
      closeConfirm();
      clearSelection();
      await Promise.all([loadList(), loadStats()]);
    } catch (err) {
      setActionError(errorMessage(err, "Không thể xoá hàng loạt"));
    } finally {
      setActionLoading(false);
    }
  }

  // ===== Derived =====
  const userOptions = useMemo<UserOption[]>(
    () => users.map((u) => ({ id: u.id, fullName: u.fullName, email: u.email })),
    [users]
  );

  // Module user fullName từ dropdown (để hiển thị chip filter).
  const selectedUser = useMemo(
    () => users.find((u) => u.id === filters.deletedById),
    [users, filters.deletedById]
  );

  // Lấy phần filter cố định (không search) để truyền xuống TrashFilter.
  const filterValues = useMemo(
    () => ({
      keyword: filters.search,
      module: filters.module,
      deletedById: filters.deletedById,
      from: filters.from,
      to: filters.to,
    }),
    [filters.search, filters.module, filters.deletedById, filters.from, filters.to]
  );

  const filtered = isFiltersActive(filters);
  const showEmpty = !loading && !loadError && items.length === 0;

  // ===== Columns =====
  const columns: TableColumn<TrashItemV2>[] = useMemo(
    () => [
      {
        key: "select",
        header: (
          <button
            type="button"
            className={styles.checkboxBtn}
            onClick={toggleAll}
            aria-label={
              items.length > 0 && selected.size === items.length
                ? "Bỏ chọn tất cả"
                : "Chọn tất cả"
            }
          >
            {items.length > 0 && selected.size === items.length ? (
              <CheckSquare size={16} aria-hidden="true" />
            ) : (
              <Square size={16} aria-hidden="true" />
            )}
          </button>
        ),
        render: (it) => {
          const k = rowKey(it);
          const checked = selected.has(k);
          return (
            <button
              type="button"
              className={styles.checkboxBtn}
              onClick={() => toggleRow(it)}
              aria-label={checked ? `Bỏ chọn ${it.label}` : `Chọn ${it.label}`}
            >
              {checked ? (
                <CheckSquare size={16} aria-hidden="true" />
              ) : (
                <Square size={16} aria-hidden="true" />
              )}
            </button>
          );
        },
      },
      {
        key: "module",
        header: "Module",
        render: (it) => (
          <span className={[styles.badge, styles[MODULE_TONE[it.module]]].join(" ")}>
            {MODULE_ICON[it.module]}
            {TRASH_MODULE_LABELS[it.module]}
          </span>
        ),
      },
      {
        key: "label",
        header: "Đối tượng",
        render: (it) => (
          <div className={styles.nameCell}>
            <span className={styles.name}>{it.label}</span>
            {it.module === "settings" ? (
              <span className={styles.description}>key: {it.key}</span>
            ) : (
              <span className={styles.description}>
                #{it.id}
                {it.createdAt ? ` · tạo ${formatDateTime(it.createdAt)}` : ""}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "deletedBy",
        header: "Người xoá",
        render: (it) => {
          if (!it.deletedBy) {
            return <span className={styles.dim}>—</span>;
          }
          return (
            <div className={styles.actorCell}>
              <span className={styles.actorName}>{it.deletedBy.fullName}</span>
              <span className={styles.actorEmail}>
                {ROLE_LABEL[it.deletedBy.role] ?? it.deletedBy.role} · #{it.deletedBy.id}
              </span>
            </div>
          );
        },
      },
      {
        key: "deletedAt",
        header: "Thời gian xoá",
        render: (it) => (
          <span className={styles.cellText}>{formatDateTime(it.deletedAt)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (it) => (
          <div className={styles.actionCell}>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Eye size={14} aria-hidden="true" />}
              onClick={() => openDetail(it)}
              title="Xem chi tiết"
            >
              Chi tiết
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw size={14} aria-hidden="true" />}
              onClick={() => askSingleRestore(it)}
            >
              Khôi phục
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={14} aria-hidden="true" />}
              onClick={() => askSingleForce(it)}
            >
              Xoá cứng
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, selected]
  );

  // ===== Empty state =====
  const emptyInitial = (
    <div className={styles.emptyState}>
      <Inbox size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>Thùng rác đang trống</p>
      <p className={styles.emptyHint}>
        Khi người dùng, thông báo, tệp hoặc cấu hình bị xoá mềm, chúng sẽ xuất hiện
        ở đây để bạn khôi phục hoặc xoá vĩnh viễn. Mỗi hành động đều được ghi Audit Log.
      </p>
    </div>
  );
  const emptyFiltered = (
    <div className={styles.emptyState}>
      <Inbox size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        Không có bản ghi trong thùng rác
        {filters.searchApplied ? ` khớp với "${filters.searchApplied}"` : ""}
      </p>
      <p className={styles.emptyHint}>
        Thử bỏ bộ lọc, đổi module, khoảng thời gian hoặc xoá từ khoá.
      </p>
      <Button variant="secondary" size="sm" onClick={clearAllFilters}>
        Xoá bộ lọc
      </Button>
    </div>
  );

  // ===== Confirm content =====
  const restoreConfirm = singleTarget ? (
    <>
      Khôi phục <b>{singleTarget.label}</b> ({TRASH_MODULE_LABELS[singleTarget.module]})?
      Bản ghi sẽ xuất hiện lại trong danh sách tương ứng.
    </>
  ) : null;
  const forceConfirm = singleTarget ? (
    <>
      <span className={styles.dangerLine}>
        <AlertTriangle size={16} aria-hidden="true" />
        Hành động này KHÔNG thể hoàn tác.
      </span>
      Bạn sắp xoá vĩnh viễn <b>{singleTarget.label}</b> (
      {TRASH_MODULE_LABELS[singleTarget.module]}) khỏi hệ thống.
    </>
  ) : null;

  const bulkRestoreConfirm = (
    <>
      Khôi phục <b>{selected.size}</b> bản ghi đã chọn? Các bản ghi sẽ xuất hiện lại
      trong danh sách tương ứng. Hành động này được ghi Audit Log.
    </>
  );
  const bulkForceConfirm = (
    <>
      <span className={styles.dangerLine}>
        <AlertTriangle size={16} aria-hidden="true" />
        Hành động này KHÔNG thể hoàn tác.
      </span>
      Bạn sắp xoá vĩnh viễn <b>{selected.size}</b> bản ghi đã chọn khỏi hệ thống.
    </>
  );

  // ===== Render =====
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Trash2 size={24} className={styles.titleIcon} aria-hidden="true" />
            Thùng rác hệ thống
          </h1>
          <p className={styles.subtitle}>
            Khôi phục hoặc xoá vĩnh viễn các bản ghi đã soft-delete trên toàn hệ thống.
            Hỗ trợ 4 module (Người dùng · Thông báo · Tệp · Cấu hình), filter theo
            người xoá / khoảng thời gian / từ khoá, và bulk action.
          </p>
        </div>
      </header>

      {!isAdmin ? (
        <Alert variant="warning">
          Bạn cần quyền Admin để truy cập Thùng rác hệ thống. Vui lòng liên hệ admin.
        </Alert>
      ) : null}

      {/* ===== KPI / Stats ===== */}
      <TrashStats data={stats} loading={statsLoading} />

      {/* ===== Banner (success / error) ===== */}
      {banner ? (
        <Alert
          variant={banner.type === "success" ? "success" : "error"}
          onClose={() => setBanner(null)}
        >
          {banner.text}
        </Alert>
      ) : null}

      <Card padding="md" className={styles.tableCard}>
        {/* ===== Filter row ===== */}
        <TrashFilter
          values={filterValues}
          onChange={handleFilterChange}
          users={userOptions}
          usersLoading={usersLoading}
          onSearchChange={handleSearchChange}
          onClearSearch={clearSearch}
        />

        {/* ===== Active filter chips ===== */}
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
            {filters.module !== "all" ? (
              <span className={styles.chip}>
                <FilterIcon size={12} aria-hidden="true" />
                <span>Module: {TRASH_MODULE_LABELS[filters.module]}</span>
                <button
                  type="button"
                  aria-label="Bỏ module filter"
                  onClick={() => setFilters((p) => ({ ...p, module: "all", page: 1 }))}
                  className={styles.chipClose}
                >
                  <XIcon size={12} />
                </button>
              </span>
            ) : null}
            {filters.deletedById !== "" ? (
              <span className={styles.chip}>
                <UserIcon size={12} aria-hidden="true" />
                <span>
                  Người xoá: {selectedUser?.fullName ?? `#${filters.deletedById}`}
                </span>
                <button
                  type="button"
                  aria-label="Bỏ người xoá filter"
                  onClick={() => setFilters((p) => ({ ...p, deletedById: "", page: 1 }))}
                  className={styles.chipClose}
                >
                  <XIcon size={12} />
                </button>
              </span>
            ) : null}
            {(filters.from || filters.to) ? (
              <span className={styles.chip}>
                <Calendar size={12} aria-hidden="true" />
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

        {/* ===== Bulk action bar ===== */}
        {selected.size > 0 ? (
          <div className={styles.bulkBar}>
            <span className={styles.bulkLabel}>
              Đã chọn <b>{selected.size}</b> bản ghi
            </span>
            <div className={styles.bulkActions}>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RotateCcw size={14} aria-hidden="true" />}
                onClick={askBulkRestore}
              >
                Khôi phục ({selected.size})
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={14} aria-hidden="true" />}
                onClick={askBulkForce}
              >
                Xoá cứng ({selected.size})
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Bỏ chọn
              </Button>
            </div>
          </div>
        ) : null}

        {/* ===== Error state ===== */}
        {loadError ? (
          <div className={styles.errorWrap}>
            <Alert variant="error">{loadError}</Alert>
            <Button variant="secondary" size="sm" onClick={() => void loadList()}>
              Thử lại
            </Button>
          </div>
        ) : showEmpty ? (
          <div className={styles.emptyWrap}>
            {filtered ? emptyFiltered : emptyInitial}
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={items}
              loading={loading}
              skeletonRows={6}
              rowKey={(it) => rowKey(it)}
              emptyState={null}
            />

            {total > 0 ? (
              <div className={styles.tableFooter}>
                <span className={styles.totalLabel}>
                  Hiển thị <b>{items.length}</b> / <b>{total}</b> bản ghi
                  {filtered ? " (đang lọc)" : ""}
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

      {/* ===== Confirm dialogs ===== */}
      <ConfirmDialog
        open={confirmKind === "single-restore" && singleTarget !== null}
        title="Khôi phục bản ghi"
        message={restoreConfirm}
        confirmText="Khôi phục"
        confirmVariant="primary"
        loading={actionLoading}
        onConfirm={() => void doSingleRestore()}
        onCancel={closeConfirm}
      />
      <ConfirmDialog
        open={confirmKind === "single-force" && singleTarget !== null}
        title="Xoá vĩnh viễn"
        message={forceConfirm}
        confirmText="Xoá cứng"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={() => void doSingleForceDelete()}
        onCancel={closeConfirm}
      />
      <ConfirmDialog
        open={confirmKind === "bulk-restore"}
        title={`Khôi phục ${selected.size} bản ghi`}
        message={bulkRestoreConfirm}
        confirmText={`Khôi phục (${selected.size})`}
        confirmVariant="primary"
        loading={actionLoading}
        onConfirm={() => void doBulkRestore()}
        onCancel={closeConfirm}
      />
      <ConfirmDialog
        open={confirmKind === "bulk-force"}
        title={`Xoá vĩnh viễn ${selected.size} bản ghi`}
        message={bulkForceConfirm}
        confirmText={`Xoá cứng (${selected.size})`}
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={() => void doBulkForceDelete()}
        onCancel={closeConfirm}
      />

      {/* ===== Detail modal ===== */}
      <TrashDetailModal
        open={detailOpen}
        item={detailItem}
        onClose={() => setDetailOpen(false)}
      />

      {/* ===== Floating action error ===== */}
      {actionError ? (
        <div className={styles.floatingError}>
          <Alert variant="error">
            <pre className={styles.errorPre}>{actionError}</pre>
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
