/**
 * GlobalSearchPage — trang tìm kiếm toàn hệ thống (SaaS-style).
 *
 * Cấu trúc:
 *   - Page chính:
 *       SearchBar + filter (phạm vi) + button "Lệnh nhanh" (Ctrl+K)
 *       RecentSearch (khi chưa có keyword)
 *       Summary kết quả + SearchResultGroup[] khi đã search
 *
 *   - Command Palette Modal (Ctrl+K):
 *       Phiên bản rút gọn — chỉ SearchBar + RecentSearch → nhấn Enter
 *       hoặc click recent → đóng modal + mở page chính với keyword đó.
 *       Lý do: giữ page chính là nơi "xem kết quả", modal chỉ là launcher
 *       (đỡ spam data khi user chỉ muốn chọn nhanh 1 recent keyword).
 *
 * Phím tắt:
 *   - Ctrl+K (hoặc Cmd+K trên macOS): mở/đóng Command Palette.
 *   - ESC: đóng Command Palette.
 *
 * URL state (sync với ?keyword=&type=&page=):
 *   - keyword: từ khoá
 *   - type: 'all' | 'users' | 'notifications' | 'files' | 'settings'
 *   - page: chỉ dùng khi type != 'all'
 */
import {
  ChangeEvent,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Modal,
  type TableColumn,
} from "../../../shared/components/ui";
import { ApiError } from "../../../shared/api";
import {
  SEARCH_HISTORY_LIMIT,
  SEARCH_TYPE_LABELS,
  SEARCH_TYPES,
  clearSearchHistory,
  deleteSearchHistoryItem,
  getSearchHistory,
  globalSearch,
  validateKeyword,
  type SearchFile,
  type SearchHistoryItem,
  type SearchNotification,
  type SearchResult,
  type SearchSetting,
  type SearchType,
  type SearchUser,
} from "../services/searchApi";
import { authStorage } from "../../../shared/storage/authStorage";
import { SearchBar } from "../components/SearchBar";
import { RecentSearch } from "../components/RecentSearch";
import { SearchResultGroup } from "../components/SearchResultGroup";
import {
  Bell,
  Command,
  FileText,
  Search as SearchIcon,
  Settings as SettingsIcon,
  User as UserIcon,
  SearchX,
  Eye,
} from "lucide-react";
import styles from "./GlobalSearchPage.module.css";

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

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let val = bytes / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val < 10 ? 1 : 0)} ${units[i]}`;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giảng viên",
  STUDENT: "Học viên",
};

const TYPE_TONE: Record<SearchType, string> = {
  all: styles.badgeAll,
  users: styles.badgeUser,
  notifications: styles.badgeNotification,
  files: styles.badgeFile,
  settings: styles.badgeSetting,
};

const TYPE_ICON: Record<SearchType, React.ReactNode> = {
  all: <SearchIcon size={16} aria-hidden="true" />,
  users: <UserIcon size={16} aria-hidden="true" />,
  notifications: <Bell size={16} aria-hidden="true" />,
  files: <FileText size={16} aria-hidden="true" />,
  settings: <SettingsIcon size={16} aria-hidden="true" />,
};

/**
 * Highlight từ khoá xuất hiện trong `text`.
 * Trả về danh sách ReactNode; match không phân biệt hoa/thường.
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

// ===== Component =====
const DEBOUNCE_MS = 450;

export function GlobalSearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const mainInputRef = useRef<HTMLInputElement>(null);

  // ===== Modal Ctrl+K =====
  const [paletteOpen, setPaletteOpen] = useState(false);

  // URL → state khởi tạo (cho phép share link).
  const [keyword, setKeyword] = useState<string>(() => {
    return searchParams.get("keyword") ?? "";
  });
  const [type, setType] = useState<SearchType>(() => {
    const t = searchParams.get("type");
    return (SEARCH_TYPES as readonly string[]).includes(t ?? "")
      ? (t as SearchType)
      : "all";
  });
  const [page, setPage] = useState<number>(() => {
    const p = Number(searchParams.get("page") ?? "1");
    return p > 0 ? p : 1;
  });
  const [keywordApplied, setKeywordApplied] = useState<string>(
    () => searchParams.get("keyword") ?? ""
  );

  // Data state
  const [data, setData] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Recent search state
  const [recent, setRecent] = useState<SearchHistoryItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  // Sync URL khi filter thay đổi.
  useEffect(() => {
    const next: Record<string, string> = {};
    if (keywordApplied) next.keyword = keywordApplied;
    if (type !== "all") next.type = type;
    if (page > 1) next.page = String(page);
    setSearchParams(next, { replace: true });
  }, [keywordApplied, type, page, setSearchParams]);

  // Auto focus input khi mount.
  useEffect(() => {
    mainInputRef.current?.focus();
  }, []);

  // Debounce keyword → keywordApplied.
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

  // Reset page khi đổi type.
  useEffect(() => {
    setPage(1);
  }, [type]);

  // ===== Load kết quả =====
  const load = useCallback(async () => {
    const v = validateKeyword(keywordApplied);
    if (!v.ok) {
      setData(null);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const result = await globalSearch({
        keyword: v.value,
        type,
        page,
        limit: type === "all" ? undefined : 10,
      });
      setData(result);
      // Sau khi search thành công (có data) → refresh recent để item mới nhất lên đầu.
      // Best-effort: không await để không block UI.
      void loadRecent();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không thể tìm kiếm";
      setLoadError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [keywordApplied, type, page]);

  useEffect(() => {
    if (keywordApplied.trim().length > 0) {
      void load();
    } else {
      setData(null);
      setLoadError(null);
      setLoading(false);
    }
  }, [load, keywordApplied]);

  // ===== Load Recent =====
  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    setRecentError(null);
    try {
      const items = await getSearchHistory({ limit: SEARCH_HISTORY_LIMIT });
      setRecent(items);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không thể tải lịch sử tìm kiếm";
      setRecentError(message);
      setRecent([]);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  // ===== Ctrl+K shortcut (open/close command palette) =====
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      // Ctrl+K hoặc Cmd+K (macOS).
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      // ESC đóng modal (Modal component đã tự handle, nhưng đây là fallback).
      if (e.key === "Escape" && paletteOpen) {
        e.preventDefault();
        setPaletteOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [paletteOpen]);

  // ===== Handlers =====
  function handleKeywordChange(next: string) {
    setKeyword(next);
  }
  function applyKeywordImmediate(value: string) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setKeyword(value);
    setKeywordApplied(value);
    setPage(1);
  }
  function handleSubmit() {
    applyKeywordImmediate(keyword);
  }
  function handlePickRecent(value: string) {
    applyKeywordImmediate(value);
    setPaletteOpen(false);
    mainInputRef.current?.focus();
  }
  function clearKeyword() {
    setKeyword("");
    setKeywordApplied("");
    setPage(1);
    mainInputRef.current?.focus();
  }
  function handleTypeChange(e: ChangeEvent<HTMLSelectElement>) {
    setType(e.target.value as SearchType);
  }
  function handlePageChange(p: number) {
    setPage(p);
  }

  async function handleRemoveOne(id: number) {
    setRemovingId(id);
    try {
      await deleteSearchHistoryItem(id);
      // Optimistic remove khỏi list, không cần load lại.
      setRecent((prev) => prev.filter((it) => it.id !== id));
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không thể xoá mục lịch sử";
      setRecentError(message);
    } finally {
      setRemovingId(null);
    }
  }

  async function handleClearAll() {
    setClearingAll(true);
    try {
      await clearSearchHistory();
      setRecent([]);
      setConfirmClearAll(false);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không thể xoá lịch sử tìm kiếm";
      setRecentError(message);
    } finally {
      setClearingAll(false);
    }
  }

  // ===== Auth =====
  const currentUser = authStorage.getUser();
  const isAdmin = currentUser?.role === "ADMIN";

  // ===== Columns cho mỗi section =====
  const userColumns: TableColumn<SearchUser>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Họ tên",
        render: (u) => (
          <div className={styles.userCell}>
            <div className={styles.userIcon} aria-hidden="true">
              <UserIcon size={16} />
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {highlight(u.fullName, keywordApplied)}
              </span>
              <span className={styles.userEmail}>
                {highlight(u.email, keywordApplied)}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: "role",
        header: "Vai trò",
        render: (u) => (
          <span className={styles.cellText}>
            {ROLE_LABEL[u.role] ?? u.role}
          </span>
        ),
      },
      {
        key: "phone",
        header: "Số điện thoại",
        render: (u) => (
          <span className={styles.cellText}>
            {u.phone ? highlight(u.phone, keywordApplied) : "—"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (u) => (
          <span
            className={[
              styles.statusChip,
              u.status === "ACTIVE" ? styles.statusActive : styles.statusOther,
            ].join(" ")}
          >
            {u.status}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Ngày tạo",
        render: (u) => (
          <span className={styles.cellText}>{formatDateTime(u.createdAt)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (u) => (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Eye size={14} />}
            onClick={() => navigate(`/users?focus=${u.id}`)}
          >
            Xem chi tiết
          </Button>
        ),
      },
    ],
    [keywordApplied, navigate]
  );

  const notifColumns: TableColumn<SearchNotification>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Tiêu đề",
        render: (n) => (
          <div className={styles.notifCell}>
            <div className={styles.notifIcon} aria-hidden="true">
              <Bell size={16} />
            </div>
            <div className={styles.notifInfo}>
              <span className={styles.notifTitle}>
                {highlight(n.title, keywordApplied)}
              </span>
              <span className={styles.notifMessage}>
                {highlight(n.message ?? "", keywordApplied)}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: "type",
        header: "Loại",
        render: (n) => (
          <span className={styles.cellText}>{n.type}</span>
        ),
      },
      {
        key: "isRead",
        header: "Trạng thái",
        render: (n) => (
          <span
            className={[
              styles.statusChip,
              n.isRead ? styles.statusRead : styles.statusUnread,
            ].join(" ")}
          >
            {n.isRead ? "Đã đọc" : "Chưa đọc"}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "Thời gian",
        render: (n) => (
          <span className={styles.cellText}>{formatDateTime(n.createdAt)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (n) => (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Eye size={14} />}
            onClick={() => navigate(`/notifications?focus=${n.id}`)}
          >
            Xem chi tiết
          </Button>
        ),
      },
    ],
    [keywordApplied, navigate]
  );

  const fileColumns: TableColumn<SearchFile>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Tên tệp",
        render: (f) => (
          <div className={styles.fileCell}>
            <div className={styles.fileIcon} aria-hidden="true">
              <FileText size={16} />
            </div>
            <div className={styles.fileInfo}>
              <span className={styles.fileName}>
                {highlight(f.originalName, keywordApplied)}
              </span>
              <span className={styles.fileMeta}>
                {f.mimeType || "unknown"}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: "size",
        header: "Kích thước",
        render: (f) => (
          <span className={styles.cellText}>{formatBytes(f.size)}</span>
        ),
      },
      {
        key: "uploadedById",
        header: "Người upload",
        render: (f) => (
          <span className={styles.cellText}>#{f.uploadedById}</span>
        ),
      },
      {
        key: "createdAt",
        header: "Thời gian",
        render: (f) => (
          <span className={styles.cellText}>{formatDateTime(f.createdAt)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (f) => (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Eye size={14} />}
            onClick={() => navigate(`/files?focus=${f.id}`)}
          >
            Xem chi tiết
          </Button>
        ),
      },
    ],
    [keywordApplied, navigate]
  );

  const settingColumns: TableColumn<SearchSetting>[] = useMemo(
    () => [
      {
        key: "key",
        header: "Key",
        render: (s) => (
          <code className={styles.codeCell}>
            {highlight(s.key, keywordApplied)}
          </code>
        ),
      },
      {
        key: "description",
        header: "Mô tả",
        render: (s) => (
          <span className={styles.cellText}>
            {s.description ? highlight(s.description, keywordApplied) : "—"}
          </span>
        ),
      },
      {
        key: "group",
        header: "Nhóm",
        render: (s) => (
          <span className={[styles.cellText, styles.tag].join(" ")}>
            {s.group ?? "—"}
          </span>
        ),
      },
      {
        key: "updatedAt",
        header: "Cập nhật",
        render: (s) => (
          <span className={styles.cellText}>{formatDateTime(s.updatedAt)}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        align: "right",
        render: () => (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Eye size={14} />}
            onClick={() => navigate(`/settings`)}
          >
            Mở cấu hình
          </Button>
        ),
      },
    ],
    [keywordApplied, navigate]
  );

  // ===== Render =====
  const hasKeyword = keywordApplied.trim().length > 0;

  // Empty state khi chưa nhập keyword
  const initialEmpty = (
    <div className={styles.emptyState}>
      <SearchIcon size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>Bắt đầu bằng cách nhập từ khoá</p>
      <p className={styles.emptyHint}>
        Tìm kiếm theo tên, email, tiêu đề thông báo hoặc tên tệp. Có thể chọn
        phạm vi &quot;Tất cả&quot;, &quot;Người dùng&quot;, &quot;Thông báo&quot;,
        &quot;Tệp&quot; hoặc &quot;Cấu hình&quot; trước khi tìm. Nhấn{" "}
        <kbd className={styles.kbdInline}>Ctrl K</kbd> để mở nhanh.
      </p>
    </div>
  );

  // Empty state khi không có kết quả
  const noResultEmpty = (
    <div className={styles.emptyState}>
      <SearchX size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>
        Không tìm thấy kết quả cho &quot;{keywordApplied}&quot;
      </p>
      <p className={styles.emptyHint}>
        Thử đổi từ khoá, đổi phạm vi tìm kiếm hoặc kiểm tra chính tả.
      </p>
    </div>
  );

  const showAll = type === "all";
  const usersBlock = data?.users;
  const notifsBlock = data?.notifications;
  const filesBlock = data?.files;
  const settingsBlock = data?.settings;
  const totalAll = hasKeyword
    ? (usersBlock?.total ?? 0) +
      (notifsBlock?.total ?? 0) +
      (filesBlock?.total ?? 0) +
      (settingsBlock?.total ?? 0)
    : 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <SearchIcon size={24} className={styles.titleIcon} aria-hidden="true" />
            Tìm kiếm toàn hệ thống
          </h1>
          <p className={styles.subtitle}>
            Tra cứu nhanh người dùng, thông báo, tệp tin và cấu hình trong một
            giao diện thống nhất. Từ khoá được highlight trực tiếp trong kết quả.
          </p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<Command size={16} />}
          onClick={() => setPaletteOpen(true)}
          aria-haspopup="dialog"
        >
          Lệnh nhanh{" "}
          <kbd className={styles.kbdInline}>Ctrl K</kbd>
        </Button>
      </header>

      <Card padding="md" className={styles.searchCard}>
        <div className={styles.searchRow}>
          <div className={styles.searchInputWrap}>
            <SearchBar
              ref={mainInputRef}
              value={keyword}
              onChange={handleKeywordChange}
              onSubmit={handleSubmit}
              placeholder="Nhập từ khoá cần tìm (tối thiểu 1 ký tự, tối đa 200)..."
              autoFocus
            />
          </div>
          <label className={styles.typeLabel}>
            <span className={styles.typeLabelText}>Phạm vi</span>
            <select
              className={styles.typeSelect}
              value={type}
              onChange={handleTypeChange}
            >
              {SEARCH_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SEARCH_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={loading}
          >
            Tìm kiếm
          </Button>
          {keyword ? (
            <Button variant="ghost" onClick={clearKeyword}>
              Xoá
            </Button>
          ) : null}
        </div>
        {hasKeyword ? (
          <div className={styles.summary}>
            <span className={styles.summaryText}>
              Kết quả cho{" "}
              <b className={styles.summaryKeyword}>
                &quot;{keywordApplied}&quot;
              </b>{" "}
              trong{" "}
              <span className={[styles.badge, TYPE_TONE[type]].join(" ")}>
                {TYPE_ICON[type]}
                {SEARCH_TYPE_LABELS[type]}
              </span>
              {showAll && totalAll > 0 ? (
                <span className={styles.summaryTotal}>
                  {" "}
                  · <b>{totalAll}</b> tổng cộng
                </span>
              ) : null}
            </span>
          </div>
        ) : null}
      </Card>

      {loadError ? (
        <div className={styles.errorWrap}>
          <Alert variant="error">{loadError}</Alert>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Thử lại
          </Button>
        </div>
      ) : null}

      {/* ====== Recent Search (chỉ hiện khi chưa search) ====== */}
      {!hasKeyword ? (
        <Card padding="md">
          <RecentSearch
            items={recent}
            loading={recentLoading}
            error={recentError}
            onPick={handlePickRecent}
            onRemoveOne={(id) => void handleRemoveOne(id)}
            onClearAll={() => setConfirmClearAll(true)}
            onRetry={() => void loadRecent()}
            disabled={removingId != null || clearingAll}
          />
        </Card>
      ) : null}

      {/* ====== Search Results ====== */}
      {!hasKeyword ? (
        initialEmpty
      ) : loadError ? null : data ? (
        <div className={styles.results}>
          {showAll ? null : null /* placeholder cho type=single (1 section) */}

          {(type === "all" || type === "users") ? (
            <SearchResultGroup
              tone={TYPE_TONE.users}
              title={SEARCH_TYPE_LABELS.users}
              icon={TYPE_ICON.users}
              block={usersBlock}
              loading={loading && usersBlock === undefined}
              page={page}
              onPageChange={handlePageChange}
              columns={userColumns}
              rowKey={(u: SearchUser) => `u-${u.id}`}
              emptyHint={isAdmin ? undefined : "Bạn không có quyền tìm kiếm người dùng."}
              keywordApplied={keywordApplied}
              hidePagination={showAll}
            />
          ) : null}

          {(type === "all" || type === "notifications") ? (
            <SearchResultGroup
              tone={TYPE_TONE.notifications}
              title={SEARCH_TYPE_LABELS.notifications}
              icon={TYPE_ICON.notifications}
              block={notifsBlock}
              loading={loading && notifsBlock === undefined}
              page={page}
              onPageChange={handlePageChange}
              columns={notifColumns}
              rowKey={(n: SearchNotification) => `n-${n.id}`}
              keywordApplied={keywordApplied}
              hidePagination={showAll}
            />
          ) : null}

          {(type === "all" || type === "files") ? (
            <SearchResultGroup
              tone={TYPE_TONE.files}
              title={SEARCH_TYPE_LABELS.files}
              icon={TYPE_ICON.files}
              block={filesBlock}
              loading={loading && filesBlock === undefined}
              page={page}
              onPageChange={handlePageChange}
              columns={fileColumns}
              rowKey={(f: SearchFile) => `f-${f.id}`}
              keywordApplied={keywordApplied}
              hidePagination={showAll}
            />
          ) : null}

          {(type === "all" || type === "settings") ? (
            <SearchResultGroup
              tone={TYPE_TONE.settings}
              title={SEARCH_TYPE_LABELS.settings}
              icon={TYPE_ICON.settings}
              block={settingsBlock}
              loading={loading && settingsBlock === undefined}
              page={page}
              onPageChange={handlePageChange}
              columns={settingColumns}
              rowKey={(s: SearchSetting) => `s-${s.id}`}
              emptyHint={isAdmin ? undefined : "Bạn không có quyền tìm kiếm cấu hình."}
              keywordApplied={keywordApplied}
              hidePagination={showAll}
            />
          ) : null}

          {loading ? null : totalAll === 0 ? (
            <div className={styles.allEmpty}>{noResultEmpty}</div>
          ) : null}
        </div>
      ) : null}

      {/* ====== Command Palette Modal (Ctrl+K) ====== */}
      <Modal
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        title={
          <span className={styles.paletteTitle}>
            <Command size={16} aria-hidden="true" /> Tìm kiếm nhanh
          </span>
        }
        size="md"
      >
        <CommandPalette
          recent={recent}
          recentLoading={recentLoading}
          recentError={recentError}
          onRetryRecent={() => void loadRecent()}
          onPick={handlePickRecent}
          onRemoveOne={(id) => void handleRemoveOne(id)}
          onClearAll={() => setConfirmClearAll(true)}
        />
      </Modal>

      {/* ====== Confirm clear all history ====== */}
      <ConfirmDialog
        open={confirmClearAll}
        onCancel={() => setConfirmClearAll(false)}
        title="Xoá toàn bộ lịch sử tìm kiếm?"
        message="Hành động này không thể hoàn tác. Toàn bộ từ khoá bạn đã tìm sẽ bị xoá vĩnh viễn."
        confirmText="Xoá tất cả"
        cancelText="Huỷ"
        confirmVariant="danger"
        loading={clearingAll}
        onConfirm={() => void handleClearAll()}
      />
    </div>
  );
}

// ============== Subcomponent: Command Palette body ==============
interface CommandPaletteProps {
  recent: SearchHistoryItem[];
  recentLoading: boolean;
  recentError: string | null;
  onRetryRecent: () => void;
  onPick: (keyword: string) => void;
  onRemoveOne: (id: number) => void;
  onClearAll: () => void;
}

function CommandPalette({
  recent,
  recentLoading,
  recentError,
  onRetryRecent,
  onPick,
  onRemoveOne,
  onClearAll,
}: CommandPaletteProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input khi mở modal.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit() {
    const v = draft.trim();
    if (v) onPick(v);
  }

  return (
    <div className={styles.palette}>
      <SearchBar
        ref={inputRef}
        value={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
        placeholder="Gõ từ khoá rồi nhấn Enter để tìm kiếm..."
        autoFocus
        size="lg"
      />
      <div className={styles.paletteHint}>
        Nhấn <kbd className={styles.kbdInline}>Enter</kbd> để áp dụng ·{" "}
        <kbd className={styles.kbdInline}>ESC</kbd> để đóng
      </div>
      <div className={styles.paletteRecent}>
        <RecentSearch
          items={recent}
          loading={recentLoading}
          error={recentError}
          onPick={onPick}
          onRemoveOne={onRemoveOne}
          onClearAll={onClearAll}
          onRetry={onRetryRecent}
        />
      </div>
    </div>
  );
}