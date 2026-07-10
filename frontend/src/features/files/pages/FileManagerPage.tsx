/**
 * FileManagerPage — File Manager chuẩn SaaS.
 *
 * Tính năng (nâng cấp từ bản CRUD cơ bản):
 *  - View toggle: Table | Grid (lưu localStorage)
 *  - Sort: name | size | createdAt (URL sync)
 *  - Filter nâng cao: fileType / uploaderId / dateFrom / dateTo (URL sync)
 *  - Upload queue với progress % thật (XMLHttpRequest) + retry + cancel
 *  - Auto-inject file vừa upload xong vào list
 *  - Storage stats card (chỉ Admin)
 *  - Bulk actions: xoá nhiều / tải zip
 *  - Copy Link / Download nhanh / Preview mở rộng (ảnh/PDF/video/audio)
 *
 * Component reusable:
 *  - FileFilterPanel, FileTableView, FileGridView, FileDetailModal,
 *    StorageStatsCard, UploadQueue
 *  - Shared: BulkActionBar (move lên shared), useUploadQueue
 *  - Shared: Table, Pagination, Alert, ConfirmDialog (đã có sẵn)
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
  type SortConfig,
} from "../../../shared/components/ui";
import { CloudUpload as CloudUploadIcon, FolderOpen, LayoutGrid, List as ListIcon, Search, SlidersHorizontal, Trash2 as Trash2Icon, X as XIcon, Download as DownloadIcon } from "lucide-react";
import { BulkActionBar, type BulkAction } from "../../../shared/components/layout/BulkActionBar";
import { useUploadQueue } from "../../../shared/hooks/useUploadQueue";
import { useSearchParams } from "react-router-dom";
import {
  FILE_PAGE_SIZE,
  FILE_VIEW_MODE_STORAGE_KEY,
} from "../constants/file.constants";
import type { FileViewMode } from "../types/file.types";
import type { FileAdvancedFilterValues } from "../components/FileFilterPanel";
import { FileFilterPanel, EMPTY_FILE_FILTERS } from "../components/FileFilterPanel";
import { FileTableView } from "../components/FileTableView";
import { FileGridView } from "../components/FileGridView";
import { FileDetailModal } from "../components/FileDetailModal";
import { StorageStatsCard } from "../components/StorageStatsCard";
import { UploadQueue } from "../components/UploadQueue";
import {
  type UploadedFile,
  getFiles,
  deleteFile,
  bulkDeleteFiles,
  bulkDownloadFiles,
  uploadFileRaw,
  uploadFile,
} from "../services/fileApi";
import {
  getApiErrorMessage,
  validateFile,
} from "../../../shared/validation/fileValidation";
import { authStorage } from "../../../shared/storage/authStorage";
import { listUsers, type User } from "../../users/services/userApi";
import styles from "./FileManagerPage.module.css";

// Re-validate the shape of EMPTY_FILE_FILTERS (TS assertion, no runtime cost)
const _assertFilter: FileAdvancedFilterValues = EMPTY_FILE_FILTERS;
void _assertFilter;

interface ConfirmState {
  open: boolean;
  loading: boolean;
  mode: "single" | "bulk";
  file: UploadedFile | null;
}

const SORT_KEYS_API = ["name", "size", "createdAt"] as const;
type SortKeyApi = (typeof SORT_KEYS_API)[number];

function isSortKeyApi(k: string): k is SortKeyApi {
  return (SORT_KEYS_API as readonly string[]).includes(k);
}

const VALID_FILE_TYPES = ["image", "document", "video", "audio"] as const;
type FileType = (typeof VALID_FILE_TYPES)[number];
function isFileType(s: string): s is FileType {
  return (VALID_FILE_TYPES as readonly string[]).includes(s);
}

function findUploader(users: User[], uploadedById: number) {
  return users.find((x) => x.id === uploadedById) ?? null;
}

export function FileManagerPage() {
  // ===== Auth =====
  const currentUser = authStorage.getUser();
  const isAdmin = currentUser?.role === "ADMIN";
  const currentUserId =
    currentUser?.id !== undefined
      ? typeof currentUser.id === "number"
        ? currentUser.id
        : Number(currentUser.id)
      : undefined;

  // ===== URL sync =====
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<{
    search: string;
    searchApplied: string;
    advanced: FileAdvancedFilterValues;
    page: number;
    sort: SortConfig;
  }>(() => ({
    search: "",
    searchApplied: "",
    advanced: { ...EMPTY_FILE_FILTERS },
    page: 1,
    sort: { key: "createdAt", order: "desc" },
  }));

  // Sync URL → state khi mount / URL đổi (back/forward)
  useEffect(() => {
    const sp = searchParams;
    setFilters((prev) => {
      const next = { ...prev };
      const s = sp.get("search");
      if (s !== null) {
        next.search = s;
        next.searchApplied = s;
      }
      const fileType = sp.get("fileType");
      if (fileType && isFileType(fileType)) next.advanced.fileType = fileType;
      else if (fileType === null || fileType === "")
        next.advanced.fileType = "all";

      const uid = sp.get("uploaderId");
      if (uid) {
        const n = Number(uid);
        if (Number.isInteger(n) && n > 0) next.advanced.uploaderId = n;
      } else if (uid === "") {
        next.advanced.uploaderId = null;
      }
      next.advanced.dateFrom = sp.get("dateFrom") ?? "";
      next.advanced.dateTo = sp.get("dateTo") ?? "";
      const sortBy = sp.get("sortBy");
      const sortOrder = sp.get("sortOrder");
      if (sortBy && isSortKeyApi(sortBy)) {
        next.sort = {
          key: sortBy,
          order: sortOrder === "asc" ? "asc" : "desc",
        };
      }
      const p = Number(sp.get("page") ?? "1");
      if (p > 1) next.page = p;
      else next.page = 1;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy 1 lần khi mount.

  // Sync state → URL mỗi khi filters thay đổi.
  useEffect(() => {
    const next: Record<string, string> = {};
    if (filters.searchApplied) next.search = filters.searchApplied;
    if (filters.advanced.fileType !== "all") next.fileType = filters.advanced.fileType;
    if (filters.advanced.uploaderId !== null) next.uploaderId = String(filters.advanced.uploaderId);
    if (filters.advanced.dateFrom) next.dateFrom = filters.advanced.dateFrom;
    if (filters.advanced.dateTo) next.dateTo = filters.advanced.dateTo;
    if (filters.sort.key !== "createdAt" || filters.sort.order !== "desc") {
      next.sortBy = filters.sort.key;
      next.sortOrder = filters.sort.order;
    }
    if (filters.page > 1) next.page = String(filters.page);
    setSearchParams(next, { replace: true });
  }, [
    filters.searchApplied,
    filters.advanced.fileType,
    filters.advanced.uploaderId,
    filters.advanced.dateFrom,
    filters.advanced.dateTo,
    filters.sort.key,
    filters.sort.order,
    filters.page,
    setSearchParams,
  ]);

  // ===== View mode (lưu localStorage) =====
  const [viewMode, setViewMode] = useState<FileViewMode>(() => {
    if (typeof window === "undefined") return "table";
    const v = window.localStorage.getItem(FILE_VIEW_MODE_STORAGE_KEY);
    return v === "grid" ? "grid" : "table";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(FILE_VIEW_MODE_STORAGE_KEY, viewMode);
    }
  }, [viewMode]);

  // ===== Filter panel open (UI state, KHÔNG lưu URL) =====
  const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    // Auto-mở nếu URL có bất kỳ param advanced nào.
    const sp = new URLSearchParams(window.location.search);
    return Boolean(
      sp.get("fileType") ||
        sp.get("uploaderId") ||
        sp.get("dateFrom") ||
        sp.get("dateTo")
    );
  });

  // ===== Data =====
  const [items, setItems] = useState<UploadedFile[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [storageStatsRefreshKey, setStorageStatsRefreshKey] = useState(0);

  // ===== Users (cho uploader) =====
  const [users, setUsers] = useState<User[]>([]);

  // ===== Selection (bulk) =====
  const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);

  // Clear selection khi filter/page thay đổi mạnh.
  useEffect(() => {
    setSelectedIds([]);
  }, [
    filters.searchApplied,
    filters.advanced.fileType,
    filters.advanced.uploaderId,
    filters.advanced.dateFrom,
    filters.advanced.dateTo,
    filters.sort.key,
    filters.sort.order,
    filters.page,
  ]);

  // ===== Drag drop state =====
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ===== Upload queue =====
  const uploadQueue = useUploadQueue<UploadedFile>({
    uploadFn: (file, opts) => uploadFileRaw(file, opts),
    onItemSuccess: (_item, response) => {
      // Auto-inject file mới vào đầu list NGAY khi upload xong.
      // Phân biệt với loadList() đầy đủ → tốn 1 API call cho mỗi file.
      setItems((prev) => {
        // Tránh duplicate nếu đã có sẵn (load trước).
        if (prev.some((p) => p.id === response.id)) return prev;
        return [response, ...prev];
      });
      setTotal((t) => t + 1);
      setStorageStatsRefreshKey((k) => k + 1);
    },
  });

  // ===== Detail / Confirm =====
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailFile, setDetailFile] = useState<UploadedFile | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    loading: false,
    mode: "single",
    file: null,
  });

  // ===== Banner (toast inline) =====
  const [banner, setBanner] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // ===== Load list =====
  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await getFiles({
        page: filters.page,
        pageSize: FILE_PAGE_SIZE,
        search: filters.searchApplied || undefined,
        fileType: filters.advanced.fileType === "all" ? undefined : filters.advanced.fileType,
        uploaderId: filters.advanced.uploaderId ?? undefined,
        dateFrom: filters.advanced.dateFrom || undefined,
        dateTo: filters.advanced.dateTo || undefined,
        sortBy: filters.sort.key as SortKeyApi,
        sortOrder: filters.sort.order,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setLoadError(getApiErrorMessage(err, "Không tải được danh sách file"));
    } finally {
      setLoading(false);
    }
  }, [
    filters.page,
    filters.searchApplied,
    filters.advanced.fileType,
    filters.advanced.uploaderId,
    filters.advanced.dateFrom,
    filters.advanced.dateTo,
    filters.sort.key,
    filters.sort.order,
  ]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // ===== Load users (cho uploader) =====
  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      try {
        const result = await listUsers({ limit: 50 });
        if (cancelled) return;
        const list = Array.isArray(result.users) ? result.users : [];
        const active = list.filter((u) => !u.deletedAt);
        active.sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
        setUsers(active);
      } catch {
        // ignore
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
    }, 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [filters.search]);

  // ===== Watch for queue completion → summary banner =====
  useEffect(() => {
    if (
      uploadQueue.summary.total > 0 &&
      uploadQueue.summary.uploading === 0 &&
      uploadQueue.summary.pending === 0
    ) {
      const { success, error, cancelled } = uploadQueue.summary;
      if (success > 0 || error > 0 || cancelled > 0) {
        const parts: string[] = [];
        if (success > 0) parts.push(`Đã tải lên thành công ${success} file`);
        if (error > 0) parts.push(`${error} file lỗi`);
        if (cancelled > 0) parts.push(`${cancelled} file đã huỷ`);
        setBanner({
          type: success > 0 && error === 0 ? "success" : "info",
          text: parts.join(" · "),
        });
      }
    }
  }, [
    uploadQueue.summary.total,
    uploadQueue.summary.uploading,
    uploadQueue.summary.pending,
    uploadQueue.summary.success,
    uploadQueue.summary.error,
    uploadQueue.summary.cancelled,
  ]);

  // ===== Handlers =====
  function handleSearchInput(e: ChangeEvent<HTMLInputElement>) {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  }
  function clearSearch() {
    setFilters((prev) => ({ ...prev, search: "", searchApplied: "", page: 1 }));
  }
  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }
  function handleSortChange(next: SortConfig) {
    setFilters((prev) => ({ ...prev, sort: next, page: 1 }));
  }
  function handleFilterPanelChange(next: FileAdvancedFilterValues) {
    setFilters((prev) => ({ ...prev, advanced: next, page: 1 }));
  }
  function clearAdvancedFilters() {
    setFilters((prev) => ({
      ...prev,
      advanced: { ...EMPTY_FILE_FILTERS },
      page: 1,
    }));
  }
  function handleFilePickerOpen() {
    inputRef.current?.click();
  }

  function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    const valid: File[] = [];
    const invalid: string[] = [];
    for (const f of arr) {
      const v = validateFile(f);
      if (v.ok) valid.push(f);
      else invalid.push(f.name);
    }
    if (invalid.length > 0) {
      setBanner({
        type: "error",
        text: `Bỏ qua ${invalid.length} file không hợp lệ: ${invalid.join(", ")}. Chỉ chấp nhận jpg/jpeg/png/pdf/doc/docx, tối đa 10MB.`,
      });
    }
    if (valid.length > 0) uploadQueue.enqueue(valid);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    e.target.value = "";
  }
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }
  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
  }

  function openDetail(file: UploadedFile) {
    setDetailFile(file);
    setDetailOpen(true);
  }

  async function copyLink(file: UploadedFile) {
    // URL có thể truy cập được: hiện tại BE chưa static-serve file, nên URL
    // này thực ra trỏ tới endpoint JSON. Vẫn copy vì hữu ích làm ID reference.
    const url = `${window.location.origin}/api/files/${file.id}/preview`;
    try {
      await navigator.clipboard.writeText(url);
      setBanner({
        type: "success",
        text: `Đã sao chép liên kết của "${file.originalName}". (Lưu ý: BE chưa serve file vật lý — link này dùng làm ID reference.)`,
      });
    } catch {
      // Fallback cho trình duyệt không hỗ trợ clipboard API (vd HTTP)
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setBanner({
          type: "success",
          text: `Đã sao chép liên kết của "${file.originalName}".`,
        });
      } catch {
        setBanner({
          type: "error",
          text: "Trình duyệt không hỗ trợ sao chép tự động — vui lòng copy thủ công.",
        });
      }
      document.body.removeChild(ta);
    }
  }

  function quickDownload(file: UploadedFile) {
    // Vì BE chưa serve file vật lý, gọi fetch trực tiếp /api/files/:id/preview
    // sẽ fail. Vẫn attempt — nếu BE sau này serve, code không cần đổi.
    const url = `/api/files/${file.id}/preview`;
    const a = document.createElement("a");
    a.href = url;
    a.download = file.originalName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setBanner({
      type: "info",
      text: `Đã gửi yêu cầu tải "${file.originalName}". (Nếu download không bắt đầu, BE chưa serve file vật lý.)`,
    });
  }

  function askDelete(file: UploadedFile) {
    setConfirm({ open: true, loading: false, mode: "single", file });
  }

  async function confirmDelete() {
    if (!confirm.file) return;
    setConfirm((p) => ({ ...p, loading: true }));
    try {
      if (confirm.mode === "bulk") {
        const result = await bulkDeleteFiles(selectedIds);
        setBanner({
          type: "success",
          text: `Đã chuyển ${result.deletedCount} file vào thùng rác.`,
        });
        setSelectedIds([]);
      } else {
        await deleteFile(confirm.file.id);
        setBanner({
          type: "success",
          text: `Đã xoá file "${confirm.file.originalName}".`,
        });
      }
      setConfirm({ open: false, loading: false, mode: "single", file: null });
      await loadList();
      setStorageStatsRefreshKey((k) => k + 1);
    } catch (err) {
      const message = getApiErrorMessage(err, "Không xoá được file");
      setBanner({ type: "error", text: message });
      setConfirm((p) => ({ ...p, loading: false }));
    }
  }

  // ===== Bulk handlers =====
  function clearBulkSelection() {
    setSelectedIds([]);
  }

  async function bulkDownload() {
    if (selectedIds.length === 0) return;
    setBanner({ type: "info", text: `Đang nén ${selectedIds.length} file thành zip...` });
    try {
      const result = await bulkDownloadFiles(selectedIds);
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Clean up sau 30s để browser kịp tải
      setTimeout(() => URL.revokeObjectURL(url), 30_000);

      if (result.missingFiles.length > 0) {
        setBanner({
          type: "info",
          text: `Đã tải zip nhưng có ${result.missingFiles.length} file vật lý bị thiếu trên đĩa — đã bỏ qua khỏi zip.`,
        });
      } else {
        setBanner({ type: "success", text: `Đã tải xuống zip ${selectedIds.length} file.` });
      }
      setSelectedIds([]);
    } catch (err) {
      const message = getApiErrorMessage(err, "Không tải được zip");
      setBanner({ type: "error", text: message });
    }
  }

  function askBulkDelete() {
    setConfirm({ open: true, loading: false, mode: "bulk", file: null });
  }

  // ===== Computed =====
  const detailUploader = detailFile
    ? findUploader(users, detailFile.uploadedById)
    : null;

  const isFiltered =
    Boolean(filters.searchApplied) ||
    filters.advanced.fileType !== "all" ||
    filters.advanced.uploaderId !== null ||
    Boolean(filters.advanced.dateFrom) ||
    Boolean(filters.advanced.dateTo);

  const filteredUsers = useMemo(
    () =>
      users.map((u) => ({
        id: typeof u.id === "number" ? u.id : Number(u.id),
        fullName: u.fullName,
        email: u.email,
      })),
    [users]
  );

  const emptyState = (
    <div className={styles.emptyState}>
      <FolderOpen size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        {isFiltered ? "Không tìm thấy file phù hợp" : "Chưa có file nào"}
      </p>
      <p className={styles.emptyHint}>
        {isFiltered
          ? "Thử bỏ bớt bộ lọc hoặc thay đổi từ khoá tìm kiếm."
          : "Bấm nút \"Tải file lên\" để thêm file đầu tiên vào hệ thống."}
      </p>
    </div>
  );

  // ===== Bulk action config =====
  const bulkActions: BulkAction[] = useMemo(
    () => [
      {
        key: "download",
        label: "Tải xuống (zip)",
        icon: <DownloadIcon size={14} />,
        variant: "secondary",
        onAction: () => void bulkDownload(),
      },
      {
        key: "delete",
        label: "Xoá nhiều",
        icon: <Trash2Icon />,
        variant: "danger",
        onAction: askBulkDelete,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds]
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý tệp</h1>
          <p className={styles.subtitle}>
            Kho lưu trữ file đã tải lên. Mỗi thành viên có thể upload và xoá
            file của chính mình; Admin xoá được mọi file.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="primary"
            size="md"
            leftIcon={<CloudUploadIcon size={16} />}
            onClick={handleFilePickerOpen}
          >
            Tải file lên
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className={styles.hiddenFileInput}
            onChange={handleInputChange}
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
          />
        </div>
      </header>

      {/* ===== Storage Stats — chỉ Admin ===== */}
      <StorageStatsCard isAdmin={isAdmin} refreshKey={storageStatsRefreshKey} />

      {banner ? (
        <Alert
          variant={
            banner.type === "success"
              ? "success"
              : banner.type === "error"
                ? "error"
                : "info"
          }
          onClose={() => setBanner(null)}
        >
          {banner.text}
        </Alert>
      ) : null}

      {/* ===== Drag & Drop area + Upload Queue ===== */}
      <section className={styles.uploadSection}>
        <div
          className={[
            styles.dropzone,
            dragOver ? styles.dropzoneActive : "",
          ].join(" ")}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CloudUploadIcon size={28} />
          <p className={styles.dropTitle}>
            {dragOver ? "Thả file vào đây" : "Kéo-thả file hoặc"}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleFilePickerOpen}
          >
            Chọn file từ máy
          </Button>
          <p className={styles.dropHint}>
            Hỗ trợ: jpg, jpeg, png, pdf, doc, docx. Tối đa 10MB / file.
          </p>
        </div>
        <UploadQueue queue={uploadQueue} />
      </section>

      {/* ===== Table / Grid card ===== */}
      <div className={styles.tableCard}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Input
              placeholder="Tìm theo tên file..."
              value={filters.search}
              onChange={handleSearchInput}
              leftIcon={<Search size={16} />}
              rightIcon={filters.search ? <XIcon size={14} /> : undefined}
              onRightIconClick={filters.search ? clearSearch : undefined}
            />
          </div>

          <div className={styles.toolbarRight}>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${
                viewMode === "table" ? styles.viewToggleBtnActive : ""
              }`}
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}
              aria-label="Chế độ bảng"
              title="Xem dạng bảng"
            >
              <ListIcon size={14} />
              <span>Bảng</span>
            </button>
            <button
              type="button"
              className={`${styles.viewToggleBtn} ${
                viewMode === "grid" ? styles.viewToggleBtnActive : ""
              }`}
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              aria-label="Chế độ lưới"
              title="Xem dạng lưới"
            >
              <LayoutGrid size={14} />
              <span>Lưới</span>
            </button>
          </div>
        </div>

        {/* Filter panel toggle */}
        <div className={styles.advFilterToggle}>
          <button
            type="button"
            className={`${styles.advFilterBtn} ${
              filterPanelOpen ? styles.advFilterBtnActive : ""
            } ${isFiltered ? styles.advFilterBtnFiltering : ""}`}
            onClick={() => setFilterPanelOpen((v) => !v)}
            aria-expanded={filterPanelOpen}
          >
            <SlidersHorizontal size={14} />
            <span>Bộ lọc nâng cao</span>
            {isFiltered ? (
              <span className={styles.advFilterActive}>đang lọc</span>
            ) : null}
          </button>
          {isFiltered ? (
            <Button variant="ghost" size="sm" onClick={clearAdvancedFilters}>
              Xoá bộ lọc
            </Button>
          ) : null}
        </div>

        <FileFilterPanel
          open={filterPanelOpen}
          values={filters.advanced}
          onChange={handleFilterPanelChange}
          onClear={clearAdvancedFilters}
          isAdmin={isAdmin}
        />

        {/* Bulk action bar — chỉ hiển thị khi có selection */}
        <BulkActionBar
          selectedCount={selectedIds.length}
          itemLabel="file"
          loading={false}
          actions={bulkActions}
          onClearSelection={clearBulkSelection}
        />

        {/* Error state */}
        {loadError ? (
          <div className={styles.errorWrap}>
            <Alert variant="error">{loadError}</Alert>
            <Button variant="secondary" size="sm" onClick={loadList}>
              Thử lại
            </Button>
          </div>
        ) : viewMode === "table" ? (
          <>
            <FileTableView
              items={items}
              loading={loading}
              selectable
              selectedIds={selectedIds}
              onSelectedChange={setSelectedIds}
              sortConfig={filters.sort}
              onSortChange={handleSortChange}
              users={filteredUsers}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onOpenDetail={openDetail}
              onCopyLink={copyLink}
              onDownload={quickDownload}
              onAskDelete={askDelete}
              emptyState={emptyState}
            />
            {!loading && items.length > 0 ? (
              <div className={styles.tableFooter}>
                <span className={styles.totalLabel}>
                  Hiển thị <b>{items.length}</b> / <b>{total}</b> file
                </span>
                <Pagination
                  currentPage={filters.page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <FileGridView
              items={items}
              loading={loading}
              selectable
              selectedIds={selectedIds}
              onSelectedChange={setSelectedIds}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onOpenDetail={openDetail}
              onCopyLink={copyLink}
              onDownload={quickDownload}
              onAskDelete={askDelete}
              emptyState={emptyState}
            />
            {!loading && items.length > 0 ? (
              <div className={styles.tableFooter}>
                <span className={styles.totalLabel}>
                  Hiển thị <b>{items.length}</b> / <b>{total}</b> file
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

      {/* Detail modal */}
      <FileDetailModal
        open={detailOpen}
        file={detailFile}
        uploaderName={detailUploader?.fullName ?? null}
        uploaderEmail={detailUploader?.email ?? null}
        onClose={() => setDetailOpen(false)}
      />

      {/* Confirm dialog (xoá 1 file hoặc bulk) */}
      <ConfirmDialog
        open={confirm.open}
        loading={confirm.loading}
        title={
          confirm.mode === "bulk"
            ? `Xoá ${selectedIds.length} file?`
            : "Xoá file này?"
        }
        message={
          confirm.mode === "bulk" ? (
            <>
              Bạn sắp <b>xoá mềm</b> {selectedIds.length} file đã chọn. Hành
              động này sẽ chuyển chúng vào thùng rác và có thể khôi phục lại
              sau.
              <br />
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                Nếu trong danh sách có file bạn không có quyền xoá, thao tác
                sẽ thất bại rõ ràng với danh sách id bị từ chối.
              </span>
            </>
          ) : (
            `Hành động này sẽ chuyển file "${confirm.file?.originalName}" vào thùng rác. Admin có thể khôi phục lại sau.`
          )
        }
        confirmText={confirm.mode === "bulk" ? "Xoá tất cả" : "Xoá file"}
        cancelText="Huỷ"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() =>
          setConfirm({ open: false, loading: false, mode: "single", file: null })
        }
      />
    </div>
  );
}

// Re-export để dùng nơi khác nếu cần.
export { uploadFile };