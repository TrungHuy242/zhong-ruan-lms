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
  Card,
  ConfirmDialog,
  Input,
  Pagination,
  Table,
  type SortConfig,
  type TableColumn,
} from "../../../shared/components/ui";
import { UserFormModal } from "../../../shared/components/modals/UserFormModal";
import { UserDetailModal } from "../components/UserDetailModal";
import {
  UserFilterPanel,
  type UserAdvancedFilterValues,
  EMPTY_ADVANCED_FILTERS,
} from "../components/UserFilterPanel";
import { BulkActionBar } from "../components/BulkActionBar";
import {
  USER_PAGE_SIZE,
  bulkDeleteUsers,
  bulkUpdateStatus,
  deleteUser,
  listUsers,
  restoreUser,
  type User,
  type UserRole,
  type UserStatus,
} from "../services/userApi";
import { ApiError } from "../../../shared/api";
import { authStorage } from "../../../shared/storage/authStorage";
import { isAdmin as checkIsAdmin } from "../../../shared/utils/auth";
import { useTableColumns } from "../../../shared/hooks/useTableColumns";
import {
  ChevronDown,
  Columns,
  Edit3,
  Eye,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  ToggleRight,
  Trash2,
  Users as UsersIcon,
  X as XIcon,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import styles from "./UserManagementPage.module.css";

type RoleFilter = "ALL" | UserRole;
type StatusFilter = "ALL" | UserStatus;

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giáo viên",
  STUDENT: "Học viên",
};

const ROLE_BADGE_VARIANT: Record<UserRole, "admin" | "teacher" | "student"> = {
  ADMIN: "admin",
  TEACHER: "teacher",
  STUDENT: "student",
};

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngừng hoạt động",
  SUSPENDED: "Bị đình chỉ",
};

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as UserStatus[]).map((v) => ({
  value: v,
  label: STATUS_LABELS[v],
}));

interface FilterState {
  /** Ô search chính (gửi qua param `keyword`). */
  search: string;
  /** Khi search debounced xong, mới dùng để gọi API. */
  searchApplied: string;
  /** Filter nâng cao — 4 field riêng (Tên/Email/Role/Status). */
  advanced: UserAdvancedFilterValues;
  page: number;
  /** Cột đang sort (controlled Table sortable). */
  sort: SortConfig;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  searchApplied: "",
  advanced: { ...EMPTY_ADVANCED_FILTERS },
  page: 1,
  sort: { key: "createdAt", order: "desc" },
};

const SORTABLE_USER_KEYS = ["fullName", "email", "role", "status", "createdAt"] as const;
type SortableUserKey = (typeof SORTABLE_USER_KEYS)[number];

function isSortableUserKey(k: string): k is SortableUserKey {
  return (SORTABLE_USER_KEYS as readonly string[]).includes(k);
}

// UI → BE mapping cho status (đảm bảo luôn gửi enum uppercase)
function statusToBE(s: StatusFilter): UserStatus | undefined {
  if (s === "ALL") return undefined;
  return s;
}

function isDeletedUser(u: User): boolean {
  return Boolean(u.deletedAt);
}

const COLUMNS_STORAGE_KEY = "zrlms_user_table_columns";
// Always-visible columns (không thể ẩn) — gồm checkbox (do Table render) + action
// + tên để luôn có anchor trong table.
const LOCKED_COLUMN_KEYS = ["fullName"] as const;
const AVAILABLE_COLUMN_KEYS = [
  "email",
  "phone",
  "role",
  "status",
  "createdAt",
] as const;

const COLUMN_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Số điện thoại",
  role: "Vai trò",
  status: "Trạng thái",
  createdAt: "Ngày tạo",
};

interface ConfirmState {
  open: boolean;
  loading: boolean;
  user: User | null;
  mode: "delete" | "restore";
}

/**
 * Bulk confirm state.
 * - mode='delete': xoá mềm nhiều user
 * - mode='status': đổi status nhiều user, kèm target status
 */
interface BulkConfirmState {
  open: boolean;
  loading: boolean;
  mode: "delete" | "status";
  status: UserStatus;
}

export function UserManagementPage() {
  // ===== Phân quyền (UI-level) =====
  const currentUser = authStorage.getUser();
  const canManage = checkIsAdmin(currentUser?.role);

  // ===== URL sync =====
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => {
    const initial: FilterState = {
      ...INITIAL_FILTERS,
      advanced: { ...EMPTY_ADVANCED_FILTERS },
    };
    const sp = searchParams.get("search");
    if (sp) {
      initial.search = sp;
      initial.searchApplied = sp;
    }
    const name = searchParams.get("name");
    if (name) initial.advanced.name = name;
    const email = searchParams.get("email");
    if (email) initial.advanced.email = email;
    const role = searchParams.get("role");
    if (role && (["ALL", "ADMIN", "TEACHER", "STUDENT"] as const).includes(role as RoleFilter)) {
      initial.advanced.role = role as RoleFilter;
    }
    const status = searchParams.get("status");
    if (status && (["ALL", "ACTIVE", "INACTIVE", "SUSPENDED"] as const).includes(status as StatusFilter)) {
      initial.advanced.status = status as StatusFilter;
    }
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");
    if (sortBy && isSortableUserKey(sortBy)) {
      initial.sort = {
        key: sortBy,
        order: sortOrder === "asc" ? "asc" : "desc",
      };
    }
    const page = Number(searchParams.get("page") ?? "1");
    if (page > 1) initial.page = page;
    return initial;
  });

  // Track xem filter panel đang mở hay đóng — panel được kiểm soát local
  // (không lưu URL), vì đây là UI state không ảnh hưởng dữ liệu tải về.
  const [filterOpen, setFilterOpen] = useState<boolean>(() => {
    const adv = searchParams;
    // Mở sẵn nếu URL có ít nhất 1 param advanced
    return Boolean(adv.get("name") || adv.get("email") || adv.get("role") || adv.get("status"));
  });

  // Đồng bộ URL mỗi khi filter thay đổi.
  // Khi panel đang mở → ưu tiên param advanced (name/email/role/status);
  // khi đóng → chỉ dùng `keyword` từ ô search chính.
  useEffect(() => {
    const next: Record<string, string> = {};
    if (filterOpen) {
      if (filters.advanced.name) next.name = filters.advanced.name;
      if (filters.advanced.email) next.email = filters.advanced.email;
      if (filters.advanced.role !== "ALL") next.role = filters.advanced.role;
      if (filters.advanced.status !== "ALL") next.status = filters.advanced.status;
      // Khi panel mở, KHÔNG ghi `search` vào URL (tránh conflict với advanced filter).
    } else {
      if (filters.searchApplied) next.search = filters.searchApplied;
    }
    if (filters.sort.key !== "createdAt" || filters.sort.order !== "desc") {
      next.sortBy = filters.sort.key;
      next.sortOrder = filters.sort.order;
    }
    if (filters.page > 1) next.page = String(filters.page);
    setSearchParams(next, { replace: true });
  }, [
    filterOpen,
    filters.searchApplied,
    filters.advanced.name,
    filters.advanced.email,
    filters.advanced.role,
    filters.advanced.status,
    filters.sort.key,
    filters.sort.order,
    filters.page,
    setSearchParams,
  ]);

  // ===== Data state =====
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: Parameters<typeof listUsers>[0] = {
        page: filters.page,
        limit: USER_PAGE_SIZE,
        sortBy: filters.sort.key as SortableUserKey,
        sortOrder: filters.sort.order,
      };
      if (filterOpen) {
        if (filters.advanced.name) params.name = filters.advanced.name;
        if (filters.advanced.email) params.email = filters.advanced.email;
        if (filters.advanced.role !== "ALL") params.role = filters.advanced.role;
        const st = statusToBE(filters.advanced.status);
        if (st) params.status = st;
      } else {
        if (filters.searchApplied) params.search = filters.searchApplied;
      }
      const result = await listUsers(params);
      setUsers(result.users);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được danh sách người dùng";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [
    filterOpen,
    filters.searchApplied,
    filters.advanced.name,
    filters.advanced.email,
    filters.advanced.role,
    filters.advanced.status,
    filters.sort.key,
    filters.sort.order,
    filters.page,
  ]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ===== Debounce search =====
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

  // ===== Search input =====
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

  // ===== Filter Panel =====
  function handleFilterPanelChange(next: UserAdvancedFilterValues) {
    setFilters((prev) => ({ ...prev, advanced: next, page: 1 }));
  }
  function clearAdvancedFilters() {
    setFilters((prev) => ({
      ...prev,
      advanced: { ...EMPTY_ADVANCED_FILTERS },
      page: 1,
    }));
  }
  function toggleFilterPanel() {
    setFilterOpen((v) => !v);
  }

  // ===== Sort (controlled Table) =====
  function handleSortChange(next: SortConfig) {
    setFilters((prev) => ({ ...prev, sort: next, page: 1 }));
  }

  // ===== Columns visibility (localStorage) =====
  const allColumnKeysForHook = [...AVAILABLE_COLUMN_KEYS, ...LOCKED_COLUMN_KEYS] as unknown as readonly string[];
  const {
    hiddenKeys: hiddenColumnKeys,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useTableColumns({
    availableKeys: allColumnKeysForHook,
    lockedKeys: LOCKED_COLUMN_KEYS as unknown as readonly string[],
    storageKey: COLUMNS_STORAGE_KEY,
  });

  // ===== Column visibility dropdown UI =====
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!columnMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setColumnMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [columnMenuOpen]);

  // ===== Pagination =====
  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  // ===== Selection state (bulk) =====
  const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);

  // Khi filter/page thay đổi mạnh (data không còn liên quan), clear selection
  // để tránh user bấm bulk delete trên id không còn hiển thị.
  useEffect(() => {
    setSelectedIds([]);
  }, [
    filterOpen,
    filters.searchApplied,
    filters.advanced.name,
    filters.advanced.email,
    filters.advanced.role,
    filters.advanced.status,
    filters.sort.key,
    filters.sort.order,
    filters.page,
  ]);

  // ===== Modal state =====
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formUser, setFormUser] = useState<User | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | string | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    loading: false,
    user: null,
    mode: "delete",
  });

  const [bulkConfirm, setBulkConfirm] = useState<BulkConfirmState>({
    open: false,
    loading: false,
    mode: "delete",
    status: "SUSPENDED",
  });

  // Dropdown action
  const [openActionId, setOpenActionId] = useState<string | number | null>(null);
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

  // ===== Toast banner (success ngắn) =====
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function openCreate() {
    setFormUser(null);
    setFormModalOpen(true);
  }
  function openEdit(u: User) {
    setFormUser(u);
    setFormModalOpen(true);
  }
  function openDetail(u: User) {
    setDetailId(u.id);
    setDetailOpen(true);
  }
  function openDelete(u: User) {
    setConfirm({ open: true, loading: false, user: u, mode: "delete" });
    setOpenActionId(null);
  }
  function openRestore(u: User) {
    setConfirm({ open: true, loading: false, user: u, mode: "restore" });
    setOpenActionId(null);
  }

  function handleUserSave(_saved: User, mode: "create" | "update") {
    setFormModalOpen(false);
    setBanner({
      type: "success",
      text: mode === "create" ? "Tạo người dùng thành công" : "Cập nhật người dùng thành công",
    });
    loadUsers();
  }

  async function handleConfirm() {
    if (!confirm.user) return;
    setConfirm((p) => ({ ...p, loading: true }));
    try {
      if (confirm.mode === "delete") {
        await deleteUser(confirm.user.id);
        setBanner({ type: "success", text: "Đã chuyển người dùng vào thùng rác" });
      } else {
        await restoreUser(confirm.user.id);
        setBanner({ type: "success", text: "Khôi phục người dùng thành công" });
      }
      setConfirm({ open: false, loading: false, user: null, mode: "delete" });
      loadUsers();
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

  // ===== Bulk handlers =====
  function openBulkDelete() {
    if (selectedIds.length === 0) return;
    setBulkConfirm({ open: true, loading: false, mode: "delete", status: "SUSPENDED" });
  }
  function openBulkStatus(status: UserStatus) {
    if (selectedIds.length === 0) return;
    setBulkConfirm({ open: true, loading: false, mode: "status", status });
  }
  function clearBulkSelection() {
    setSelectedIds([]);
  }

  async function handleBulkConfirm() {
    setBulkConfirm((p) => ({ ...p, loading: true }));
    try {
      if (bulkConfirm.mode === "delete") {
        const result = await bulkDeleteUsers(selectedIds);
        setBanner({
          type: "success",
          text: `Đã chuyển ${result.deletedCount} người dùng vào thùng rác`,
        });
      } else {
        const result = await bulkUpdateStatus(selectedIds, bulkConfirm.status);
        setBanner({
          type: "success",
          text: `Đã cập nhật trạng thái cho ${result.updatedCount} người dùng`,
        });
      }
      setBulkConfirm((p) => ({ ...p, open: false, loading: false }));
      setSelectedIds([]);
      loadUsers();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Thao tác hàng loạt thất bại";
      setBanner({ type: "error", text: message });
      setBulkConfirm((p) => ({ ...p, loading: false }));
    }
  }

  // ===== Table columns =====
  const columns: TableColumn<User>[] = useMemo(
    () => [
      {
        key: "fullName",
        header: "Họ tên",
        sortable: true,
        render: (u) => <span className={styles.fullName}>{u.fullName}</span>,
      },
      {
        key: "email",
        header: "Email",
        sortable: true,
      },
      {
        key: "phone",
        header: "Số điện thoại",
        render: (u) => u.phone || "—",
      },
      {
        key: "role",
        header: "Vai trò",
        sortable: true,
        render: (u) => (
          <span
            className={[
              styles.badge,
              styles[`badgeRole_${ROLE_BADGE_VARIANT[u.role]}`],
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {ROLE_LABELS[u.role]}
          </span>
        ),
      },
      {
        key: "status",
        header: "Trạng thái",
        sortable: true,
        render: (u) => {
          if (isDeletedUser(u)) {
            return (
              <span className={[styles.badge, styles.badgeDeleted].join(" ")}>
                Đã xoá
              </span>
            );
          }
          const cls =
            u.status === "ACTIVE"
              ? styles.badgeActive
              : u.status === "SUSPENDED"
              ? styles.badgeWarn
              : styles.badgeInfo;
          return (
            <span className={[styles.badge, cls].join(" ")}>
              {STATUS_LABELS[u.status]}
            </span>
          );
        },
      },
      {
        key: "createdAt",
        header: "Ngày tạo",
        sortable: true,
        render: (u) => formatDate(u.createdAt),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (u) => {
          if (!canManage) return null;
          const isOpen = openActionId === u.id;
          return (
            <div ref={isOpen ? actionMenuRef : undefined} className={styles.actionWrap}>
              <button
                type="button"
                className={styles.actionTrigger}
                aria-label="Hành động"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenActionId(isOpen ? null : u.id);
                }}
              >
                <span style={{ display: "inline-flex", gap: 2 }}>
                  <span aria-hidden="true">⋯</span>
                </span>
              </button>
              {isOpen ? (
                <div role="menu" className={styles.actionMenu}>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.actionItem}
                    onClick={() => {
                      openDetail(u);
                      setOpenActionId(null);
                    }}
                  >
                    <Eye size={14} /> Xem chi tiết
                  </button>
                  {isDeletedUser(u) ? null : (
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.actionItem}
                      onClick={() => {
                        openEdit(u);
                        setOpenActionId(null);
                      }}
                    >
                      <Edit3 size={14} /> Sửa
                    </button>
                  )}
                  {isDeletedUser(u) ? (
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.actionItem}
                      onClick={() => openRestore(u)}
                    >
                      <RotateCcw size={14} /> Khôi phục
                    </button>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      className={[
                        styles.actionItem,
                        styles.actionItemDanger,
                      ].join(" ")}
                      onClick={() => openDelete(u)}
                    >
                      <Trash2 size={14} /> Xoá
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canManage, openActionId]
  );

  // ===== Empty / Skeleton =====
  const tableSkeletonRows = 6;
  const isFiltered = filterOpen
    ? Boolean(filters.advanced.name) ||
      Boolean(filters.advanced.email) ||
      filters.advanced.role !== "ALL" ||
      filters.advanced.status !== "ALL"
    : Boolean(filters.searchApplied);

  const emptyState = (
    <div className={styles.emptyState}>
      <UsersIcon size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        {isFiltered
          ? "Không tìm thấy kết quả phù hợp với bộ lọc"
          : "Chưa có người dùng nào"}
      </p>
      <p className={styles.emptyHint}>
        {isFiltered
          ? "Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm."
          : "Bắt đầu bằng cách thêm người dùng đầu tiên."}
      </p>
      {canManage && !isFiltered ? (
        <Button variant="primary" size="md" leftIcon={<Plus size={16} />} onClick={openCreate}>
          Thêm người dùng
        </Button>
      ) : null}
    </div>
  );

  // Filter Panel is active if any advanced field is set
  const isFilterPanelActive =
    Boolean(filters.advanced.name) ||
    Boolean(filters.advanced.email) ||
    filters.advanced.role !== "ALL" ||
    filters.advanced.status !== "ALL";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý người dùng</h1>
          <p className={styles.subtitle}>
            Danh sách tài khoản học viên, giáo viên, quản trị viên trong hệ thống.
          </p>
        </div>
        {canManage ? (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={openCreate}
          >
            Thêm người dùng
          </Button>
        ) : null}
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
          Bạn đang xem với quyền hạn chế. Chỉ quản trị viên mới có thể thêm, sửa, xoá
          hoặc khôi phục người dùng.
        </Alert>
      ) : null}

      <Card padding="md" className={styles.tableCard}>
        {/* Toolbar: search + filter toggle + columns toggle + add filter panel */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Input
              placeholder={
                filterOpen
                  ? "Đang dùng bộ lọc nâng cao — tắt bộ lọc để tìm chung"
                  : "Tìm theo họ tên hoặc email"
              }
              value={filters.search}
              onChange={handleSearchInput}
              leftIcon={<Search size={16} />}
              rightIcon={
                filters.search ? <XIcon size={14} /> : undefined
              }
              onRightIconClick={filters.search ? clearSearch : undefined}
              disabled={filterOpen}
            />
          </div>

          <div className={styles.toolbarActions}>
            <button
              type="button"
              className={`${styles.filterToggleBtn} ${
                filterOpen ? styles.filterToggleBtnActive : ""
              }`}
              onClick={toggleFilterPanel}
              aria-expanded={filterOpen}
            >
              <SlidersHorizontal size={14} />
              <span>Bộ lọc nâng cao</span>
              {isFilterPanelActive ? (
                <span
                  style={{
                    backgroundColor: "var(--brand-primary)",
                    color: "var(--text-on-primary)",
                    fontSize: "10px",
                    padding: "1px 6px",
                    borderRadius: "var(--radius-full)",
                    fontWeight: 700,
                  }}
                >
                  đang lọc
                </span>
              ) : null}
              <ChevronDown
                size={14}
                className={`${styles.chevron} ${filterOpen ? styles.chevronOpen : ""}`}
              />
            </button>

            <div className={styles.columnToggleWrap} ref={columnMenuRef}>
              <button
                type="button"
                className={styles.filterToggleBtn}
                onClick={() => setColumnMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={columnMenuOpen}
              >
                <Columns size={14} />
                <span>Cột hiển thị</span>
              </button>
              {columnMenuOpen ? (
                <div role="menu" className={styles.columnMenu}>
                  <div className={styles.columnMenuHeader}>Cột có thể ẩn</div>
                  {AVAILABLE_COLUMN_KEYS.map((key) => {
                    const isLocked = (LOCKED_COLUMN_KEYS as readonly string[]).includes(key);
                    const hidden = hiddenColumnKeys.includes(key);
                    return (
                      <label
                        key={key}
                        className={`${styles.columnItem} ${isLocked ? styles.columnItemLocked : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={!hidden}
                          disabled={isLocked}
                          onChange={() => toggleColumn(key)}
                        />
                        <span>{COLUMN_LABELS[key] ?? key}</span>
                      </label>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetColumns();
                    }}
                    style={{ marginTop: "var(--space-1)" }}
                  >
                    Khôi phục mặc định
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Advanced Filter Panel (toggle) */}
        <UserFilterPanel
          open={filterOpen}
          values={filters.advanced}
          onChange={handleFilterPanelChange}
          onClear={clearAdvancedFilters}
        />

        {/* Bulk Action Bar (sticky, chỉ hiện khi có selection) */}
        {canManage ? (
          <BulkActionBar
            selectedCount={selectedIds.length}
            itemLabel="người dùng"
            loading={bulkConfirm.loading}
            actions={[
              {
                key: "changeStatus",
                label: "Đổi trạng thái",
                icon: <ToggleRight size={14} />,
                variant: "secondary",
                subOptions: STATUS_OPTIONS.map((s) => ({
                  key: s.value,
                  label: s.label,
                })),
                onAction: (key) => openBulkStatus(key as UserStatus),
              },
              {
                key: "delete",
                label: "Xoá",
                icon: <Trash2 size={14} />,
                variant: "danger",
                onAction: openBulkDelete,
              },
            ]}
            onClearSelection={clearBulkSelection}
          />
        ) : null}

        {/* Error state */}
        {loadError ? (
          <div className={styles.errorWrap}>
            <Alert variant="error">{loadError}</Alert>
            <Button variant="secondary" size="sm" onClick={loadUsers}>
              Thử lại
            </Button>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={users}
              loading={loading}
              skeletonRows={tableSkeletonRows}
              rowKey={(u) => u.id}
              emptyState={emptyState}
              rowClassName={(u) => (isDeletedUser(u) ? styles.rowDeleted : undefined)}
              selectable={canManage}
              selectedIds={selectedIds}
              onSelectedChange={setSelectedIds}
              selectableKey={(u) => u.id}
              sortable
              sortConfig={filters.sort}
              onSortChange={handleSortChange}
              hiddenColumnKeys={hiddenColumnKeys as string[]}
            />

            {!loading && users.length > 0 ? (
              <div className={styles.tableFooter}>
                <span className={styles.totalLabel}>
                  Hiển thị <b>{users.length}</b> / <b>{total}</b> người dùng
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

      {/* Bulk-confirm dialog (xoá / đổi status) */}
      <ConfirmDialog
        open={bulkConfirm.open}
        loading={bulkConfirm.loading}
        title={
          bulkConfirm.mode === "delete"
            ? `Xoá ${selectedIds.length} người dùng?`
            : `Đổi trạng thái ${selectedIds.length} người dùng?`
        }
        message={
          bulkConfirm.mode === "delete" ? (
            <>
              Bạn sắp <b>xoá mềm</b> {selectedIds.length} người dùng đã chọn. Hành
              động này sẽ chuyển họ vào thùng rác và có thể khôi phục lại sau.
              <br />
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                Nếu trong danh sách có chính bạn, thao tác sẽ tự loại trừ và báo lỗi
                rõ ràng.
              </span>
            </>
          ) : (
            <>
              Đổi trạng thái của {selectedIds.length} người dùng đã chọn sang{" "}
              <b>{STATUS_LABELS[bulkConfirm.status]}</b>. Hành động này sẽ không áp
              dụng nếu trong danh sách có chính bạn và trạng thái mới là khoá/ngừng
              hoạt động.
            </>
          )
        }
        confirmText={bulkConfirm.mode === "delete" ? "Xoá" : "Đổi trạng thái"}
        confirmVariant={bulkConfirm.mode === "delete" ? "danger" : "primary"}
        onConfirm={handleBulkConfirm}
        onCancel={() =>
          setBulkConfirm((p) => ({ ...p, open: false }))
        }
      />

      <UserFormModal
        open={formModalOpen}
        user={formUser}
        onClose={() => setFormModalOpen(false)}
        onSuccess={handleUserSave}
      />

      <UserDetailModal
        open={detailOpen}
        userId={detailId}
        onClose={() => setDetailOpen(false)}
      />

      <ConfirmDialog
        open={confirm.open}
        loading={confirm.loading}
        title={
          confirm.mode === "delete"
            ? "Xoá người dùng?"
            : "Khôi phục người dùng?"
        }
        message={
          confirm.mode === "delete" ? (
            <>
              Bạn sắp xoá người dùng <b>{confirm.user?.fullName}</b>. Đây là{" "}
              <b>xoá mềm</b> — người dùng vẫn có thể được khôi phục lại sau.
            </>
          ) : (
            <>
              Khôi phục người dùng <b>{confirm.user?.fullName}</b>? Người dùng sẽ
              hoạt động trở lại như trước khi bị xoá.
            </>
          )
        }
        confirmText={confirm.mode === "delete" ? "Xoá" : "Khôi phục"}
        confirmVariant={confirm.mode === "delete" ? "danger" : "primary"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return value;
  }
}
