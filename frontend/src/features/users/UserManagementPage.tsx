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
  type TableColumn,
} from "../../shared/components/ui";
import { UserFormModal } from "./UserFormModal";
import { UserDetailModal } from "./UserDetailModal";
import {
  USER_PAGE_SIZE,
  deleteUser,
  restoreUser,
  type User,
  type UserRole,
  type UserStatus,
} from "./userApi";
import { listUsers } from "./userApi";
import { ApiError } from "../../shared/lib/api";
import { authStorage } from "../../shared/lib/authStorage";
import {
  ChevronDown,
  Edit3,
  Eye,
  Plus,
  RotateCcw,
  Search,
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
  INACTIVE: "Chưa kích hoạt",
  SUSPENDED: "Đã khoá",
};

interface ConfirmState {
  open: boolean;
  loading: boolean;
  user: User | null;
  mode: "delete" | "restore";
}

interface FilterState {
  search: string;
  /** Khi search debounced xong, mới dùng để gọi API. */
  searchApplied: string;
  role: RoleFilter;
  status: StatusFilter;
  page: number;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  searchApplied: "",
  role: "ALL",
  status: "ALL",
  page: 1,
};

function isDeletedUser(u: User): boolean {
  return Boolean(u.deletedAt);
}

export function UserManagementPage() {
  // ===== Phân quyền (UI-level) =====
  const currentUser = authStorage.getUser();
  const canManage = currentUser?.role === "ADMIN";

  // ===== URL sync =====
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...INITIAL_FILTERS,
    search: searchParams.get("search") ?? "",
    searchApplied: searchParams.get("search") ?? "",
    role: (searchParams.get("role") as RoleFilter) ?? "ALL",
    status: (searchParams.get("status") as StatusFilter) ?? "ALL",
    page: Number(searchParams.get("page") ?? "1") || 1,
  }));

  // Đồng bộ URL mỗi khi filters thay đổi (searchApplied/role/status/page).
  useEffect(() => {
    const next: Record<string, string> = {};
    if (filters.searchApplied) next.search = filters.searchApplied;
    if (filters.role !== "ALL") next.role = filters.role;
    if (filters.status !== "ALL") next.status = filters.status;
    if (filters.page > 1) next.page = String(filters.page);
    setSearchParams(next, { replace: true });
  }, [filters.searchApplied, filters.role, filters.status, filters.page, setSearchParams]);

  // ===== Data state =====
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await listUsers({
        search: filters.searchApplied || undefined,
        role: filters.role === "ALL" ? undefined : filters.role,
        status: filters.status === "ALL" ? undefined : filters.status,
        page: filters.page,
      });
      setUsers(result.users);
      setTotal(result.total);
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
  }, [filters.searchApplied, filters.role, filters.status, filters.page]);

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

  // ===== Filter dropdowns =====
  function handleRoleChange(e: ChangeEvent<HTMLSelectElement>) {
    setFilters((prev) => ({
      ...prev,
      role: e.target.value as RoleFilter,
      page: 1,
    }));
  }
  function handleStatusChange(e: ChangeEvent<HTMLSelectElement>) {
    setFilters((prev) => ({
      ...prev,
      status: e.target.value as StatusFilter,
      page: 1,
    }));
  }

  // ===== Pagination =====
  const totalPages = Math.max(1, Math.ceil(total / USER_PAGE_SIZE));
  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

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
    // Refresh danh sách (giữ nguyên filter + page).
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

  // ===== Table columns =====
  const columns: TableColumn<User>[] = useMemo(
    () => [
      {
        key: "fullName",
        header: "Họ tên",
        render: (u) => <span className={styles.fullName}>{u.fullName}</span>,
      },
      { key: "email", header: "Email" },
      {
        key: "phone",
        header: "Số điện thoại",
        render: (u) => u.phone || "—",
      },
      {
        key: "role",
        header: "Vai trò",
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
  const isFiltered =
    Boolean(filters.searchApplied) || filters.role !== "ALL" || filters.status !== "ALL";

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
        {/* Toolbar: search + filter */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Input
              placeholder="Tìm theo họ tên hoặc email"
              value={filters.search}
              onChange={handleSearchInput}
              leftIcon={<Search size={16} />}
              rightIcon={
                filters.search ? (
                  <XIcon size={14} />
                ) : undefined
              }
              onRightIconClick={filters.search ? clearSearch : undefined}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <span>Vai trò</span>
              <select
                className={styles.select}
                value={filters.role}
                onChange={handleRoleChange}
              >
                <option value="ALL">Tất cả</option>
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.filterLabel}>
              <span>Trạng thái</span>
              <select
                className={styles.select}
                value={filters.status}
                onChange={handleStatusChange}
              >
                <option value="ALL">Tất cả</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

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

// Tránh TypeScript coi ChevronDown nhập khẩu không dùng (giữ icon lib cho
// extension sau: dropdown caret khi cần hiển thị menu dạng native).
void ChevronDown;
