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
import {
  SettingDetailModal,
} from "../components/SettingDetailModal";
import {
  SettingModal,
  type SettingModalMode,
} from "../components/SettingModal";
import {
  Eye,
  Pencil,
  Trash2,
  Settings as SettingsIcon,
  Search,
  X as XIcon,
  Plus,
  FolderOpen,
} from "lucide-react";
import {
  deleteSetting,
  getSettings,
  type Setting,
} from "../services/settingApi";
import { getApiErrorMessage } from "../../../shared/validation/fileValidation";
import { authStorage } from "../../../shared/storage/authStorage";
import { useSearchParams } from "react-router-dom";
import styles from "./SystemSettingsPage.module.css";

interface FiltersState {
  search: string;
  searchApplied: string;
  page: number;
}

const INITIAL_FILTERS: FiltersState = {
  search: "",
  searchApplied: "",
  page: 1,
};

const PAGE_SIZE = 10;

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
  return Boolean(f.searchApplied);
}

/** Rút gọn value dài cho cột Value (tooltip giữ bản đầy đủ). */
function truncate(value: string, max = 80): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

export function SystemSettingsPage() {
  // ===== Auth =====
  const currentUser = authStorage.getUser();
  const isAdmin = currentUser?.role === "ADMIN";

  // ===== URL sync =====
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<FiltersState>(() => {
    const initial: FiltersState = { ...INITIAL_FILTERS };
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
    if (filters.page > 1) next.page = String(filters.page);
    setSearchParams(next, { replace: true });
  }, [filters.searchApplied, filters.page, setSearchParams]);

  // ===== Data =====
  const [allItems, setAllItems] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ===== Modal state =====
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<SettingModalMode>("create");
  const [editing, setEditing] = useState<Setting | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSetting, setDetailSetting] = useState<Setting | null>(null);

  const [deleting, setDeleting] = useState<Setting | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ===== Alert (toast) =====
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // ===== Load =====
  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const items = await getSettings();
      setAllItems(items);
    } catch (err) {
      const message = getApiErrorMessage(err, "Không tải được danh sách cấu hình");
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

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
    }, 450);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [filters.search]);

  // ===== Filtered + paginated =====
  const filteredItems = useMemo(() => {
    if (!filters.searchApplied) return allItems;
    const s = filters.searchApplied.toLowerCase();
    return allItems.filter(
      (it) =>
        it.key.toLowerCase().includes(s) ||
        (it.description ?? "").toLowerCase().includes(s)
    );
  }, [allItems, filters.searchApplied]);

  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (filters.page - 1) * PAGE_SIZE;
  const pageItems = filteredItems.slice(start, start + PAGE_SIZE);

  // ===== Handlers =====
  function handleSearchInput(e: ChangeEvent<HTMLInputElement>) {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  }
  function clearSearch() {
    setFilters((prev) => ({ ...prev, search: "", searchApplied: "", page: 1 }));
  }
  function clearAllFilters() {
    setFilters({ ...INITIAL_FILTERS });
  }
  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function openCreate() {
    setEditing(null);
    setModalMode("create");
    setModalOpen(true);
  }
  function openEdit(setting: Setting) {
    setEditing(setting);
    setModalMode("edit");
    setModalOpen(true);
  }
  function openDetail(setting: Setting) {
    setDetailSetting(setting);
    setDetailOpen(true);
  }
  function askDelete(setting: Setting) {
    setDeleting(setting);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteSetting(deleting.key);
      setDeleting(null);
      setAlertMessage({ type: "success", text: `Đã xoá cấu hình "${deleting.key}".` });
      // Quay về trang 1 nếu trang hiện tại trống sau khi xoá.
      const newTotal = total - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
      if (filters.page > newTotalPages) {
        setFilters((prev) => ({ ...prev, page: newTotalPages }));
      } else {
        void loadList();
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "Không xoá được cấu hình");
      setAlertMessage({ type: "error", text: message });
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleSaved(setting: Setting, mode: SettingModalMode) {
    setModalOpen(false);
    setEditing(null);
    if (mode === "create") {
      setAlertMessage({ type: "success", text: `Đã tạo cấu hình "${setting.key}".` });
      // Tạo mới → về trang 1 để user thấy.
      setFilters((prev) => ({ ...prev, page: 1 }));
    } else {
      setAlertMessage({
        type: "success",
        text: `Đã cập nhật cấu hình "${setting.key}".`,
      });
      void loadList();
    }
  }

  // ===== Columns =====
  const columns: TableColumn<Setting>[] = useMemo(
    () => [
      {
        key: "key",
        header: "Key",
        minWidth: 200,
        render: (s) => (
          <span className={[styles.mono, styles.cellKey].join(" ")} title={s.key}>
            {s.key}
          </span>
        ),
      },
      {
        key: "value",
        header: "Value",
        minWidth: 240,
        render: (s) => (
          <span className={styles.valueCell} title={s.value}>
            {truncate(s.value, 80)}
          </span>
        ),
      },
      {
        key: "description",
        header: "Description",
        render: (s) =>
          s.description?.trim() ? (
            <span className={styles.descCell}>{s.description}</span>
          ) : (
            <span className={styles.descEmpty}>—</span>
          ),
      },
      {
        key: "updatedAt",
        header: "Cập nhật lần cuối",
        render: (s) => (
          <span className={styles.timeCell}>{formatDateTime(s.updatedAt)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (s) =>
          isAdmin ? (
            <div className={styles.actionCell}>
              <button
                type="button"
                className={[styles.iconBtn, styles.iconBtnView].join(" ")}
                onClick={() => openDetail(s)}
                title="Xem chi tiết"
                aria-label="Xem chi tiết"
              >
                <Eye size={16} />
              </button>
              <button
                type="button"
                className={[styles.iconBtn, styles.iconBtnEdit].join(" ")}
                onClick={() => openEdit(s)}
                title="Sửa"
                aria-label="Sửa"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                className={[styles.iconBtn, styles.iconBtnDanger].join(" ")}
                onClick={() => askDelete(s)}
                title="Xoá"
                aria-label="Xoá"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : null,
      },
    ],
    [isAdmin]
  );

  const existingKeys = useMemo(
    () => allItems.map((s) => s.key),
    [allItems]
  );

  // ===== Render =====
  const filtered = isFiltersActive(filters);
  const emptyState = (
    <div className={styles.emptyState}>
      <FolderOpen size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        {filtered
          ? "Không tìm thấy cấu hình phù hợp"
          : "Chưa có cấu hình nào trong hệ thống"}
      </p>
      <p className={styles.emptyHint}>
        {filtered
          ? "Thử bỏ bớt bộ lọc hoặc thay đổi từ khoá tìm kiếm."
          : isAdmin
          ? "Bấm nút \"Thêm cấu hình\" để tạo cấu hình đầu tiên."
          : "Liên hệ quản trị viên để được thêm cấu hình."}
      </p>
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <SettingsIcon size={24} className={styles.titleIcon} aria-hidden="true" />
            Cài đặt hệ thống
          </h1>
          <p className={styles.subtitle}>
            Quản lý các cấu hình chung của hệ thống (SMTP, Maintenance mode, cờ
            tính năng…). Chỉ Admin được phép tạo, sửa, xoá.
          </p>
        </div>
        <div className={styles.headerActions}>
          {isAdmin ? (
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={openCreate}
            >
              Thêm cấu hình
            </Button>
          ) : null}
        </div>
      </header>

      {!isAdmin ? (
        <Alert variant="warning">
          Bạn đang đăng nhập với quyền <b>{currentUser?.role ?? "—"}</b>. Theo
          chính sách hệ thống, chỉ Admin mới có quyền tạo/sửa/xoá cấu hình.
          Bạn vẫn có thể xem danh sách.
        </Alert>
      ) : null}

      {alertMessage ? (
        <Alert
          variant={
            alertMessage.type === "success"
              ? "success"
              : alertMessage.type === "error"
              ? "error"
              : "info"
          }
          onClose={() => setAlertMessage(null)}
        >
          {alertMessage.text}
        </Alert>
      ) : null}

      <div className={styles.tableCard}>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Input
              placeholder="Tìm theo key hoặc description..."
              value={filters.search}
              onChange={handleSearchInput}
              leftIcon={<Search size={16} />}
              rightIcon={filters.search ? <XIcon size={14} /> : undefined}
              onRightIconClick={filters.search ? clearSearch : undefined}
            />
          </div>

          {filtered ? (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Xoá bộ lọc
            </Button>
          ) : null}
        </div>

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
              data={pageItems}
              loading={loading}
              skeletonRows={6}
              rowKey={(s) => s.id}
              emptyState={emptyState}
            />

            {!loading && pageItems.length > 0 ? (
              <div className={styles.tableFooter}>
                <span className={styles.totalLabel}>
                  Hiển thị <b>{pageItems.length}</b> / <b>{total}</b> cấu hình
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

      {isAdmin ? (
        <SettingModal
          open={modalOpen}
          mode={modalMode}
          setting={editing}
          existingKeys={existingKeys}
          onSaved={handleSaved}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      ) : null}

      <SettingDetailModal
        open={detailOpen}
        setting={detailSetting}
        onClose={() => setDetailOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xoá cấu hình này?"
        message={
          deleting
            ? `Hành động này sẽ xoá vĩnh viễn cấu hình "${deleting.key}" và không thể khôi phục.`
            : ""
        }
        confirmText="Xoá cấu hình"
        cancelText="Huỷ"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}