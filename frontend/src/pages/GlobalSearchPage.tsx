import {
  ChangeEvent,
  Fragment,
  KeyboardEvent,
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
  Input,
  Pagination,
  Table,
  type TableColumn,
} from "../components/ui";
import { ApiError } from "../lib/api";
import {
  SEARCH_LIMIT_DEFAULT,
  SEARCH_TYPE_LABELS,
  SEARCH_TYPES,
  globalSearch,
  totalPagesOf,
  validateKeyword,
  type SearchFile,
  type SearchNotification,
  type SearchResult,
  type SearchType,
  type SearchUser,
} from "../lib/searchApi";
import { authStorage } from "../lib/authStorage";
import {
  Bell,
  FileText,
  Search as SearchIcon,
  User as UserIcon,
  X as XIcon,
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
};

/**
 * Highlight từ khoá xuất hiện trong `text`.
 * Trả về danh sách ReactNode; match không phân biệt hoa/thường.
 */
function highlight(text: string, keyword: string): React.ReactNode {
  if (!text) return text;
  const kw = keyword.trim();
  if (!kw) return text;
  // Escape regex meta chars trong keyword.
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
  // keyword đã được apply (sau debounce / Enter)
  const [keywordApplied, setKeywordApplied] = useState<string>(
    () => searchParams.get("keyword") ?? ""
  );

  // Data state
  const [data, setData] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sync URL khi filter thay đổi.
  useEffect(() => {
    const next: Record<string, string> = {};
    if (keywordApplied) next.keyword = keywordApplied;
    if (type !== "all") next.type = type;
    if (page > 1) next.page = String(page);
    setSearchParams(next, { replace: true });
  }, [keywordApplied, type, page, setSearchParams]);

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

  // ===== Load =====
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
        limit: SEARCH_LIMIT_DEFAULT,
      });
      setData(result);
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
    // Chỉ gọi API khi đã có keyword applied (tránh spam 400 khi user chưa nhập gì).
    if (keywordApplied.trim().length > 0) {
      void load();
    } else {
      setData(null);
      setLoadError(null);
      setLoading(false);
    }
  }, [load, keywordApplied]);

  // ===== Handlers =====
  function handleKeywordChange(e: ChangeEvent<HTMLInputElement>) {
    setKeyword(e.target.value);
  }
  function handleKeywordKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      setKeywordApplied(keyword);
      setPage(1);
    }
  }
  function clearKeyword() {
    setKeyword("");
    setKeywordApplied("");
    setPage(1);
  }
  function handleTypeChange(e: ChangeEvent<HTMLSelectElement>) {
    setType(e.target.value as SearchType);
  }
  function handlePageChange(p: number) {
    setPage(p);
  }

  // ===== Auth để biết user hiện tại có phải admin không =====
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

  // ===== Render =====
  const hasKeyword = keywordApplied.trim().length > 0;

  // Empty state khi chưa nhập keyword
  const initialEmpty = (
    <div className={styles.emptyState}>
      <SearchIcon size={48} aria-hidden="true" />
      <p className={styles.emptyTitle}>Bắt đầu bằng cách nhập từ khoá</p>
      <p className={styles.emptyHint}>
        Tìm kiếm theo tên, email, tiêu đề thông báo hoặc tên tệp. Có thể chọn
        phạm vi &quot;Tất cả&quot;, &quot;Người dùng&quot;, &quot;Thông báo&quot;
        hoặc &quot;Tệp&quot; trước khi tìm.
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <SearchIcon size={24} className={styles.titleIcon} aria-hidden="true" />
            Tìm kiếm toàn hệ thống
          </h1>
          <p className={styles.subtitle}>
            Tra cứu nhanh người dùng, thông báo và tệp tin trong một giao diện
            thống nhất. Từ khoá được highlight trực tiếp trong kết quả.
          </p>
        </div>
      </header>

      <div className={styles.searchCard}>
        <div className={styles.searchRow}>
          <div className={styles.searchInputWrap}>
            <Input
              placeholder="Nhập từ khoá cần tìm (tối thiểu 1 ký tự, tối đa 200)..."
              value={keyword}
              onChange={handleKeywordChange}
              onKeyDown={handleKeywordKey}
              leftIcon={<SearchIcon size={16} />}
              rightIcon={keyword ? <XIcon size={14} /> : undefined}
              onRightIconClick={keyword ? clearKeyword : undefined}
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
            onClick={() => {
              if (debounceRef.current) window.clearTimeout(debounceRef.current);
              setKeywordApplied(keyword);
              setPage(1);
            }}
            isLoading={loading}
          >
            Tìm kiếm
          </Button>
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
                {SEARCH_TYPE_LABELS[type]}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      {loadError ? (
        <div className={styles.errorWrap}>
          <Alert variant="error">{loadError}</Alert>
          <Button variant="secondary" size="sm" onClick={load}>
            Thử lại
          </Button>
        </div>
      ) : null}

      {!hasKeyword ? (
        initialEmpty
      ) : loadError ? null : data ? (
        <SearchResults
          data={data}
          type={type}
          isAdmin={isAdmin}
          loading={loading}
          page={page}
          onPageChange={handlePageChange}
          userColumns={userColumns}
          notifColumns={notifColumns}
          fileColumns={fileColumns}
          keywordApplied={keywordApplied}
          emptyState={noResultEmpty}
        />
      ) : null}
    </div>
  );
}

// ============== Subcomponent: render 3 sections ==============
interface SearchResultsProps {
  data: SearchResult;
  type: SearchType;
  isAdmin: boolean;
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  userColumns: TableColumn<SearchUser>[];
  notifColumns: TableColumn<SearchNotification>[];
  fileColumns: TableColumn<SearchFile>[];
  keywordApplied: string;
  emptyState: React.ReactNode;
}

function SearchResults({
  data,
  type,
  isAdmin,
  loading,
  page,
  onPageChange,
  userColumns,
  notifColumns,
  fileColumns,
  keywordApplied,
  emptyState,
}: SearchResultsProps) {
  const showAll = type === "all";
  const showUsers = type === "all" || type === "users";
  const showNotifs = type === "all" || type === "notifications";
  const showFiles = type === "all" || type === "files";

  const usersBlock = data.users;
  const notifsBlock = data.notifications;
  const filesBlock = data.files;

  // Tính tổng để quyết định có hiển thị "no result" khi type=all nhưng cả 3 đều rỗng.
  const totalAll =
    (usersBlock?.total ?? 0) +
    (notifsBlock?.total ?? 0) +
    (filesBlock?.total ?? 0);

  if (!loading && totalAll === 0) {
    return <div className={styles.allEmpty}>{emptyState}</div>;
  }

  return (
    <div className={styles.results}>
      {showUsers ? (
        <SearchSection
          tone={TYPE_TONE.users}
          title={SEARCH_TYPE_LABELS.users}
          icon={<UserIcon size={16} />}
          block={usersBlock}
          loading={loading && usersBlock === undefined}
          page={page}
          onPageChange={onPageChange}
          columns={userColumns}
          rowKey={(u: SearchUser) => `u-${u.id}`}
          emptyHint={isAdmin ? undefined : "Bạn không có quyền tìm kiếm người dùng."}
          keywordApplied={keywordApplied}
        />
      ) : null}

      {showNotifs ? (
        <SearchSection
          tone={TYPE_TONE.notifications}
          title={SEARCH_TYPE_LABELS.notifications}
          icon={<Bell size={16} />}
          block={notifsBlock}
          loading={loading && notifsBlock === undefined}
          page={page}
          onPageChange={onPageChange}
          columns={notifColumns}
          rowKey={(n: SearchNotification) => `n-${n.id}`}
          keywordApplied={keywordApplied}
        />
      ) : null}

      {showFiles ? (
        <SearchSection
          tone={TYPE_TONE.files}
          title={SEARCH_TYPE_LABELS.files}
          icon={<FileText size={16} />}
          block={filesBlock}
          loading={loading && filesBlock === undefined}
          page={page}
          onPageChange={onPageChange}
          columns={fileColumns}
          rowKey={(f: SearchFile) => `f-${f.id}`}
          keywordApplied={keywordApplied}
        />
      ) : null}

      {/* type=all không dùng pagination trên từng block (BE trả limit cố định) */}
      {showAll ? null : null}
    </div>
  );
}

interface SectionProps<T> {
  tone: string;
  title: string;
  icon: React.ReactNode;
  block: { items: T[]; total: number; page: number; limit: number } | undefined;
  loading: boolean;
  page: number;
  onPageChange: (p: number) => void;
  columns: TableColumn<T>[];
  rowKey: (row: T) => string | number;
  keywordApplied: string;
  emptyHint?: string;
}

function SearchSection<T extends { id: number }>({
  tone,
  title,
  icon,
  block,
  loading,
  page,
  onPageChange,
  columns,
  rowKey,
  emptyHint,
}: SectionProps<T>) {
  const items = block?.items ?? [];
  const total = block?.total ?? 0;
  const totalPages = totalPagesOf(block);

  return (
    <Card padding="md" className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <span className={[styles.badge, tone].join(" ")}>
            {icon}
            {title}
          </span>
          <span className={styles.sectionCount}>
            {total > 0 ? `${total} kết quả` : "Không có kết quả"}
          </span>
        </h2>
      </div>

      <Table
        columns={columns}
        data={items}
        loading={loading}
        skeletonRows={4}
        rowKey={rowKey}
        emptyState={
          <div className={styles.sectionEmpty}>
            <SearchX size={32} aria-hidden="true" />
            <p className={styles.emptyTitle}>
              {emptyHint ?? "Không có kết quả trong mục này"}
            </p>
            {emptyHint ? null : (
              <p className={styles.emptyHint}>
                Thử mở rộng phạm vi tìm kiếm hoặc đổi từ khoá khác.
              </p>
            )}
          </div>
        }
      />

      {total > 0 ? (
        <div className={styles.sectionFooter}>
          <span className={styles.totalLabel}>
            Hiển thị <b>{items.length}</b> / <b>{total}</b> bản ghi
          </span>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      ) : null}
    </Card>
  );
}