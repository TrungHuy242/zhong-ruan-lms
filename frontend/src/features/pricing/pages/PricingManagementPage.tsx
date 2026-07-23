/**
 * PricingManagementPage — trang Admin quản lý Bảng giá.
 *
 * Pattern: tái sử dụng triết lý Teacher Management:
 *   - Toolbar: search + bộ lọc nâng cao + columns toggle
 *   - Table với sort + filter + URL query sync
 *   - Pagination
 *   - Modal Form thêm/sửa (PricingFormModal)
 *   - ConfirmDialog cho xoá
 *   - Toggle publish nhanh trong action menu
 *
 * URL sync:
 *   - search: ?search=
 *   - filter: ?classType=&isFeatured=&isPublished=
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
import { PricingFormModal } from "../components/PricingFormModal";
import {
  deletePricingPlan,
  listPricingPlans,
  updatePricingPlan,
  type PricingPlan,
  type PricingSortBy,
} from "../services/pricingApi";
import { ApiError } from "../../../shared/api";
import { authStorage } from "../../../shared/storage/authStorage";
import { isAdmin } from "../../../shared/utils/auth";
import {
  ChevronDown,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  Search,
  Star,
  Tag,
  Trash2,
  X as XIcon,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { formatVND } from "../services/pricingApi";
import styles from "./PricingManagementPage.module.css";

const SORTABLE_PRICING_KEYS: PricingSortBy[] = [
  "name",
  "classType",
  "price",
  "isFeatured",
  "isPublished",
  "displayOrder",
  "createdAt",
];
const SORTABLE_KEY_SET = new Set<string>(SORTABLE_PRICING_KEYS);
function isSortablePricingKey(k: string): k is PricingSortBy {
  return SORTABLE_KEY_SET.has(k);
}

interface FilterState {
  search: string;
  searchApplied: string;
  classType: "ALL" | "GROUP" | "PRIVATE";
  isFeatured: "ALL" | "true" | "false";
  isPublished: "ALL" | "true" | "false";
  page: number;
  sort: SortConfig;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  searchApplied: "",
  classType: "ALL",
  isFeatured: "ALL",
  isPublished: "ALL",
  page: 1,
  sort: { key: "displayOrder", order: "asc" },
};

const CLASS_TYPE_LABELS: Record<string, string> = {
  GROUP: "Nhóm",
  PRIVATE: "1 kèm 1",
};

interface ConfirmState {
  open: boolean;
  loading: boolean;
  plan: PricingPlan | null;
}

export function PricingManagementPage() {
  const currentUser = authStorage.getUser();
  const canManage = isAdmin(currentUser?.role);

  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => {
    const initial: FilterState = { ...INITIAL_FILTERS };
    const sp = searchParams.get("search");
    if (sp) {
      initial.search = sp;
      initial.searchApplied = sp;
    }
    const ct = searchParams.get("classType");
    if (ct && ["ALL", "GROUP", "PRIVATE"].includes(ct)) {
      initial.classType = ct as FilterState["classType"];
    }
    const feat = searchParams.get("isFeatured");
    if (feat && ["ALL", "true", "false"].includes(feat)) {
      initial.isFeatured = feat as FilterState["isFeatured"];
    }
    const pub = searchParams.get("isPublished");
    if (pub && ["ALL", "true", "false"].includes(pub)) {
      initial.isPublished = pub as FilterState["isPublished"];
    }
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");
    if (sortBy && isSortablePricingKey(sortBy)) {
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
      searchParams.get("classType") ||
        searchParams.get("isFeatured") ||
        searchParams.get("isPublished")
    );
  });

  useEffect(() => {
    const next: Record<string, string> = {};
    if (filterOpen) {
      if (filters.classType !== "ALL") next.classType = filters.classType;
      if (filters.isFeatured !== "ALL") next.isFeatured = filters.isFeatured;
      if (filters.isPublished !== "ALL") next.isPublished = filters.isPublished;
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
    filters.classType,
    filters.isFeatured,
    filters.isPublished,
    filters.sort.key,
    filters.sort.order,
    filters.page,
    setSearchParams,
  ]);

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: Parameters<typeof listPricingPlans>[0] = {
        page: filters.page,
        limit: 20,
        sortBy: filters.sort.key as PricingSortBy,
        sortOrder: filters.sort.order,
      };
      if (filterOpen) {
        if (filters.classType !== "ALL") params.classType = filters.classType;
        if (filters.isFeatured !== "ALL") {
          params.isFeatured = filters.isFeatured as "true" | "false";
        }
        if (filters.isPublished !== "ALL") {
          params.isPublished = filters.isPublished as "true" | "false";
        }
      } else {
        if (filters.searchApplied) params.search = filters.searchApplied;
      }
      const result = await listPricingPlans(params);
      setPlans(result.plans);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được danh sách bảng giá";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [
    filterOpen,
    filters.searchApplied,
    filters.classType,
    filters.isFeatured,
    filters.isPublished,
    filters.sort.key,
    filters.sort.order,
    filters.page,
  ]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

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

  function handleFilterChange(key: keyof FilterState, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }
  function clearAdvancedFilters() {
    setFilters((prev) => ({
      ...prev,
      classType: "ALL",
      isFeatured: "ALL",
      isPublished: "ALL",
      page: 1,
    }));
  }
  function toggleFilterPanel() {
    setFilterOpen((v) => !v);
  }

  function handleSortChange(next: SortConfig) {
    setFilters((prev) => ({ ...prev, sort: next, page: 1 }));
  }

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formPlan, setFormPlan] = useState<PricingPlan | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    loading: false,
    plan: null,
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
    setFormPlan(null);
    setFormModalOpen(true);
  }
  function openEdit(p: PricingPlan) {
    setFormPlan(p);
    setFormModalOpen(true);
  }
  function openDelete(p: PricingPlan) {
    setConfirm({ open: true, loading: false, plan: p });
    setOpenActionId(null);
  }

  function handlePlanSave(_saved: PricingPlan, mode: "create" | "update") {
    setFormModalOpen(false);
    setBanner({
      type: "success",
      text:
        mode === "create"
          ? "Tạo bảng giá thành công"
          : "Cập nhật bảng giá thành công",
    });
    loadPlans();
  }

  async function handleConfirm() {
    if (!confirm.plan) return;
    setConfirm((p) => ({ ...p, loading: true }));
    try {
      await deletePricingPlan(confirm.plan.id);
      setBanner({ type: "success", text: "Đã xoá bảng giá thành công" });
      setConfirm({ open: false, loading: false, plan: null });
      loadPlans();
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

  /** Toggle publish nhanh từ action menu. */
  async function handleQuickTogglePublish(p: PricingPlan) {
    setOpenActionId(null);
    try {
      await updatePricingPlan(p.id, { isPublished: !p.isPublished });
      setBanner({
        type: "success",
        text: p.isPublished
          ? `Đã ẩn "${p.name}"`
          : `Đã xuất bản "${p.name}"`,
      });
      loadPlans();
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

  const columns: TableColumn<PricingPlan>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Tên gói",
        sortable: true,
        render: (p) => <span style={{ fontWeight: 600 }}>{p.name}</span>,
      },
      {
        key: "classType",
        header: "Loại lớp",
        sortable: true,
        render: (p) => (
          <span className={styles.classTypeBadge}>
            {CLASS_TYPE_LABELS[p.classType] ?? p.classType}
          </span>
        ),
      },
      {
        key: "price",
        header: "Giá",
        sortable: true,
        align: "right",
        render: (p) => (
          <span className={styles.priceCell}>
            {p.originalPrice && p.originalPrice > p.price ? (
              <>
                <span className={styles.originalPrice}>
                  {formatVND(p.originalPrice)}đ
                </span>
                <span className={styles.salePrice}>
                  {formatVND(p.price)}đ
                </span>
              </>
            ) : (
              <span>{formatVND(p.price)}đ</span>
            )}
          </span>
        ),
      },
      {
        key: "unit",
        header: "Đơn vị",
        render: (p) => <span>{p.unit}</span>,
      },
      {
        key: "isFeatured",
        header: "Nổi bật",
        sortable: true,
        render: (p) =>
          p.isFeatured ? (
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
        render: (p) =>
          p.isPublished ? (
            <span className={[styles.badge, styles.badgeActive].join(" ")}>
              Xuất bản
            </span>
          ) : (
            <span className={[styles.badge, styles.badgeWarn].join(" ")}>
              Ẩn
            </span>
          ),
      },
      {
        key: "displayOrder",
        header: "Thứ tự",
        sortable: true,
        align: "center",
        render: (p) => p.displayOrder,
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (p) => {
          if (!canManage) return null;
          const isOpen = openActionId === p.id;
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
                  setOpenActionId(isOpen ? null : p.id);
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
                      openEdit(p);
                      setOpenActionId(null);
                    }}
                  >
                    <Edit3 size={14} /> Sửa
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.actionItem}
                    onClick={() => handleQuickTogglePublish(p)}
                  >
                    {p.isPublished ? (
                      <>
                        <EyeOff size={14} /> Ẩn nhanh
                      </>
                    ) : (
                      <>
                        <Eye size={14} /> Xuất bản nhanh
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={[styles.actionItem, styles.actionItemDanger].join(" ")}
                    onClick={() => openDelete(p)}
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
    [canManage, openActionId]
  );

  const isFiltered = filterOpen
    ? filters.classType !== "ALL" ||
      filters.isFeatured !== "ALL" ||
      filters.isPublished !== "ALL"
    : Boolean(filters.searchApplied);

  const emptyState = (
    <div className={styles.emptyState}>
      <Tag size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        {isFiltered
          ? "Không tìm thấy bảng giá phù hợp"
          : "Chưa có bảng giá nào"}
      </p>
      <p className={styles.emptyHint}>
        {isFiltered
          ? "Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm."
          : "Bắt đầu bằng cách thêm bảng giá đầu tiên."}
      </p>
      {canManage && !isFiltered ? (
        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus size={16} />}
          onClick={openCreate}
        >
          Thêm bảng giá
        </Button>
      ) : null}
    </div>
  );

  const isFilterPanelActive =
    filters.classType !== "ALL" ||
    filters.isFeatured !== "ALL" ||
    filters.isPublished !== "ALL";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý Bảng giá</h1>
          <p className={styles.subtitle}>
            Quản lý các gói giá cho khóa học Nhóm và 1 kèm 1. Thiết lập giá,
            quyền lợi và trạng thái xuất bản.
          </p>
        </div>
        {canManage ? (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={openCreate}
          >
            Thêm bảng giá
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
          sửa, xoá hoặc thay đổi trạng thái bảng giá.
        </Alert>
      ) : null}

      <Card padding="md" className={styles.tableCard}>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Input
              placeholder={
                filterOpen
                  ? "Đang dùng bộ lọc nâng cao — tắt bộ lọc để tìm chung"
                  : "Tìm theo tên gói"
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
              <Search size={14} />
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
          </div>
        </div>

        {/* Filter Panel */}
        {filterOpen ? (
          <div className={styles.filterPanel}>
            <div className={styles.filterRow}>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Loại lớp</label>
                <select
                  className={styles.filterSelect}
                  value={filters.classType}
                  onChange={(e) =>
                    handleFilterChange("classType", e.target.value)
                  }
                >
                  <option value="ALL">Tất cả</option>
                  <option value="GROUP">Nhóm</option>
                  <option value="PRIVATE">1 kèm 1</option>
                </select>
              </div>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Nổi bật</label>
                <select
                  className={styles.filterSelect}
                  value={filters.isFeatured}
                  onChange={(e) =>
                    handleFilterChange("isFeatured", e.target.value)
                  }
                >
                  <option value="ALL">Tất cả</option>
                  <option value="true">Có</option>
                  <option value="false">Không</option>
                </select>
              </div>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Trạng thái</label>
                <select
                  className={styles.filterSelect}
                  value={filters.isPublished}
                  onChange={(e) =>
                    handleFilterChange("isPublished", e.target.value)
                  }
                >
                  <option value="ALL">Tất cả</option>
                  <option value="true">Xuất bản</option>
                  <option value="false">Ẩn</option>
                </select>
              </div>
              <button
                type="button"
                className={styles.clearFiltersBtn}
                onClick={clearAdvancedFilters}
              >
                <XIcon size={14} /> Xoá lọc
              </button>
            </div>
          </div>
        ) : null}

        {loadError ? (
          <div className={styles.errorWrap}>
            <Alert variant="error">{loadError}</Alert>
            <Button variant="secondary" size="sm" onClick={loadPlans}>
              Thử lại
            </Button>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={plans}
              loading={loading}
              skeletonRows={6}
              rowKey={(p) => p.id}
              emptyState={emptyState}
              sortable
              sortConfig={filters.sort}
              onSortChange={handleSortChange}
            />

            {!loading && plans.length > 0 ? (
              <div className={styles.tableFooter}>
                <span className={styles.totalLabel}>
                  Hiển thị <b>{plans.length}</b> / <b>{total}</b> bảng giá
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

      <PricingFormModal
        open={formModalOpen}
        plan={formPlan}
        onClose={() => setFormModalOpen(false)}
        onSuccess={handlePlanSave}
        currentFeaturedCount={plans.filter((p) => p.isFeatured).length}
      />

      <ConfirmDialog
        open={confirm.open}
        loading={confirm.loading}
        title="Xoá bảng giá?"
        message={
          confirm.plan ? (
            <>
              Bạn sắp xoá gói <b>{confirm.plan.name}</b>. Hành động này không
              thể hoàn tác.
            </>
          ) : null
        }
        confirmText="Xoá"
        confirmVariant="danger"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm({ open: false, loading: false, plan: null })}
      />
    </div>
  );
}
