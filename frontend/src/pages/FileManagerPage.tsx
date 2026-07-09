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
  FileIcon,
  Input,
  Pagination,
  Table,
  UploadZone,
  type TableColumn,
  type UploadItem,
} from "../components/ui";
import { FileDetailModal } from "../components/FileDetailModal";
import { Eye, Trash2, FolderOpen, Search, X as XIcon, UploadCloud } from "lucide-react";
import {
  FILE_PAGE_SIZE,
  deleteFile,
  getFiles,
  uploadFile,
  type UploadedFile,
} from "../lib/fileApi";
import {
  formatFileSize,
  getApiErrorMessage,
  getFileKind,
  getFileKindLabel,
  type FileKind,
  type FileValidationError,
} from "../lib/fileValidation";
import { listUsers, type User } from "../lib/userApi";
import { authStorage } from "../lib/authStorage";
import { useSearchParams } from "react-router-dom";
import styles from "./FileManagerPage.module.css";

interface FiltersState {
  search: string;
  searchApplied: string;
  kind: "all" | FileKind;
  page: number;
}

const INITIAL_FILTERS: FiltersState = {
  search: "",
  searchApplied: "",
  kind: "all",
  page: 1,
};

const KIND_BADGE_CLASS: Record<FileKind, string> = {
  image: styles.badgeImage ?? "",
  pdf: styles.badgePdf ?? "",
  word: styles.badgeWord ?? "",
  other: styles.badgeOther ?? "",
};

const KIND_FILTER_OPTIONS: { value: FiltersState["kind"]; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "image", label: "Ảnh" },
  { value: "pdf", label: "PDF" },
  { value: "word", label: "Word" },
];

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
  return Boolean(f.searchApplied) || f.kind !== "all";
}

function findUploader(
  users: User[],
  uploadedById: number
): { fullName: string; email: string } | null {
  const u = users.find((x) => String(x.id) === String(uploadedById));
  if (!u) return null;
  return { fullName: u.fullName, email: u.email };
}

export function FileManagerPage() {
  // ===== Auth =====
  const currentUser = authStorage.getUser();
  const isAdmin = currentUser?.role === "ADMIN";
  const currentUserId = currentUser?.id;

  // ===== URL sync =====
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<FiltersState>(() => {
    const initial: FiltersState = { ...INITIAL_FILTERS };
    const kind = searchParams.get("kind");
    if (kind === "image" || kind === "pdf" || kind === "word") {
      initial.kind = kind;
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

  useEffect(() => {
    const next: Record<string, string> = {};
    if (filters.searchApplied) next.search = filters.searchApplied;
    if (filters.kind !== "all") next.kind = filters.kind;
    if (filters.page > 1) next.page = String(filters.page);
    setSearchParams(next, { replace: true });
  }, [filters.searchApplied, filters.kind, filters.page, setSearchParams]);

  // ===== Data =====
  const [items, setItems] = useState<UploadedFile[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ===== Users (cho uploader) =====
  const [users, setUsers] = useState<User[]>([]);

  // ===== Upload + toast =====
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const lastSuccessCountRef = useRef(0);
  const lastInvalidCountRef = useRef(0);

  // ===== Detail modal =====
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailFile, setDetailFile] = useState<UploadedFile | null>(null);

  // ===== Delete confirm =====
  const [deleting, setDeleting] = useState<UploadedFile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ===== Load list =====
  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result: {
        items: UploadedFile[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      } = await getFiles({
        page: filters.page,
        pageSize: FILE_PAGE_SIZE,
      });
      // Client-side filter search + kind (BE không hỗ trợ).
      let filtered = result.items;
      if (filters.searchApplied) {
        const s = filters.searchApplied.toLowerCase();
        filtered = filtered.filter((f) =>
          f.originalName.toLowerCase().includes(s)
        );
      }
      if (filters.kind !== "all") {
        filtered = filtered.filter(
          (f) => getFileKind(f.originalName || f.mimeType) === filters.kind
        );
      }
      setItems(filtered);
      setTotal(filtered.length);
      setTotalPages(Math.max(1, Math.ceil(filtered.length / FILE_PAGE_SIZE)));
    } catch (err) {
      const message = getApiErrorMessage(err, "Không tải được danh sách file");
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [filters.page, filters.searchApplied, filters.kind]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // ===== Load users (chỉ Admin thấy user khác, cần cho cột "Người upload") =====
  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      try {
        const result = await listUsers({});
        if (cancelled) return;
        const list = Array.isArray(result.users) ? result.users : [];
        const active = list.filter((u) => !u.deletedAt);
        active.sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
        setUsers(active);
      } catch {
        // Không block UI — fallback hiện "ID: <number>".
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
  function handleKindChange(e: ChangeEvent<HTMLSelectElement>) {
    setFilters((prev) => ({
      ...prev,
      kind: e.target.value as FiltersState["kind"],
      page: 1,
    }));
  }
  function clearAllFilters() {
    setFilters({ ...INITIAL_FILTERS });
  }
  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function openUpload() {
    setUploadOpen((v) => !v);
    setAlertMessage(null);
  }

  async function handleUploadOne(file: File): Promise<void> {
    await uploadFile(file);
    // Cập nhật số success để hiện Alert khi onItemsChange thấy batch kết thúc.
    lastSuccessCountRef.current += 1;
  }

  function handleInvalid(errors: { file: File; error: FileValidationError }[]) {
    lastInvalidCountRef.current += errors.length;
    setAlertMessage({
      type: "error",
      text: `Bỏ qua ${errors.length} file không hợp lệ: ${errors
        .map((e) => e.error.message)
        .join("; ")}`,
    });
  }

  function handleUploadQueueChange(queue: UploadItem[]) {
    // Khi queue vừa được clear hết (thành công + lỗi xử lý xong),
    // refresh list + tổng kết.
    const isAllDone =
      queue.length > 0 &&
      queue.every((q) => q.status === "success" || q.status === "error");
    const hadInFlight = queue.some(
      (q) => q.status === "uploading" || q.status === "pending"
    );
    if (isAllDone && !hadInFlight) {
      const successCount = lastSuccessCountRef.current;
      const invalidCount = lastInvalidCountRef.current;
      lastSuccessCountRef.current = 0;
      lastInvalidCountRef.current = 0;
      if (successCount > 0 || invalidCount > 0) {
        const parts: string[] = [];
        if (successCount > 0) parts.push(`Đã tải lên ${successCount} file thành công`);
        if (invalidCount > 0) parts.push(`${invalidCount} file bị từ chối`);
        setAlertMessage({
          type: successCount > 0 ? "success" : "info",
          text: parts.join(" · "),
        });
      }
      void loadList();
      setUploading(false);
    } else if (queue.some((q) => q.status === "uploading")) {
      setUploading(true);
    }
  }

  function openDetail(file: UploadedFile) {
    setDetailFile(file);
    setDetailOpen(true);
  }

  function askDelete(file: UploadedFile) {
    setDeleting(file);
  }
  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteFile(deleting.id);
      setDeleting(null);
      setAlertMessage({ type: "success", text: `Đã xoá file "${deleting.originalName}".` });
      void loadList();
    } catch (err) {
      const message = getApiErrorMessage(err, "Không xoá được file");
      setAlertMessage({ type: "error", text: message });
    } finally {
      setDeleteLoading(false);
    }
  }

  function canDelete(file: UploadedFile): boolean {
    if (isAdmin) return true;
    if (!currentUserId) return false;
    return String(file.uploadedById) === String(currentUserId);
  }

  // ===== Columns =====
  const columns: TableColumn<UploadedFile>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Tên file",
        minWidth: 280,
        render: (file) => {
          const kind = getFileKind(file.originalName || file.mimeType);
          return (
            <div className={styles.nameCell}>
              <FileIcon
                filename={file.originalName}
                mimeType={file.mimeType}
                kind={kind}
                size={20}
              />
              <button
                type="button"
                className={styles.nameLink}
                onClick={() => openDetail(file)}
                title={file.originalName}
              >
                {file.originalName}
              </button>
            </div>
          );
        },
      },
      {
        key: "kind",
        header: "Loại",
        render: (file) => {
          const kind = getFileKind(file.originalName || file.mimeType);
          return (
            <span className={[styles.badge, KIND_BADGE_CLASS[kind]].join(" ")}>
              {getFileKindLabel(kind)}
            </span>
          );
        },
      },
      {
        key: "size",
        header: "Kích thước",
        render: (file) => (
          <span className={styles.sizeCell}>{formatFileSize(file.size)}</span>
        ),
      },
      {
        key: "uploader",
        header: "Người upload",
        render: (file) => {
          const u = findUploader(users, file.uploadedById);
          return (
            <div className={styles.uploaderCell}>
              <span className={styles.uploaderName}>
                {u?.fullName ?? `ID: ${file.uploadedById}`}
              </span>
              {u ? <span className={styles.uploaderEmail}>{u.email}</span> : null}
            </div>
          );
        },
      },
      {
        key: "createdAt",
        header: "Thời gian",
        render: (file) => (
          <span className={styles.timeCell}>{formatDateTime(file.createdAt)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (file) => {
          const allowed = canDelete(file);
          return (
            <div className={styles.actionCell}>
              <button
                type="button"
                className={[styles.iconBtn, styles.iconBtnView].join(" ")}
                onClick={() => openDetail(file)}
                title="Xem thông tin"
                aria-label="Xem thông tin"
              >
                <Eye size={16} />
              </button>
              {allowed ? (
                <button
                  type="button"
                  className={[styles.iconBtn, styles.iconBtnDanger].join(" ")}
                  onClick={() => askDelete(file)}
                  title="Xoá file"
                  aria-label="Xoá file"
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users, isAdmin, currentUserId]
  );

  const filtered = isFiltersActive(filters);
  const detailUploader = detailFile
    ? findUploader(users, detailFile.uploadedById)
    : null;

  const emptyState = (
    <div className={styles.emptyState}>
      <FolderOpen size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        {filtered ? "Không tìm thấy file phù hợp" : "Chưa có file nào"}
      </p>
      <p className={styles.emptyHint}>
        {filtered
          ? "Thử bỏ bớt bộ lọc hoặc thay đổi từ khoá tìm kiếm."
          : "Bấm nút \"Tải file lên\" để thêm file đầu tiên vào hệ thống."}
      </p>
    </div>
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
            variant={uploadOpen ? "secondary" : "primary"}
            leftIcon={<UploadCloud size={16} />}
            onClick={openUpload}
          >
            {uploadOpen ? "Đóng vùng upload" : "Tải file lên"}
          </Button>
        </div>
      </header>

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

      {uploadOpen ? (
        <section className={styles.uploadSection}>
          <UploadZone
            onUpload={handleUploadOne}
            onInvalid={handleInvalid}
            onItemsChange={handleUploadQueueChange}
            multiple
            disabled={uploading && false}
            showQueue
          />
        </section>
      ) : null}

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

          <label className={styles.filterLabel}>
            <span>Loại</span>
            <select
              className={styles.select}
              value={filters.kind}
              onChange={handleKindChange}
            >
              {KIND_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {filtered ? (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Xoá bộ lọc
            </Button>
          ) : null}
        </div>

        {/* Body */}
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
              rowKey={(f) => f.id}
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

      <FileDetailModal
        open={detailOpen}
        file={detailFile}
        uploaderName={detailUploader?.fullName ?? null}
        uploaderEmail={detailUploader?.email ?? null}
        onClose={() => setDetailOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xoá file này?"
        message={
          deleting
            ? `Hành động này sẽ chuyển file "${deleting.originalName}" vào thùng rác. Admin có thể khôi phục lại sau.`
            : ""
        }
        confirmText="Xoá file"
        cancelText="Huỷ"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}