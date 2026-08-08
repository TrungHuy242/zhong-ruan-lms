/**
 * TestimonialManagementPage — trang Admin quản lý đánh giá/feedback học viên.
 *
 * Hallmark stamp:
 *   macrostructure: table-led · genre: modern-minimal · theme: design-system-locked (DESIGN.md §10)
 *   tone: utilitarian · anchor hue: brand-red #C8102E
 *   shape: admin-radius-input 6px / control 8px · shadow: admin-control 0.08
 *   font: Be Vietnam Pro only (single-font admin shell)
 *
 * Pattern (khớp 5 module FormPage khác):
 *   - Toolbar: search + filter theo Nổi bật / Trạng thái
 *   - Table với column visibility toggle
 *   - Pagination
 *   - FormPage riêng cho thêm/sửa (KHÔNG dùng modal)
 *   - ConfirmDialog cho xoá/khôi phục
 *   - Toggle publish nhanh trong action menu
 *
 * URL sync:
 *   - search: ?search=
 *   - filter: ?isFeatured=&isPublished=
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
  ConfirmDialog,
  Input,
  Pagination,
  Table,
  type SortConfig,
  type TableColumn,
} from "../../../shared/components/ui";
import { useToast } from "../../../shared/contexts/ToastContext";
import { useTableColumns } from "../../../shared/hooks/useTableColumns";
import {
  ChevronDown,
  Columns,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  Quote,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X as XIcon,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../../../shared/api";
import { authStorage } from "../../../shared/storage/authStorage";
import { isAdmin } from "../../../shared/utils/auth";
import {
  deleteTestimonial,
  listTestimonials,
  restoreTestimonial,
  updateTestimonial,
  type Testimonial,
  type TestimonialSortBy,
} from "../services/testimonialApi";
import {
  TESTIMONIAL_AVAILABLE_COLUMN_KEYS,
  TESTIMONIAL_LOCKED_COLUMN_KEYS,
  TESTIMONIAL_PAGE_SIZE,
  TESTIMONIAL_SORT_LABELS,
} from "../constants/testimonial.constants";
import styles from "./TestimonialManagementPage.module.css";

const SORTABLE_TESTIMONIAL_KEYS: TestimonialSortBy[] = [
  "studentName",
  "rating",
  "displayOrder",
  "createdAt",
];
const SORTABLE_KEY_SET = new Set<string>(SORTABLE_TESTIMONIAL_KEYS);
function isSortableTestimonialKey(k: string): k is TestimonialSortBy {
  return SORTABLE_KEY_SET.has(k);
}

type FilterMode = "ALL" | "true" | "false";

interface FilterState {
  search: string;
  searchApplied: string;
  isFeatured: FilterMode;
  isPublished: FilterMode;
  page: number;
  sort: SortConfig;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  searchApplied: "",
  isFeatured: "ALL",
  isPublished: "ALL",
  page: 1,
  sort: { key: "displayOrder", order: "asc" },
};

interface ConfirmState {
  open: boolean;
  loading: boolean;
  testimonial: Testimonial | null;
  mode: "delete" | "restore";
}

const COLUMN_LABELS: Record<string, string> = {
  courseInfo: "Khóa học",
  isFeatured: "Nổi bật",
  isPublished: "Trạng thái",
  displayOrder: "Thứ tự",
  createdAt: "Ngày tạo",
};

const COLUMNS_STORAGE_KEY = "zrlms_testimonial_table_columns";

function truncate(text: string, max: number): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

function StarRating({ value }: { value: number }) {
  return (
    <span
      className={styles.starRating}
      aria-label={`${value} trên 5 sao`}
      title={`${value}/5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= value ? styles.starFilled : styles.starEmpty}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function TestimonialManagementPage() {
  useEffect(() => {
    document.title = "Quản lý đánh giá — Zhong Ruan LMS";
  }, []);

  const currentUser = authStorage.getUser();
  const canManage = isAdmin(currentUser?.role);

  const toast = useToast();

  const allColumnKeysForHook = [
    ...TESTIMONIAL_AVAILABLE_COLUMN_KEYS,
    ...TESTIMONIAL_LOCKED_COLUMN_KEYS,
  ] as unknown as readonly string[];
  const {
    hiddenKeys: hiddenColumnKeys,
    toggle: toggleColumn,
    reset: resetColumns,
  } = useTableColumns({
    availableKeys: allColumnKeysForHook,
    lockedKeys: TESTIMONIAL_LOCKED_COLUMN_KEYS as unknown as readonly string[],
    storageKey: COLUMNS_STORAGE_KEY,
  });

  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!columnMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        columnMenuRef.current &&
        !columnMenuRef.current.contains(e.target as Node)
      ) {
        setColumnMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [columnMenuOpen]);

  // ===== URL sync =====
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => {
    const initial: FilterState = { ...INITIAL_FILTERS };
    const sp = searchParams.get("search");
    if (sp) {
      initial.search = sp;
      initial.searchApplied = sp;
    }
    const featured = searchParams.get("isFeatured");
    if (featured && ["ALL", "true", "false"].includes(featured)) {
      initial.isFeatured = featured as FilterMode;
    }
    const published = searchParams.get("isPublished");
    if (published && ["ALL", "true", "false"].includes(published)) {
      initial.isPublished = published as FilterMode;
    }
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");
    if (sortBy && isSortableTestimonialKey(sortBy)) {
      initial.sort = {
        key: sortBy,
        order: sortOrder === "asc" ? "asc" : "desc",
      };
    }
    const page = Number(searchParams.get("page") ?? "1");
    if (page > 1) initial.page = page;
    return initial;
  });

  useEffect(() => {
    const next: Record<string, string> = {};
    if (filters.searchApplied) next.search = filters.searchApplied;
    if (filters.isFeatured !== "ALL") next.isFeatured = filters.isFeatured;
    if (filters.isPublished !== "ALL") next.isPublished = filters.isPublished;
    if (filters.sort.key !== "displayOrder" || filters.sort.order !== "asc") {
      next.sortBy = filters.sort.key;
      next.sortOrder = filters.sort.order;
    }
    if (filters.page > 1) next.page = String(filters.page);
    setSearchParams(next, { replace: true });
  }, [
    filters.searchApplied,
    filters.isFeatured,
    filters.isPublished,
    filters.sort.key,
    filters.sort.order,
    filters.page,
    setSearchParams,
  ]);

  // ===== Data =====
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTestimonials = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: Parameters<typeof listTestimonials>[0] = {
        page: filters.page,
        limit: TESTIMONIAL_PAGE_SIZE,
        sortBy: filters.sort.key as TestimonialSortBy,
        sortOrder: filters.sort.order,
      };
      if (filters.searchApplied) params.search = filters.searchApplied;
      if (filters.isFeatured !== "ALL") {
        params.isFeatured = filters.isFeatured as "true" | "false";
      }
      if (filters.isPublished !== "ALL") {
        params.isPublished = filters.isPublished as "true" | "false";
      }
      const result = await listTestimonials(params);
      setTestimonials(result.testimonials);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được danh sách đánh giá";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [
    filters.searchApplied,
    filters.isFeatured,
    filters.isPublished,
    filters.sort.key,
    filters.sort.order,
    filters.page,
  ]);

  useEffect(() => {
    loadTestimonials();
  }, [loadTestimonials]);

  // Debounce search
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

  // ===== Handlers =====
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
  function handleFeaturedChange(value: FilterMode) {
    setFilters((prev) => ({ ...prev, isFeatured: value, page: 1 }));
  }
  function handlePublishedChange(value: FilterMode) {
    setFilters((prev) => ({ ...prev, isPublished: value, page: 1 }));
  }
  function clearAllFilters() {
    setFilters((prev) => ({
      ...prev,
      search: "",
      searchApplied: "",
      isFeatured: "ALL",
      isPublished: "ALL",
      page: 1,
    }));
  }
  function handleSortChange(next: SortConfig) {
    setFilters((prev) => ({ ...prev, sort: next, page: 1 }));
  }
  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  // ===== Navigation (FormPage riêng) =====
  const navigate = useNavigate();
  const location = useLocation();
  function goCreate() {
    navigate("/testimonials/new", {
      state: { returnTo: location.pathname + location.search },
    });
  }
  function goEdit(t: Testimonial) {
    navigate(`/testimonials/${t.id}/edit`, {
      state: { returnTo: location.pathname + location.search },
    });
  }

  // Refresh khi searchParams đổi (quay lại từ FormPage)
  useEffect(() => {
    loadTestimonials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    loading: false,
    testimonial: null,
    mode: "delete",
  });

  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(e.target as Node)
      ) {
        setOpenActionId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openDelete(t: Testimonial) {
    setConfirm({ open: true, loading: false, testimonial: t, mode: "delete" });
    setOpenActionId(null);
  }
  function openRestore(t: Testimonial) {
    setConfirm({
      open: true,
      loading: false,
      testimonial: t,
      mode: "restore",
    });
    setOpenActionId(null);
  }

  async function handleConfirm() {
    if (!confirm.testimonial) return;
    setConfirm((p) => ({ ...p, loading: true }));
    try {
      if (confirm.mode === "delete") {
        await deleteTestimonial(confirm.testimonial.id);
        toast.success("Đã chuyển đánh giá vào thùng rác");
      } else {
        await restoreTestimonial(confirm.testimonial.id);
        toast.success("Khôi phục đánh giá thành công");
      }
      setConfirm({
        open: false,
        loading: false,
        testimonial: null,
        mode: "delete",
      });
      loadTestimonials();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Thao tác thất bại";
      toast.error(message);
      setConfirm((p) => ({ ...p, loading: false }));
    }
  }

  /** Toggle publish nhanh từ action menu — không mở FormPage. */
  async function handleQuickTogglePublish(t: Testimonial) {
    setOpenActionId(null);
    try {
      await updateTestimonial(t.id, { isPublished: !t.isPublished });
      toast.success(
        t.isPublished
          ? `Đã ẩn đánh giá của "${t.studentName}" khỏi trang public`
          : `Đã xuất bản đánh giá của "${t.studentName}"`
      );
      loadTestimonials();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không cập nhật được trạng thái";
      toast.error(message);
    }
  }

  // ===== Table columns =====
  const columns: TableColumn<Testimonial>[] = useMemo(
    () => [
      {
        key: "studentName",
        header: "Họ tên",
        sortable: true,
        render: (t) => (
          <div className={styles.nameCell}>
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
                <Quote size={14} />
              </span>
            )}
            <div className={styles.nameText}>
              <span className={styles.fullName}>{t.studentName}</span>
              {t.source ? (
                <span className={styles.sourceMeta}>{t.source}</span>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        key: "courseInfo",
        header: "Khóa học",
        render: (t) => (
          <span className={styles.courseInfo}>
            {t.courseInfo || "—"}
          </span>
        ),
      },
      {
        key: "content",
        header: "Trích dẫn",
        render: (t) => (
          <span className={styles.contentCell} title={t.content}>
            {truncate(t.content, 60)}
          </span>
        ),
      },
      {
        key: "rating",
        header: "Đánh giá",
        sortable: true,
        render: (t) => <StarRating value={t.rating} />,
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
            <span className={[styles.badge, styles.badgeMuted].join(" ")}>
              —
            </span>
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
                  setOpenActionId(isOpen ? null : t.id);
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
                    onClick={() => {
                      goEdit(t);
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
                      className={[styles.actionItem, styles.actionItemDanger].join(
                        " "
                      )}
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

  const isFiltered =
    Boolean(filters.searchApplied) ||
    filters.isFeatured !== "ALL" ||
    filters.isPublished !== "ALL";

  const emptyState = (
    <div className={styles.emptyState}>
      <Quote size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        {isFiltered
          ? "Không tìm thấy đánh giá phù hợp với bộ lọc"
          : "Chưa có đánh giá nào"}
      </p>
      <p className={styles.emptyHint}>
        {isFiltered
          ? "Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm."
          : "Bắt đầu bằng cách thêm đánh giá đầu tiên."}
      </p>
      {canManage && !isFiltered ? (
        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus size={16} />}
          onClick={goCreate}
        >
          Thêm đánh giá
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý đánh giá</h1>
          <p className={styles.subtitle}>
            Phản hồi từ học viên — hiển thị ở trang chủ và trang công khai.
          </p>
        </div>
        {canManage ? (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={goCreate}
          >
            Thêm đánh giá
          </Button>
        ) : null}
      </header>

      {!canManage ? (
        <Alert variant="info">
          Bạn đang xem với quyền hạn chế. Chỉ quản trị viên mới có thể thêm,
          sửa, xoá hoặc thay đổi trạng thái đánh giá.
        </Alert>
      ) : null}

      <div className={styles.tableCard}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Input
              placeholder="Tìm theo họ tên, nội dung hoặc khóa học"
              value={filters.search}
              onChange={handleSearchInput}
              leftIcon={<Search size={16} />}
              rightIcon={filters.search ? <XIcon size={14} /> : undefined}
              onRightIconClick={filters.search ? clearSearch : undefined}
            />
          </div>

          <label className={styles.filterLabel}>
            <span>Nổi bật</span>
            <select
              className={styles.select}
              value={filters.isFeatured}
              onChange={(e) =>
                handleFeaturedChange(e.target.value as FilterMode)
              }
            >
              <option value="ALL">Tất cả</option>
              <option value="true">Nổi bật</option>
              <option value="false">Thường</option>
            </select>
          </label>

          <label className={styles.filterLabel}>
            <span>Trạng thái</span>
            <select
              className={styles.select}
              value={filters.isPublished}
              onChange={(e) =>
                handlePublishedChange(e.target.value as FilterMode)
              }
            >
              <option value="ALL">Tất cả</option>
              <option value="true">Đã xuất bản</option>
              <option value="false">Đã ẩn</option>
            </select>
          </label>

          {isFiltered ? (
            <button
              type="button"
              className={styles.clearAllBtn}
              onClick={clearAllFilters}
            >
              <XIcon size={14} /> Xoá bộ lọc
            </button>
          ) : null}

          {canManage ? (
            <div className={styles.columnToggleWrap} ref={columnMenuRef}>
              <button
                type="button"
                className={styles.columnToggleBtn}
                onClick={() => setColumnMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={columnMenuOpen}
              >
                <Columns size={14} />
                <span>Cột hiển thị</span>
                <ChevronDown
                  size={14}
                  className={[
                    styles.chevron,
                    columnMenuOpen ? styles.chevronOpen : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              </button>
              {columnMenuOpen ? (
                <div role="menu" className={styles.columnMenu}>
                  <div className={styles.columnMenuHeader}>
                    Cột có thể ẩn
                  </div>
                  {TESTIMONIAL_AVAILABLE_COLUMN_KEYS.map((key) => {
                    const isLocked = (
                      TESTIMONIAL_LOCKED_COLUMN_KEYS as readonly string[]
                    ).includes(key);
                    const hidden = hiddenColumnKeys.includes(key);
                    return (
                      <label
                        key={key}
                        className={[
                          styles.columnItem,
                          isLocked ? styles.columnItemLocked : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <input
                          type="checkbox"
                          checked={!hidden}
                          disabled={isLocked}
                          onChange={() => toggleColumn(key)}
                        />
                        <span>
                          {COLUMN_LABELS[key] ??
                            TESTIMONIAL_SORT_LABELS[key] ??
                            key}
                        </span>
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
          ) : null}
        </div>

        {loadError ? (
          <div className={styles.errorWrap}>
            <Alert variant="error">{loadError}</Alert>
            <Button variant="secondary" size="sm" onClick={loadTestimonials}>
              Thử lại
            </Button>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={testimonials}
              loading={loading}
              skeletonRows={6}
              rowKey={(t) => t.id}
              emptyState={emptyState}
              rowClassName={(t) =>
                t.deletedAt ? styles.rowDeleted : undefined
              }
              sortable
              sortConfig={filters.sort}
              onSortChange={handleSortChange}
              hiddenColumnKeys={hiddenColumnKeys as string[]}
            />

            {!loading && testimonials.length > 0 ? (
              <div className={styles.tableFooter}>
                <span className={styles.totalLabel}>
                  Hiển thị <b>{testimonials.length}</b> / <b>{total}</b> đánh
                  giá
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

      <ConfirmDialog
        open={confirm.open}
        loading={confirm.loading}
        title={
          confirm.mode === "delete"
            ? "Xoá đánh giá?"
            : "Khôi phục đánh giá?"
        }
        message={
          confirm.mode === "delete" ? (
            <>
              Bạn sắp xoá đánh giá của <b>{confirm.testimonial?.studentName}</b>.
              Đây là <b>xoá mềm</b> — đánh giá vẫn có thể được khôi phục lại
              sau.
            </>
          ) : (
            <>
              Khôi phục đánh giá của <b>{confirm.testimonial?.studentName}</b>?
              Đánh giá sẽ hoạt động trở lại như trước khi bị xoá.
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