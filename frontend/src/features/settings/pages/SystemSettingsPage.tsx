/**
 * SystemSettingsPage — trang quản lý cấu hình hệ thống (SaaS Admin).
 *
 * Layout:
 *   - Header: tiêu đề + CTA (Thêm cấu hình, Import, Export)
 *   - 2 cột (responsive): sidebar nhóm (trái) + main content (phải)
 *   - Main content: toolbar search + table/list cấu hình
 *
 * Quyết định thiết kế:
 *   - Search debounce 450ms, truyền lên BE (BE filter key/description/value).
 *   - Sidebar filter client-side theo `group` (BE chỉ trả 1 group mỗi lần).
 *   - Switch sang group mới → reload với param `group` (BE filter exact match).
 *   - Quick-edit inline qua SettingEditor (boolean Switch / number / text / longText).
 *   - JSON kind chỉ mở modal để sửa (an toàn, tránh hỏng cấu trúc).
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
  type TableColumn,
} from "../../../shared/components/ui";
import { Table } from "../../../shared/components/ui/Table";
import { Pagination } from "../../../shared/components/ui/Pagination";
import { SettingDetailModal } from "../components/SettingDetailModal";
import { SettingEditor } from "../components/SettingEditor";
import { SettingModal, type SettingModalMode } from "../components/SettingModal";
import {
  SettingsSidebar,
  type GroupFilter,
  type SettingsSidebarCounts,
} from "../components/SettingsSidebar";
import {
  Download,
  Eye,
  Plus,
  Search,
  Settings as SettingsIcon,
  Trash2,
  Upload as UploadIcon,
  X as XIcon,
} from "lucide-react";
import {
  deleteSetting,
  exportSettings,
  getSettings,
  importSettings,
  updateSetting,
  type ImportSettingsPayload,
  type Setting,
  type SettingGroup,
} from "../services/settingApi";
import { ApiError } from "../../../shared/api";
import { getApiErrorMessage } from "../../../shared/validation/fileValidation";
import { authStorage } from "../../../shared/storage/authStorage";
import styles from "./SystemSettingsPage.module.css";

interface FiltersState {
  /** Giá trị đang gõ trong input — update ngay khi gõ. */
  searchInput: string;
  /** Giá trị search thật sự được apply (sau debounce). */
  searchApplied: string;
  /** Group filter — gửi lên BE. */
  group: GroupFilter;
  page: number;
}

const INITIAL_FILTERS: FiltersState = {
  searchInput: "",
  searchApplied: "",
  group: "All",
  page: 1,
};

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 450;

const GROUP_LABEL_FOR_DISPLAY: Record<SettingGroup, string> = {
  General: "Chung",
  Security: "Bảo mật",
  Upload: "Tải lên",
  Notification: "Thông báo",
  System: "Hệ thống",
};

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

// ===== Helper: map GroupFilter → BE param =====
function groupFilterToApiParam(g: GroupFilter): SettingGroup | null {
  if (g === "All" || g === "Ungrouped") return null;
  return g as SettingGroup;
}

// ===== Helper: search query cho BE — luôn gửi search keyword lên. =====
function shouldUseSearchApi(search: string): boolean {
  return Boolean(search && search.trim());
}

export function SystemSettingsPage() {
  // ===== Auth =====
  const currentUser = authStorage.getUser();
  const isAdmin = currentUser?.role === "ADMIN";

  // ===== Filter state =====
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);

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

  // ===== Toast =====
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // ===== Import / Export =====
  const [exportLoading, setExportLoading] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importReplace, setImportReplace] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== Debounce search =====
  useEffect(() => {
    if (filters.searchInput === filters.searchApplied) return;
    const t = window.setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        searchApplied: prev.searchInput,
        page: 1,
      }));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [filters.searchInput, filters.searchApplied]);

  // ===== Load list =====
  const loadList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const apiGroup = groupFilterToApiParam(filters.group);
      const items = await getSettings({
        group: apiGroup,
        search: shouldUseSearchApi(filters.searchApplied)
          ? filters.searchApplied
          : null,
      });
      setAllItems(items);
    } catch (err) {
      const message = getApiErrorMessage(err, "Không tải được danh sách cấu hình");
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [filters.group, filters.searchApplied]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  // ===== Counts cho sidebar =====
  const counts: SettingsSidebarCounts = useMemo(() => {
    const byGroup: Record<SettingGroup, number> = {
      General: 0,
      Security: 0,
      Upload: 0,
      Notification: 0,
      System: 0,
    };
    let ungrouped = 0;
    for (const s of allItems) {
      if (s.group && byGroup[s.group] !== undefined) byGroup[s.group] += 1;
      else ungrouped += 1;
    }
    return { total: allItems.length, byGroup, ungrouped };
  }, [allItems]);

  // ===== Khi đã chọn "Ungrouped" → filter client-side =====
  const visibleItems = useMemo(() => {
    if (filters.group === "Ungrouped") {
      return allItems.filter((s) => !s.group);
    }
    return allItems;
  }, [allItems, filters.group]);

  // ===== Pagination =====
  const total = visibleItems.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (filters.page - 1) * PAGE_SIZE;
  const pageItems = visibleItems.slice(start, start + PAGE_SIZE);

  // ===== Handlers =====
  function handleSearchInput(e: ChangeEvent<HTMLInputElement>) {
    setFilters((prev) => ({ ...prev, searchInput: e.target.value }));
  }
  function clearSearch() {
    setFilters((prev) => ({ ...prev, searchInput: "", searchApplied: "", page: 1 }));
  }
  function handleGroupSelect(g: GroupFilter) {
    setFilters((prev) => ({ ...prev, group: g, page: 1 }));
  }
  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }));
  }

  function openCreate() {
    setEditing(null);
    setModalMode("create");
    setModalOpen(true);
  }
  function openEditFullModal(setting: Setting) {
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
      setFilters((prev) => ({ ...prev, page: 1 }));
    } else {
      setAlertMessage({
        type: "success",
        text: `Đã cập nhật cấu hình "${setting.key}".`,
      });
      void loadList();
    }
  }

  // Quick-edit từ SettingEditor.
  async function handleQuickEdit(key: string, newValue: string) {
    try {
      await updateSetting(key, { value: newValue });
      // Cập nhật local state ngay để UX mượt, không cần reload.
      setAllItems((prev) =>
        prev.map((s) => (s.key === key ? { ...s, value: newValue } : s))
      );
      setAlertMessage({
        type: "success",
        text: `Đã cập nhật nhanh "${key}".`,
      });
    } catch (err) {
      const message = getApiErrorMessage(err, "Không cập nhật được giá trị");
      setAlertMessage({ type: "error", text: message });
      // Throw để SettingEditor rollback UI
      throw err;
    }
  }

  // ===== Import / Export =====
  async function handleExport() {
    setExportLoading(true);
    try {
      const snapshot = await exportSettings();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `system-settings-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setAlertMessage({
        type: "success",
        text: `Đã xuất ${snapshot.settings.length} cấu hình.`,
      });
    } catch (err) {
      const message = getApiErrorMessage(err, "Không xuất được cấu hình");
      setAlertMessage({ type: "error", text: message });
    } finally {
      setExportLoading(false);
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setAlertMessage({
        type: "error",
        text: "Vui lòng chọn file .JSON.",
      });
      return;
    }
    setImportFile(file);
    setImportConfirmOpen(true);
    // Reset input để cùng 1 file có thể chọn lại
    e.target.value = "";
  }

  async function performImport() {
    if (!importFile) return;
    setImportLoading(true);
    try {
      const text = await importFile.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setAlertMessage({
          type: "error",
          text: "File JSON không hợp lệ — không parse được.",
        });
        setImportConfirmOpen(false);
        setImportFile(null);
        return;
      }

      const payload: ImportSettingsPayload = Array.isArray(parsed)
        ? { settings: parsed as ImportSettingsPayload["settings"] }
        : (parsed as ImportSettingsPayload);

      if (!payload || !Array.isArray(payload.settings)) {
        setAlertMessage({
          type: "error",
          text: "Cấu trúc file không hợp lệ — thiếu mảng 'settings'.",
        });
        setImportConfirmOpen(false);
        setImportFile(null);
        return;
      }

      const result = await importSettings(payload, importReplace);
      setAlertMessage({
        type: result.imported > 0 ? "success" : "info",
        text: `Import: ${result.imported}/${result.total} thành công, ${result.skipped} bỏ qua${
          result.errors.length > 0 ? ` (${result.errors.length} lỗi)` : ""
        }.`,
      });
      setImportConfirmOpen(false);
      setImportFile(null);
      void loadList();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không import được cấu hình";
      setAlertMessage({ type: "error", text: message });
    } finally {
      setImportLoading(false);
    }
  }

  function cancelImport() {
    if (importLoading) return;
    setImportConfirmOpen(false);
    setImportFile(null);
  }

  // ===== Columns =====
  const columns: TableColumn<Setting>[] = useMemo(
    () => [
      {
        key: "key",
        header: "Key",
        minWidth: 200,
        render: (s) => (
          <div className={styles.keyCell}>
            <span className={[styles.mono, styles.cellKey].join(" ")} title={s.key}>
              {s.key}
            </span>
            {s.group ? (
              <span className={styles.groupBadgeInline}>
                {GROUP_LABEL_FOR_DISPLAY[s.group]}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: "value",
        header: "Giá trị",
        minWidth: 320,
        render: (s) => (
          <SettingEditor
            value={s.value}
            onSave={(newVal) => handleQuickEdit(s.key, newVal)}
            readOnly={!isAdmin}
            onRequestFullEdit={() => openEditFullModal(s)}
          />
        ),
      },
      {
        key: "description",
        header: "Mô tả",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin]
  );

  const existingKeys = useMemo(() => allItems.map((s) => s.key), [allItems]);

  // ===== Render =====
  const filtered = filters.searchApplied || filters.group !== "All";
  const emptyState = (
    <div className={styles.emptyState}>
      <SettingsIcon size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        {filtered
          ? "Không tìm thấy cấu hình phù hợp"
          : "Chưa có cấu hình nào trong hệ thống"}
      </p>
      <p className={styles.emptyHint}>
        {filtered
          ? "Thử bỏ bớt bộ lọc, đổi nhóm khác hoặc thay đổi từ khoá tìm kiếm."
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
        {isAdmin ? (
          <div className={styles.headerActions}>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Download size={16} />}
              onClick={handleExport}
              isLoading={exportLoading}
              loadingText="Đang xuất…"
            >
              Export JSON
            </Button>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<UploadIcon size={16} />}
              onClick={openFilePicker}
            >
              Import JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={openCreate}
            >
              Thêm cấu hình
            </Button>
          </div>
        ) : null}
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

      <div className={styles.layout}>
        <SettingsSidebar
          selected={filters.group}
          onSelect={handleGroupSelect}
          counts={counts}
        />

        <div className={styles.main}>
          <div className={styles.tableCard}>
            <div className={styles.toolbar}>
              <div className={styles.searchWrap}>
                <Input
                  placeholder="Tìm theo key, mô tả hoặc giá trị..."
                  value={filters.searchInput}
                  onChange={handleSearchInput}
                  leftIcon={<Search size={16} />}
                  rightIcon={filters.searchInput ? <XIcon size={14} /> : undefined}
                  onRightIconClick={
                    filters.searchInput ? clearSearch : undefined
                  }
                />
              </div>

              {filtered ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFilters({
                      searchInput: "",
                      searchApplied: "",
                      group: "All",
                      page: 1,
                    })
                  }
                >
                  Xoá bộ lọc
                </Button>
              ) : null}
            </div>

            {loadError ? (
              <div className={styles.errorWrap}>
                <Alert variant="error">{loadError}</Alert>
                <Button variant="secondary" size="sm" onClick={() => void loadList()}>
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
                      {filters.group !== "All" ? (
                        <>
                          {" "}
                          • Nhóm <b>{
                            filters.group === "Ungrouped"
                              ? "Chưa phân nhóm"
                              : GROUP_LABEL_FOR_DISPLAY[filters.group as SettingGroup] ?? filters.group
                          }</b>
                        </>
                      ) : null}
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
        </div>
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

      <ConfirmDialog
        open={importConfirmOpen}
        title="Import cấu hình từ JSON?"
        message={
          <ImportConfirmMessage
            fileName={importFile?.name}
            replace={importReplace}
            onReplaceChange={setImportReplace}
          />
        }
        confirmText={
          importReplace ? "Import & ghi đè" : "Import (chỉ thêm mới)"
        }
        cancelText="Huỷ"
        confirmVariant="primary"
        loading={importLoading}
        onConfirm={performImport}
        onCancel={cancelImport}
      />
    </div>
  );
}

// ===== Sub-component: ImportConfirmMessage =====

function ImportConfirmMessage({
  fileName,
  replace,
  onReplaceChange,
}: {
  fileName?: string;
  replace: boolean;
  onReplaceChange: (v: boolean) => void;
}) {
  return (
    <div className={styles.importConfirm}>
      <p style={{ margin: "0 0 var(--space-3)" }}>
        Sắp import cấu hình từ file <code>{fileName ?? "(không tên)"}</code>.
      </p>
      <label className={styles.replaceToggle}>
        <input
          type="checkbox"
          checked={replace}
          onChange={(e) => onReplaceChange(e.target.checked)}
          disabled={false}
        />
        <span>
          <b>Ghi đè</b> các cấu hình đã tồn tại (cùng key).{" "}
          {!replace ? (
            <em style={{ color: "var(--text-secondary)" }}>
              Đang ở chế độ "chỉ thêm mới" — các key trùng sẽ bị bỏ qua.
            </em>
          ) : null}
        </span>
      </label>
      <p
        style={{
          margin: "var(--space-3) 0 0",
          fontSize: 12,
          color: "var(--text-secondary)",
        }}
      >
        Hành động này sẽ được ghi vào Audit Log. Không thể hoàn tác.
      </p>
    </div>
  );
}