/**
 * TeacherManagementPage — trang Admin quản lý giảng viên.
 *
 * Pattern: tái sử dụng triết lý User Management Level 2:
 *   - Toolbar: search + bộ lọc nâng cao + columns toggle
 *   - BulkActionBar (xoá nhiều)
 *   - Table với sort + filter + URL query sync
 *   - Pagination
 *   - Modal Form thêm/sửa (TeacherFormModal)
 *   - ConfirmDialog cho xoá/khôi phục
 *   - Toggle publish nhanh trong action menu (không cần mở modal)
 *
 * URL sync:
 *   - search: ?search=
 *   - filter panel mở + field: ?fullName=&title=&isFeatured=&isPublished=
 *   - sort: ?sortBy=&sortOrder=
 *   - page: ?page=
 */
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
import { BulkActionBar } from "../../../shared/components/layout/BulkActionBar";
import { TeacherFormModal } from "../components/TeacherFormModal";
import { TeacherFilterPanel } from "../components/TeacherFilterPanel";
import {
  bulkDeleteTeachers,
  deleteTeacher,
  listTeachers,
  restoreTeacher,
  updateTeacher,
  type Teacher,
  type TeacherSortBy,
  type TeacherAdvancedFilterValues,
  EMPTY_TEACHER_ADVANCED_FILTERS,
} from "../services/teacherApi";
import {
  TEACHER_AVAILABLE_COLUMN_KEYS,
  TEACHER_LOCKED_COLUMN_KEYS,
  TEACHER_PAGE_SIZE,
  TEACHER_SORT_LABELS,
} from "../constants/teacher.constants";
import { ApiError } from "../../../shared/api";
import { authStorage } from "../../../shared/storage/authStorage";
import { useTableColumns } from "../../../shared/hooks/useTableColumns";
import {
  ChevronDown,
  Columns,
  Edit3,
  Eye,
  EyeOff,
  GraduationCap,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  X as XIcon,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import styles from "./TeacherManagementPage.module.css";

const SORTABLE_TEACHER_KEYS: TeacherSortBy[] = [
  "fullName",
  "title",
  "isFeatured",
  "isPublished",
  "displayOrder",
  "createdAt",
];
const SORTABLE_KEY_SET = new Set<string>(SORTABLE_TEACHER_KEYS);
function isSortableTeacherKey(k: string): k is TeacherSortBy {
  return SORTABLE_KEY_SET.has(k);
}

interface FilterState {
  search: string;
  searchApplied: string;
  advanced: TeacherAdvancedFilterValues;
  page: number;
  sort: SortConfig;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  searchApplied: "",
  advanced: { ...EMPTY_TEACHER_ADVANCED_FILTERS },
  page: 1,
  sort: { key: "displayOrder", order: "asc" },
};

const COLUMN_LABELS: Record<string, string> = {
  title: "Chức danh",
  yearsOfExperience: "Số năm KN",
  specialties: "Chuyên môn",
  isFeatured: "Nổi bật",
  isPublished: "Trạng thái",
  displayOrder: "Thứ tự",
  createdAt: "Ngày tạo",
};

const COLUMNS_STORAGE_KEY = "zrlms_teacher_table_columns";

interface ConfirmState {
  open: boolean;
  loading: boolean;
  teacher: Teacher | null;
  mode: "delete" | "restore";
}

interface BulkConfirmState {
  open: boolean;
  loading: boolean;
  mode: "delete" | "publish" | "unpublish";
}

export function TeacherManagementPage() {
  const currentUser = authStorage.getUser();
  const canManage = currentUser?.role === "ADMIN";

  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => {
    const initial: FilterState = {
      ...INITIAL_FILTERS,
      advanced: { ...EMPTY_TEACHER_ADVANCED_FILTERS },
    };
    const sp = searchParams.get("search");
    if (sp) {
      initial.search = sp;
      initial.searchApplied = sp;
    }
    const fn = searchParams.get("fullName");
    if (fn) initial.advanced.fullName = fn;
    const title = searchParams.get("title");
    if (title) initial.advanced.title = title;
    const featured = searchParams.get("isFeatured");
    if (featured && ["ALL", "true", "false"].includes(featured)) {
      initial.advanced.isFeatured = featured as TeacherAdvancedFilterValues["isFeatured"];
    }
    const published = searchParams.get("isPublished");
    if (published && ["ALL", "true", "false"].includes(published)) {
      initial.advanced.isPublished = published as TeacherAdvancedFilterValues["isPublished"];
    }
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");
    if (sortBy && isSortableTeacherKey(sortBy)) {
      initial.sort = {
        key: sortBy,
        order: sortOrder === "asc" ? "asc" : "desc",
      };
    }
    const page = Number(searchParams.get("page") ?? "1");
    if (page > 1) initial.page = page;
    return initial;
  });

  const [filterOpen, setFilterOpen] = useState<boolean>(() => {
    return Boolean(
      searchParams.get("fullName") ||
        searchParams.get("title") ||
        searchParams.get("isFeatured") ||
        searchParams.get("isPublished")
    );
  });

  useEffect(() => {
    const next: Record<string, string> = {};
    if (filterOpen) {
      if (filters.advanced.fullName) next.fullName = filters.advanced.fullName;
      if (filters.advanced.title) next.title = filters.advanced.title;
      if (filters.advanced.isFeatured !== "ALL")
        next.isFeatured = filters.advanced.isFeatured;
      if (filters.advanced.isPublished !== "ALL")
        next.isPublished = filters.advanced.isPublished;
    } else {
      if (filters.searchApplied) next.search = filters.searchApplied;
    }
    if (filters.sort.key !== "displayOrder" || filters.sort.order !== "asc") {
      next.sortBy = filters.sort.key;
      next.sortOrder = filters.sort.order;
    }
    if (filters.page > 1) next.page = String(filters.page);
    setSearchParams(next, { replace: true });
  }, [
    filterOpen,
    filters.searchApplied,
    filters.advanced.fullName,
    filters.advanced.title,
    filters.advanced.isFeatured,
    filters.advanced.isPublished,
    filters.sort.key,
    filters.sort.order,
    filters.page,
    setSearchParams,
  ]);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: Parameters<typeof listTeachers>[0] = {
        page: filters.page,
        limit: TEACHER_PAGE_SIZE,
        sortBy: filters.sort.key as TeacherSortBy,
        sortOrder: filters.sort.order,
      };
      if (filterOpen) {
        if (filters.advanced.fullName) params.fullName = filters.advanced.fullName;
        if (filters.advanced.title) params.title = filters.advanced.title;
        if (filters.advanced.isFeatured !== "ALL") {
          params.isFeatured = filters.advanced.isFeatured as "true" | "false";
        }
        if (filters.advanced.isPublished !== "ALL") {
          params.isPublished = filters.advanced.isPublished as "true" | "false";
        }
      } else {
        if (filters.searchApplied) params.search = filters.searchApplied;
      }
      const result = await listTeachers(params);
      setTeachers(result.teachers);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được danh sách giảng viên";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [
    filterOpen,
    filters.searchApplied,
    filters.advanced.fullName,
    filters.advanced.title,
    filters.advanced.isFeatured,
    filters.advanced.isPublished,
    filters.sort.key,
    filters.sort.order,
    filters.page,
  ]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

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
    setFilters((prev) => ({
      ...prev,
      search: "",
      searchApplied: "",
      page: 1,
    }));
  }

  function handleFilterPanelChange(next: TeacherAdvancedFilterValues) {
    setFilters((prev) => ({ ...prev, advanced: next, page: 1 }));
  }
  function clearAdvancedFilters() {
    setFilters((prev) => ({
      ...prev,
      advanced: { ...EMPTY_TEACHER_ADVANCED_FILTERS },
      page: 1,
    }));
  }
  function toggleFilterPanel() {
    setFilterOpen((v) => !v);
  }

  function handleSortChange(next: SortConfig) {
    setFilters((prev) => ({ ...prev, sort: next, page: 1 }));
  }

  const allColumnKeysForHook = [
    ...TEACHER_AVAILABLE_COLUMN_KEYS,
    ...TEACHER_LOCKED_COLUMN_KEYS,
  ] as unknown as readonly string[];
  const {
    hiddenKeys: hiddenColumnKeys,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useTableColumns({
    availableKeys: allColumnKeysForHook,
    lockedKeys: TEACHER_LOCKED_COLUMN_KEYS as unknown as readonly string[],
    storageKey: COLUMNS_STORAGE_KEY,
  });

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

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [
    filterOpen,
    filters.searchApplied,
    filters.advanced.fullName,
    filters.advanced.title,
    filters.advanced.isFeatured,
    filters.advanced.isPublished,
    filters.sort.key,
    filters.sort.order,
    filters.page,
  ]);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formTeacher, setFormTeacher] = useState<Teacher | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    loading: false,
    teacher: null,
    mode: "delete",
  });

  const [bulkConfirm, setBulkConfirm] = useState<BulkConfirmState>({
    open: false,
    loading: false,
    mode: "delete",
  });

  const [openActionId, setOpenActionId] = useState<string | null>(null);
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

  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  function openCreate() {
    setFormTeacher(null);
    setFormModalOpen(true);
  }
  function openEdit(t: Teacher) {
    setFormTeacher(t);
    setFormModalOpen(true);
  }
  function openDelete(t: Teacher) {
    setConfirm({ open: true, loading: false, teacher: t, mode: "delete" });
    setOpenActionId(null);
  }
  function openRestore(t: Teacher) {
    setConfirm({ open: true, loading: false, teacher: t, mode: "restore" });
    setOpenActionId(null);
  }

  function handleTeacherSave(_saved: Teacher, mode: "create" | "update") {
    setFormModalOpen(false);
    setBanner({
      type: "success",
      text:
        mode === "create"
          ? "Tạo giảng viên thành công"
          : "Cập nhật giảng viên thành công",
    });
    loadTeachers();
  }

  async function handleConfirm() {
    if (!confirm.teacher) return;
    setConfirm((p) => ({ ...p, loading: true }));
    try {
      if (confirm.mode === "delete") {
        await deleteTeacher(confirm.teacher.id);
        setBanner({ type: "success", text: "Đã chuyển giảng viên vào thùng rác" });
      } else {
        await restoreTeacher(confirm.teacher.id);
        setBanner({ type: "success", text: "Khôi phục giảng viên thành công" });
      }
      setConfirm({ open: false, loading: false, teacher: null, mode: "delete" });
      loadTeachers();
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

  function openBulkDelete() {
    if (selectedIds.length === 0) return;
    setBulkConfirm({ open: true, loading: false, mode: "delete" });
  }
  function openBulkPublish(publish: boolean) {
    if (selectedIds.length === 0) return;
    setBulkConfirm({
      open: true,
      loading: false,
      mode: publish ? "publish" : "unpublish",
    });
  }
  function clearBulkSelection() {
    setSelectedIds([]);
  }

  async function handleBulkConfirm() {
    setBulkConfirm((p) => ({ ...p, loading: true }));
    try {
      if (bulkConfirm.mode === "delete") {
        const result = await bulkDeleteTeachers(selectedIds.map(String));
        setBanner({
          type: result.deletedCount > 0 ? "success" : "error",
          text:
            result.deletedCount > 0
              ? `Đã chuyển ${result.deletedCount} giảng viên vào thùng rác`
              : "Không xoá được giảng viên nào",
        });
      } else {
        const target = bulkConfirm.mode === "publish";
        const ids = selectedIds.map(String);
        let ok = 0;
        let lastError: string | null = null;
        for (const id of ids) {
          try {
            await updateTeacher(id, { isPublished: target });
            ok++;
          } catch (err) {
            lastError =
              err instanceof ApiError
                ? err.message
                : err instanceof Error
                ? err.message
                : "Thất bại";
          }
        }
        setBanner({
          type: ok > 0 ? "success" : "error",
          text:
            ok > 0
              ? `Đã ${target ? "xuất bản" : "ẩn"} ${ok}/${ids.length} giảng viên` +
                (lastError && ok < ids.length ? ` (lỗi: ${lastError})` : "")
              : lastError ?? "Không cập nhật được giảng viên nào",
        });
      }
      setBulkConfirm((p) => ({ ...p, open: false, loading: false }));
      setSelectedIds([]);
      loadTeachers();
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

  /** Toggle publish nhanh từ action menu — không mở modal. */
  async function handleQuickTogglePublish(t: Teacher) {
    setOpenActionId(null);
    try {
      await updateTeacher(t.id, { isPublished: !t.isPublished });
      setBanner({
        type: "success",
        text: t.isPublished
          ? `Đã ẩn "${t.fullName}" khỏi trang public`
          : `Đã xuất bản "${t.fullName}"`,
      });
      loadTeachers();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không cập nhật được trạng thái";
      setBanner({ type: "error", text: message });
    }
  }

  const columns: TableColumn<Teacher>[] = useMemo(
    () => [
      {
        key: "fullName",
        header: "Họ tên",
        sortable: true,
        render: (t) => (
          <div className={styles.fullNameCell}>
            {t.avatarUrl ? (
              <img
                src={t.avatarUrl}
                alt=""
                className={styles.avatar}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span className={styles.avatarPlaceholder} aria-hidden="true">
                <GraduationCap size={16} />
              </span>
            )}
            <span className={styles.fullName}>{t.fullName}</span>
          </div>
        ),
      },
      {
        key: "title",
        header: "Chức danh",
        sortable: true,
        render: (t) => <span>{t.title || "—"}</span>,
      },
      {
        key: "yearsOfExperience",
        header: "Số năm KN",
        render: (t) =>
          t.yearsOfExperience != null ? `${t.yearsOfExperience} năm` : "—",
      },
      {
        key: "specialties",
        header: "Chuyên môn",
        render: (t) =>
          t.specialties && t.specialties.length > 0 ? (
            <div className={styles.tagList}>
              {t.specialties.slice(0, 3).map((s) => (
                <span key={s} className={styles.tag}>
                  {s}
                </span>
              ))}
              {t.specialties.length > 3 ? (
                <span className={styles.tagMore}>+{t.specialties.length - 3}</span>
              ) : null}
            </div>
          ) : (
            "—"
          ),
      },
      {
        key: "isFeatured",
        header: "Nổi bật",
        sortable: true,
        render: (t) =>
          t.isFeatured ? (
            <span className={[styles.badge, styles.badgeFeatured].join(" ")}>
              <Star size={12} /> Nổi bật
            </span>
          ) : (
            <span className={[styles.badge, styles.badgeMuted].join(" ")}>—</span>
          ),
      },
      {
        key: "isPublished",
        header: "Trạng thái",
        sortable: true,
        render: (t) => {
          if (t.deletedAt) {
            return (
              <span className={[styles.badge, styles.badgeDeleted].join(" ")}>
                Đã xoá
              </span>
            );
          }
          return t.isPublished ? (
            <span className={[styles.badge, styles.badgeActive].join(" ")}>
              Đã xuất bản
            </span>
          ) : (
            <span className={[styles.badge, styles.badgeWarn].join(" ")}>
              Đã ẩn
            </span>
          );
        },
      },
      {
        key: "displayOrder",
        header: "Thứ tự",
        sortable: true,
        render: (t) => t.displayOrder,
      },
      {
        key: "createdAt",
        header: "Ngày tạo",
        sortable: true,
        render: (t) => formatDate(t.createdAt),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (t) => {
          if (!canManage) return null;
          const isOpen = openActionId === t.id;
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
                  setOpenActionId(isOpen ? null : t.id);
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
                      openEdit(t);
                      setOpenActionId(null);
                    }}
                  >
                    <Edit3 size={14} /> Sửa
                  </button>
                  {t.deletedAt ? null : (
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.actionItem}
                      onClick={() => handleQuickTogglePublish(t)}
                    >
                      {t.isPublished ? (
                        <>
                          <EyeOff size={14} /> Ẩn nhanh
                        </>
                      ) : (
                        <>
                          <Eye size={14} /> Xuất bản nhanh
                        </>
                      )}
                    </button>
                  )}
                  {t.deletedAt ? (
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.actionItem}
                      onClick={() => openRestore(t)}
                    >
                      <RotateCcw size={14} /> Khôi phục
                    </button>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      className={[styles.actionItem, styles.actionItemDanger].join(" ")}
                      onClick={() => openDelete(t)}
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

  const tableSkeletonRows = 6;
  const isFiltered = filterOpen
    ? Boolean(filters.advanced.fullName) ||
      Boolean(filters.advanced.title) ||
      filters.advanced.isFeatured !== "ALL" ||
      filters.advanced.isPublished !== "ALL"
    : Boolean(filters.searchApplied);

  const emptyState = (
    <div className={styles.emptyState}>
      <GraduationCap size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        {isFiltered
          ? "Không tìm thấy giảng viên phù hợp với bộ lọc"
          : "Chưa có giảng viên nào"}
      </p>
      <p className={styles.emptyHint}>
        {isFiltered
          ? "Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm."
          : "Bắt đầu bằng cách thêm giảng viên đầu tiên."}
      </p>
      {canManage && !isFiltered ? (
        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus size={16} />}
          onClick={openCreate}
        >
          Thêm giảng viên
        </Button>
      ) : null}
    </div>
  );

  const isFilterPanelActive =
    Boolean(filters.advanced.fullName) ||
    Boolean(filters.advanced.title) ||
    filters.advanced.isFeatured !== "ALL" ||
    filters.advanced.isPublished !== "ALL";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý giảng viên</h1>
          <p className={styles.subtitle}>
            Danh sách giảng viên hiển thị trên trang public. Quản lý hồ sơ,
            chức danh, chuyên môn và trạng thái xuất bản.
          </p>
        </div>
        {canManage ? (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={openCreate}
          >
            Thêm giảng viên
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
          Bạn đang xem với quyền hạn chế. Chỉ quản trị viên mới có thể thêm,
          sửa, xoá hoặc thay đổi trạng thái giảng viên.
        </Alert>
      ) : null}

      <Card padding="md" className={styles.tableCard}>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Input
              placeholder={
                filterOpen
                  ? "Đang dùng bộ lọc nâng cao — tắt bộ lọc để tìm chung"
                  : "Tìm theo họ tên, chức danh hoặc slug"
              }
              value={filters.search}
              onChange={handleSearchInput}
              leftIcon={<Search size={16} />}
              rightIcon={filters.search ? <XIcon size={14} /> : undefined}
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
                  {TEACHER_AVAILABLE_COLUMN_KEYS.map((key) => {
                    const isLocked = (
                      TEACHER_LOCKED_COLUMN_KEYS as readonly string[]
                    ).includes(key);
                    const hidden = hiddenColumnKeys.includes(key);
                    return (
                      <label
                        key={key}
                        className={`${styles.columnItem} ${
                          isLocked ? styles.columnItemLocked : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!hidden}
                          disabled={isLocked}
                          onChange={() => toggleColumn(key)}
                        />
                        <span>{COLUMN_LABELS[key] ?? TEACHER_SORT_LABELS[key] ?? key}</span>
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

        <TeacherFilterPanel
          open={filterOpen}
          values={filters.advanced}
          onChange={handleFilterPanelChange}
          onClear={clearAdvancedFilters}
        />

        {canManage ? (
          <BulkActionBar
            selectedCount={selectedIds.length}
            itemLabel="giảng viên"
            loading={bulkConfirm.loading}
            actions={[
              {
                key: "publish",
                label: "Xuất bản",
                icon: <Eye size={14} />,
                variant: "secondary",
                onAction: () => openBulkPublish(true),
              },
              {
                key: "unpublish",
                label: "Ẩn",
                icon: <EyeOff size={14} />,
                variant: "secondary",
                onAction: () => openBulkPublish(false),
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

        {loadError ? (
          <div className={styles.errorWrap}>
            <Alert variant="error">{loadError}</Alert>
            <Button variant="secondary" size="sm" onClick={loadTeachers}>
              Thử lại
            </Button>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={teachers}
              loading={loading}
              skeletonRows={tableSkeletonRows}
              rowKey={(t) => t.id}
              emptyState={emptyState}
              rowClassName={(t) => (t.deletedAt ? styles.rowDeleted : undefined)}
              selectable={canManage}
              selectedIds={selectedIds}
              onSelectedChange={setSelectedIds}
              selectableKey={(t) => t.id}
              sortable
              sortConfig={filters.sort}
              onSortChange={handleSortChange}
              hiddenColumnKeys={hiddenColumnKeys as string[]}
            />

            {!loading && teachers.length > 0 ? (
              <div className={styles.tableFooter}>
                <span className={styles.totalLabel}>
                  Hiển thị <b>{teachers.length}</b> / <b>{total}</b> giảng viên
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

      <ConfirmDialog
        open={bulkConfirm.open}
        loading={bulkConfirm.loading}
        title={
          bulkConfirm.mode === "delete"
            ? `Xoá ${selectedIds.length} giảng viên?`
            : bulkConfirm.mode === "publish"
            ? `Xuất bản ${selectedIds.length} giảng viên?`
            : `Ẩn ${selectedIds.length} giảng viên?`
        }
        message={
          bulkConfirm.mode === "delete" ? (
            <>
              Bạn sắp <b>xoá mềm</b> {selectedIds.length} giảng viên đã chọn.
              Hành động này sẽ chuyển họ vào thùng rác và có thể khôi phục lại sau.
            </>
          ) : bulkConfirm.mode === "publish" ? (
            <>
              Xuất bản {selectedIds.length} giảng viên đã chọn — họ sẽ hiển thị
              trên trang public.
            </>
          ) : (
            <>
              Ẩn {selectedIds.length} giảng viên đã chọn khỏi trang public.
              Dữ liệu vẫn được giữ nguyên.
            </>
          )
        }
        confirmText={
          bulkConfirm.mode === "delete"
            ? "Xoá"
            : bulkConfirm.mode === "publish"
            ? "Xuất bản"
            : "Ẩn"
        }
        confirmVariant={bulkConfirm.mode === "delete" ? "danger" : "primary"}
        onConfirm={handleBulkConfirm}
        onCancel={() => setBulkConfirm((p) => ({ ...p, open: false }))}
      />

      <TeacherFormModal
        open={formModalOpen}
        teacher={formTeacher}
        onClose={() => setFormModalOpen(false)}
        onSuccess={handleTeacherSave}
      />

      <ConfirmDialog
        open={confirm.open}
        loading={confirm.loading}
        title={
          confirm.mode === "delete" ? "Xoá giảng viên?" : "Khôi phục giảng viên?"
        }
        message={
          confirm.mode === "delete" ? (
            <>
              Bạn sắp xoá giảng viên <b>{confirm.teacher?.fullName}</b>. Đây là{" "}
              <b>xoá mềm</b> — giảng viên vẫn có thể được khôi phục lại sau.
            </>
          ) : (
            <>
              Khôi phục giảng viên <b>{confirm.teacher?.fullName}</b>? Giảng
              viên sẽ hoạt động trở lại như trước khi bị xoá.
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