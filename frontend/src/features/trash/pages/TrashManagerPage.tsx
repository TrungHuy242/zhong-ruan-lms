/**
 * TrashManagerPage — trang quản lý thùng rác hệ thống (SaaS-style).
 *
 * Tính năng (theo yêu cầu nâng cấp):
 *   - 4 module: Users / Notifications / Files / Settings (endpoint thống nhất /api/trash).
 *   - Filter: module, người xoá (deletedById), khoảng thời gian (from/to), keyword.
 *   - Bulk action: chọn nhiều → restore / force-delete 1 lần (qua ConfirmDialog).
 *   - Audit log: BE tự ghi cho Restore / Bulk Restore / Force Delete / Bulk Force Delete.
 *   - Hiển thị: Module, Label, Người xoá (actor email/role), Thời gian xoá.
 *   - Loading skeleton, empty state (chưa có gì / không match filter), error + Retry.
 *
 * Dùng V2 API (listTrashV2, restoreItem, forceDeleteItem, bulkRestore, bulkForceDelete).
 * API cũ (loadTrash + restoreX/forceDeleteX) vẫn export nhưng không dùng ở đây.
 */

import { ChangeEvent, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Input,
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
  listTrashV2,
  restoreItem,
  type BulkTrashItem,
  type ListTrashV2Params,
  type TrashItemV2,
  type TrashModule,
} from "../services/trashApi";
import { authStorage } from "../../../shared/storage/authStorage";
import {
  Bell,
  Calendar,
  CheckSquare,
  Filter,
  FileText,
  Inbox,
  RotateCcw,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Square,
  Trash2,
  User as UserIcon,
  X as XIcon,
  AlertTriangle,
  RotateCcw as RestoreIcon,
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

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giảng viên",
  STUDENT: "Học viên",
};

const MODULE_TONE: Record<TrashModule, string> = {
  users: styles.badgeUser,
  notifications: styles.badgeNotification,
  files: styles.badgeFile,
  settings: styles.badgeSetting,
};

const MODULE_ICON: Record<TrashModule, React.ReactNode> = {
  users: <UserIcon size={14} aria-hidden="true" />,
  notifications: <Bell size={14} aria-hidden="true" />,
  files: <FileText size={14} aria-hidden="true" />,
  settings: <SettingsIcon size={14} aria-hidden="true" />,
};

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

// ===== Component =====
const DEBOUNCE_MS = 400;

type ConfirmKind = "single-restore" | "single-force" | "bulk-restore" | "bulk-force" | null;

export function TrashManagerPage() {
  const currentUser = authStorage.getUser();
  const isAdmin = currentUser?.role === "ADMIN";

  // ===== Filter state =====
  const [moduleFilter, setModuleFilter] = useState<TrashModule | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [keywordApplied, setKeywordApplied] = useState("");
  const [deletedById, setDeletedById] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState(1);

  // ===== Data state =====
  const [items, setItems] = useState<TrashItemV2[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ===== Selection =====
  const [selected, setSelected] = useState<Set<string>>(new Set()); // key = `${module}:${idOrKey}`

  // ===== Action state =====
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [singleTarget, setSingleTarget] = useState<TrashItemV2 | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ===== Debounce keyword =====
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setKeywordApplied((prev) => (prev === keyword ? prev : keyword));
      setPage(1);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [keyword]);

  // Reset page khi filter chính đổi.
  useEffect(() => {
    setPage(1);
  }, [moduleFilter, deletedById, fromDate, toDate]);

  // Reset selection khi data thay đổi (tránh selection rỗng trỏ vào item cũ).
  useEffect(() => {
    setSelected(new Set());
  }, [items.length, moduleFilter, keywordApplied, deletedById, fromDate, toDate]);

  // ===== Load =====
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: ListTrashV2Params = {
        module: moduleFilter === "all" ? null : moduleFilter,
        keyword: keywordApplied || null,
        deletedById: deletedById ? Number(deletedById) : null,
        from: fromDate ? `${fromDate}T00:00:00.000Z` : null,
        to: toDate ? `${toDate}T23:59:59.999Z` : null,
        page,
        limit: TRASH_PAGE_SIZE_DEFAULT,
      };
      const result = await listTrashV2(params);
      setItems(result.items);
      setTotal(result.pagination.total);
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
    } finally {
      setLoading(false);
    }
  }, [moduleFilter, keywordApplied, deletedById, fromDate, toDate, page]);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto-clear success after 4s.
  useEffect(() => {
    if (!successMsg) return;
    const t = window.setTimeout(() => setSuccessMsg(null), 4000);
    return () => window.clearTimeout(t);
  }, [successMsg]);

  // ===== Filter helpers =====
  const totalPages = total > 0 ? Math.ceil(total / TRASH_PAGE_SIZE_DEFAULT) : 1;
  const safePage = Math.min(Math.max(1, page), totalPages);

  function handleModuleChange(e: ChangeEvent<HTMLSelectElement>) {
    setModuleFilter(e.target.value as TrashModule | "all");
  }
  function handleDeletedByChange(e: ChangeEvent<HTMLInputElement>) {
    setDeletedById(e.target.value);
  }
  function handleFromChange(e: ChangeEvent<HTMLInputElement>) {
    setFromDate(e.target.value);
  }
  function handleToChange(e: ChangeEvent<HTMLInputElement>) {
    setToDate(e.target.value);
  }
  function clearAllFilters() {
    setModuleFilter("all");
    setKeyword("");
    setKeywordApplied("");
    setDeletedById("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }
  function handlePageChange(p: number) {
    setPage(p);
  }

  // ===== Selection =====
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

  // ===== Action =====
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
      setSuccessMsg(`Khôi phục "${it.label}" thành công`);
      closeConfirm();
      clearSelection();
      await load();
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
      setSuccessMsg(`Đã xoá vĩnh viễn "${it.label}"`);
      closeConfirm();
      clearSelection();
      await load();
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
        setSuccessMsg(`Khôi phục hàng loạt thành công ${result.success}/${result.total} bản ghi`);
      } else {
        setSuccessMsg(
          `Khôi phục hàng loạt: ${result.success} thành công, ${result.failed} thất bại`
        );
        setActionError(
          failedDetail.length > 0
            ? failedDetail.map((r) => `${r.module}:${r.key ?? r.id} — ${r.error}`).join("\n")
            : null
        );
      }
      closeConfirm();
      clearSelection();
      await load();
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
        setSuccessMsg(`Đã xoá vĩnh viễn ${result.success}/${result.total} bản ghi`);
      } else {
        setSuccessMsg(
          `Xoá vĩnh viễn hàng loạt: ${result.success} thành công, ${result.failed} thất bại`
        );
        setActionError(
          failedDetail.length > 0
            ? failedDetail.map((r) => `${r.module}:${r.key ?? r.id} — ${r.error}`).join("\n")
            : null
        );
      }
      closeConfirm();
      clearSelection();
      await load();
    } catch (err) {
      setActionError(errorMessage(err, "Không thể xoá hàng loạt"));
    } finally {
      setActionLoading(false);
    }
  }

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
          <span className={[styles.badge, MODULE_TONE[it.module]].join(" ")}>
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
            <span className={styles.name}>{highlight(it.label, keywordApplied)}</span>
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
              <span className={styles.actorName}>{highlight(it.deletedBy.fullName, keywordApplied)}</span>
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
              variant="secondary"
              size="sm"
              leftIcon={<RestoreIcon size={14} />}
              onClick={() => askSingleRestore(it)}
            >
              Khôi phục
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={() => askSingleForce(it)}
            >
              Xoá cứng
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keywordApplied, items, selected]
  );

  // ===== Empty state =====
  const isFiltered =
    moduleFilter !== "all" ||
    keywordApplied.trim() !== "" ||
    deletedById !== "" ||
    fromDate !== "" ||
    toDate !== "";
  const initialEmpty = (
    <div className={styles.emptyState}>
      <Inbox size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>Thùng rác đang trống</p>
      <p className={styles.emptyHint}>
        Khi người dùng, thông báo, tệp hoặc cấu hình bị xoá mềm, chúng sẽ xuất hiện
        ở đây để bạn khôi phục hoặc xoá vĩnh viễn. Mỗi hành động đều được ghi Audit Log.
      </p>
    </div>
  );
  const noResultEmpty = (
    <div className={styles.emptyState}>
      <Inbox size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        Không có bản ghi trong thùng rác
        {keywordApplied.trim() ? ` khớp với "${keywordApplied.trim()}"` : ""}
      </p>
      <p className={styles.emptyHint}>
        Thử bỏ bộ lọc, đổi module, khoảng thời gian hoặc xoá từ khoá.
      </p>
    </div>
  );

  const showEmpty = !loading && !loadError && items.length === 0;
  const emptyContent = isFiltered ? noResultEmpty : initialEmpty;

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
        {!isAdmin ? (
          <Alert variant="warning">
            Bạn cần quyền Admin để truy cập Thùng rác hệ thống. Vui lòng liên hệ admin.
          </Alert>
        ) : null}
      </header>

      <Card padding="md" className={styles.tableCard}>
        {/* Toolbar — Filter row */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Input
              placeholder="Tìm theo tên, email, tiêu đề, tên tệp hoặc key cấu hình..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              leftIcon={<SearchIcon size={16} aria-hidden="true" />}
              rightIcon={keyword ? <XIcon size={14} aria-hidden="true" /> : undefined}
              onRightIconClick={keyword ? () => setKeyword("") : undefined}
            />
          </div>

          <label className={styles.filterLabel}>
            <Filter size={14} aria-hidden="true" />
            <span>Module</span>
            <select
              className={styles.select}
              value={moduleFilter}
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

          <label className={styles.filterLabel}>
            <UserIcon size={14} aria-hidden="true" />
            <span>Người xoá (ID)</span>
            <input
              type="number"
              min={1}
              className={styles.input}
              placeholder="VD: 8"
              value={deletedById}
              onChange={handleDeletedByChange}
            />
          </label>

          <label className={styles.filterLabel}>
            <Calendar size={14} aria-hidden="true" />
            <span>Từ ngày</span>
            <input
              type="date"
              className={styles.input}
              value={fromDate}
              onChange={handleFromChange}
            />
          </label>

          <label className={styles.filterLabel}>
            <Calendar size={14} aria-hidden="true" />
            <span>Đến ngày</span>
            <input
              type="date"
              className={styles.input}
              value={toDate}
              onChange={handleToChange}
            />
          </label>

          {isFiltered ? (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Xoá bộ lọc
            </Button>
          ) : null}
        </div>

        {/* Bulk action bar */}
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
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Thử lại
            </Button>
          </div>
        ) : showEmpty ? (
          <div className={styles.emptyWrap}>{emptyContent}</div>
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
                  {isFiltered ? " (đang lọc)" : ""}
                </span>
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            ) : null}
          </>
        )}
      </Card>

      {/* Confirm dialogs */}
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

// ===== Helpers =====
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}