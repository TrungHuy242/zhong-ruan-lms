import {
  ChangeEvent,
  Fragment,
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
} from "../../shared/components/ui";
import { ApiError } from "../../shared/lib/api";
import {
  TRASH_MODULE_LABELS,
  TRASH_MODULES,
  forceDeleteFile,
  forceDeleteNotification,
  forceDeleteUser,
  loadTrash,
  restoreFile,
  restoreNotification,
  restoreUser,
  type LoadTrashResult,
  type TrashItem,
  type TrashModule,
} from "./trashApi";
import { authStorage } from "../../shared/lib/authStorage";
import {
  Bell,
  FileText,
  RotateCcw,
  Search as SearchIcon,
  Trash2,
  User as UserIcon,
  X as XIcon,
  Inbox,
  AlertTriangle,
} from "lucide-react";
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

const MODULE_TONE: Record<TrashModule, string> = {
  users: styles.badgeUser,
  notifications: styles.badgeNotification,
  files: styles.badgeFile,
};

const MODULE_ICON: Record<TrashModule, React.ReactNode> = {
  users: <UserIcon size={14} />,
  notifications: <Bell size={14} />,
  files: <FileText size={14} />,
};

/**
 * Highlight từ khoá xuất hiện trong `text`.
 */
function highlight(text: string, keyword: string): React.ReactNode {
  if (!text) return text;
  const kw = keyword.trim();
  if (!kw) return text;
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(re);
  return parts.map((part, idx) => {
    if (part.toLowerCase() === kw.toLowerCase()) {
      return (
        <mark key={idx} className={styles.highlight}>
          {part}
        </mark>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

// ===== Constants =====
const PAGE_SIZE = 10;
const DEBOUNCE_MS = 350;

type ConfirmKind = "restore" | "force" | null;

export function TrashManagerPage() {
  const currentUser = authStorage.getUser();
  const isAdmin = currentUser?.role === "ADMIN";

  // ===== Filter state =====
  const [module, setModule] = useState<TrashModule | "all">("all");
  const [search, setSearch] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [page, setPage] = useState(1);

  // ===== Data state =====
  const [raw, setRaw] = useState<TrashItem[]>([]);
  const [totals, setTotals] = useState<Record<TrashModule, number>>({
    users: 0,
    notifications: 0,
    files: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ===== Action state =====
  const [actionItem, setActionItem] = useState<TrashItem | null>(null);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ===== Server-paged mode (cho notif/file khi lọc theo module) =====
  // Khi module=notifications/files: server-side phân trang, search vẫn FE.
  // Khi module=users/all: client-side phân trang toàn bộ.

  const isServerPaged = module === "notifications" || module === "files";

  // Debounce search.
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setSearchApplied((prev) => (prev === search ? prev : search));
      setPage(1);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Reset page khi đổi module.
  useEffect(() => {
    setPage(1);
  }, [module]);

  // ===== Load =====
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result: LoadTrashResult = await loadTrash({
        module: module === "all" ? undefined : module,
        page: isServerPaged ? page : 1,
        pageSize: PAGE_SIZE,
      });
      setRaw(result.items);
      setTotals(result.totals);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được thùng rác";
      setLoadError(message);
      setRaw([]);
    } finally {
      setLoading(false);
    }
  }, [module, page, isServerPaged]);

  useEffect(() => {
    void load();
  }, [load]);

  // ===== Client-side filter + paginate cho all/users =====
  const filteredItems = useMemo(() => {
    if (isServerPaged) return raw;
    const kw = searchApplied.trim().toLowerCase();
    let list = raw;
    if (kw) {
      list = list.filter((it) => {
        const haystack = `${it.name} ${it.description}`.toLowerCase();
        return haystack.includes(kw);
      });
    }
    return list;
  }, [raw, searchApplied, isServerPaged]);

  const clientTotal = filteredItems.length;
  const clientTotalPages = Math.max(1, Math.ceil(clientTotal / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), clientTotalPages);
  const pagedItems = useMemo(() => {
    if (isServerPaged) return raw;
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, safePage, isServerPaged, raw]);

  // Total đang hiển thị:
  // - Server-paged: tổng module tương ứng (BE trả)
  // - Client-paged: clientTotal
  const displayTotal = isServerPaged
    ? module === "notifications"
      ? totals.notifications
      : totals.files
    : clientTotal;
  const totalPages = isServerPaged ? Math.max(1, Math.ceil(displayTotal / PAGE_SIZE)) : clientTotalPages;

  // ===== Handlers =====
  function handleModuleChange(e: ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    if (v === "all") setModule("all");
    else setModule(v as TrashModule);
  }
  function clearSearch() {
    setSearch("");
    setSearchApplied("");
    setPage(1);
  }
  function handlePageChange(p: number) {
    setPage(p);
  }

  function askRestore(item: TrashItem) {
    setActionItem(item);
    setActionError(null);
    setConfirmKind("restore");
  }
  function askForce(item: TrashItem) {
    setActionItem(item);
    setActionError(null);
    setConfirmKind("force");
  }
  function closeConfirm() {
    if (actionLoading) return;
    setActionItem(null);
    setConfirmKind(null);
    setActionError(null);
  }

  async function doRestore() {
    if (!actionItem) return;
    setActionLoading(true);
    setActionError(null);
    try {
      let msg = "";
      if (actionItem.module === "users") {
        await restoreUser(actionItem.id);
        msg = "Khôi phục người dùng thành công";
      } else if (actionItem.module === "notifications") {
        await restoreNotification(actionItem.id);
        msg = "Khôi phục thông báo thành công";
      } else {
        await restoreFile(actionItem.id);
        msg = "Khôi phục tệp thành công";
      }
      setSuccessMsg(msg);
      closeConfirm();
      await load();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không thể khôi phục";
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  }

  async function doForceDelete() {
    if (!actionItem) return;
    setActionLoading(true);
    setActionError(null);
    try {
      let msg = "";
      if (actionItem.module === "users") {
        await forceDeleteUser(actionItem.id);
        msg = "Đã xóa cứng người dùng";
      } else if (actionItem.module === "notifications") {
        await forceDeleteNotification(actionItem.id);
        msg = "Đã xóa cứng thông báo";
      } else {
        await forceDeleteFile(actionItem.id);
        msg = "Đã xóa cứng tệp";
      }
      setSuccessMsg(msg);
      closeConfirm();
      await load();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không thể xóa cứng";
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  }

  // Tự động ẩn success sau 4s.
  useEffect(() => {
    if (!successMsg) return;
    const t = window.setTimeout(() => setSuccessMsg(null), 4000);
    return () => window.clearTimeout(t);
  }, [successMsg]);

  // ===== Columns =====
  const columns: TableColumn<TrashItem>[] = useMemo(
    () => [
      {
        key: "module",
        header: "Module",
        render: (it) => (
          <span className={[styles.badge, MODULE_TONE[it.module]].join(" ")}>
            {MODULE_ICON[it.module]}
            {TRASH_MODULE_LABELS[it.module]}
          </span>
        ),
      },
      {
        key: "name",
        header: "Tên đối tượng",
        render: (it) => (
          <div className={styles.nameCell}>
            <span className={styles.name}>{highlight(it.name, searchApplied)}</span>
            <span className={styles.description}>
              {highlight(it.description, searchApplied)}
            </span>
          </div>
        ),
      },
      {
        key: "deletedBy",
        header: "Người xoá",
        render: (it) => {
          if (it.module === "users") return <span className={styles.dim}>—</span>;
          const id = it.deletedBy ?? null;
          return <span className={styles.cellText}>#{id ?? "—"}</span>;
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
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw size={14} />}
              onClick={() => askRestore(it)}
            >
              Khôi phục
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={() => askForce(it)}
            >
              Xóa cứng
            </Button>
          </div>
        ),
      },
    ],
    [searchApplied]
  );

  // ===== Empty state =====
  const isFiltered = module !== "all" || searchApplied.trim() !== "";
  const initialEmpty = (
    <div className={styles.emptyState}>
      <Inbox size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>Thùng rác đang trống</p>
      <p className={styles.emptyHint}>
        Khi người dùng, thông báo hoặc tệp bị xoá mềm, chúng sẽ xuất hiện ở đây
        để bạn khôi phục hoặc xoá vĩnh viễn.
      </p>
    </div>
  );
  const noResultEmpty = (
    <div className={styles.emptyState}>
      <Inbox size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        Không có bản ghi trong thùng rác
        {searchApplied.trim() ? ` khớp với "${searchApplied.trim()}"` : ""}
      </p>
      <p className={styles.emptyHint}>
        Thử bỏ bộ lọc, đổi module hoặc xoá từ khoá để xem các mục khác.
      </p>
    </div>
  );

  const showEmpty =
    !loading &&
    !loadError &&
    pagedItems.length === 0 &&
    (isFiltered ? noResultEmpty : initialEmpty);

  // ===== Confirm messages =====
  const restoreConfirm = actionItem ? (
    <>
      Khôi phục <b>{actionItem.name}</b> ({TRASH_MODULE_LABELS[actionItem.module]})?
      Bản ghi sẽ xuất hiện lại trong danh sách tương ứng.
    </>
  ) : null;
  const forceConfirm = actionItem ? (
    <>
      <span className={styles.dangerLine}>
        <AlertTriangle size={16} aria-hidden="true" />
        Hành động này KHÔNG thể hoàn tác.
      </span>
      Bạn sắp xoá vĩnh viễn <b>{actionItem.name}</b> (
      {TRASH_MODULE_LABELS[actionItem.module]}) khỏi hệ thống.
      {actionItem.module === "files"
        ? " File vật lý trên ổ đĩa cũng sẽ bị xoá."
        : null}
    </>
  ) : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <Trash2 size={24} className={styles.titleIcon} aria-hidden="true" />
            Thùng rác hệ thống
          </h1>
          <p className={styles.subtitle}>
            Khôi phục hoặc xoá vĩnh viễn các bản ghi đã bị soft-delete trên toàn
            hệ thống. Mỗi hành động đều được xác nhận trước khi thực thi.
          </p>
        </div>
        {!isAdmin ? (
          <Alert variant="warning">
            Bạn chỉ có thể khôi phục/xoá cứng thông báo và tệp của chính mình.
          </Alert>
        ) : null}
      </header>

      <div className={styles.tableCard}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Input
              placeholder="Tìm theo tên, email, nội dung thông báo, tên tệp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<SearchIcon size={16} />}
              rightIcon={search ? <XIcon size={14} /> : undefined}
              onRightIconClick={search ? clearSearch : undefined}
            />
          </div>

          <label className={styles.filterLabel}>
            <span>Module</span>
            <select
              className={styles.select}
              value={module}
              onChange={handleModuleChange}
            >
              <option value="all">Tất cả</option>
              {TRASH_MODULES.map((m) => (
                <option key={m} value={m}>
                  {TRASH_MODULE_LABELS[m]}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.summary}>
            <span className={styles.summaryChip}>
              <UserIcon size={12} />
              <b>{totals.users}</b> người dùng
            </span>
            <span className={styles.summaryChip}>
              <Bell size={12} />
              <b>{totals.notifications}</b> thông báo
            </span>
            <span className={styles.summaryChip}>
              <FileText size={12} />
              <b>{totals.files}</b> tệp
            </span>
          </div>
        </div>

        {/* Success toast */}
        {successMsg ? (
          <div className={styles.successWrap}>
            <Alert variant="success">{successMsg}</Alert>
          </div>
        ) : null}

        {/* Error */}
        {loadError ? (
          <div className={styles.errorWrap}>
            <Alert variant="error">{loadError}</Alert>
            <Button variant="secondary" size="sm" onClick={load}>
              Thử lại
            </Button>
          </div>
        ) : showEmpty ? (
          <div className={styles.emptyWrap}>{showEmpty}</div>
        ) : (
          <>
            <Table
              columns={columns}
              data={pagedItems}
              loading={loading}
              skeletonRows={6}
              rowKey={(it) => it.compositeKey}
              emptyState={null}
            />

            {displayTotal > 0 ? (
              <div className={styles.tableFooter}>
                <span className={styles.totalLabel}>
                  Hiển thị <b>{pagedItems.length}</b> / <b>{displayTotal}</b> bản
                  ghi
                </span>
                <Pagination
                  currentPage={isServerPaged ? page : safePage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmKind === "restore" && actionItem !== null}
        title="Khôi phục bản ghi"
        message={restoreConfirm}
        confirmText="Khôi phục"
        confirmVariant="primary"
        loading={actionLoading}
        onConfirm={doRestore}
        onCancel={closeConfirm}
      />
      <ConfirmDialog
        open={confirmKind === "force" && actionItem !== null}
        title="Xoá vĩnh viễn"
        message={forceConfirm}
        confirmText="Xóa cứng"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={doForceDelete}
        onCancel={closeConfirm}
      />
      {actionError ? (
        <div className={styles.floatingError}>
          <Alert variant="error">{actionError}</Alert>
        </div>
      ) : null}
    </div>
  );
}