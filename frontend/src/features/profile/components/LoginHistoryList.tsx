/**
 * LoginHistoryList — hiển thị danh sách 10 lần LOGIN/LOGOUT gần nhất của self.
 *
 * Dữ liệu từ GET /auth/me/login-history.
 * Mỗi item:
 *   - LOGIN_SUCCESS  → success tone, "Đăng nhập thành công"
 *   - LOGIN_FAIL     → error tone, "Đăng nhập thất bại" + reason
 *   - LOGOUT_SUCCESS → neutral tone, "Đăng xuất"
 *
 * Loading/empty/error đầy đủ.
 */

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Globe2,
  History as HistoryIcon,
  LogOut,
  MonitorSmartphone,
  XCircle,
} from "lucide-react";
import { Alert, Skeleton } from "../../../shared/components/ui";
import { ApiError } from "../../../shared/api";
import {
  getLoginHistory,
  type LoginHistoryAction,
  type LoginHistoryEntry,
} from "../services/profileApi";
import styles from "./LoginHistoryList.module.css";

interface ToneMeta {
  label: string;
  toneClass: string;
  icon: typeof CheckCircle2;
}

const ACTION_META: Record<LoginHistoryAction, ToneMeta> = {
  AUTH_LOGIN_SUCCESS: {
    label: "Đăng nhập thành công",
    toneClass: "success",
    icon: CheckCircle2,
  },
  AUTH_LOGIN_FAIL: {
    label: "Đăng nhập thất bại",
    toneClass: "error",
    icon: XCircle,
  },
  AUTH_LOGOUT_SUCCESS: {
    label: "Đăng xuất",
    toneClass: "neutral",
    icon: LogOut,
  },
};

const REASON_LABEL: Record<string, string> = {
  INVALID_CREDENTIALS: "Sai mật khẩu",
  USER_SUSPENDED: "Tài khoản đã bị khóa",
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return "vừa xong";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} ngày trước`;
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface LoginHistoryListProps {
  /** Số lượng tối đa hiển thị (mặc định 10). */
  limit?: number;
  /** Khoảng cách refresh tự động (ms). Mặc định 0 = không auto refresh. */
  autoRefreshMs?: number;
}

export function LoginHistoryList({
  limit = 10,
  autoRefreshMs = 0,
}: LoginHistoryListProps) {
  const [items, setItems] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = await getLoginHistory(limit);
      setItems(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được lịch sử đăng nhập";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  // Auto refresh (nếu được bật).
  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs < 5000) return;
    const id = window.setInterval(() => {
      void load();
    }, autoRefreshMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshMs, limit]);

  // ===== Loading skeleton =====
  if (loading) {
    return (
      <div className={styles.list}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.row}>
            <Skeleton variant="circular" width={32} height={32} />
            <div className={styles.body}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="25%" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ===== Error =====
  if (error) {
    return (
      <div className={styles.errorWrap}>
        <Alert variant="error">{error}</Alert>
        <button
          type="button"
          className={styles.retry}
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  // ===== Empty =====
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <HistoryIcon size={32} aria-hidden="true" />
        <p>Chưa có lịch sử đăng nhập nào được ghi nhận.</p>
        <span className={styles.emptyHint}>
          Mỗi lần bạn đăng nhập hoặc đăng xuất sẽ xuất hiện tại đây.
        </span>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {items.map((entry) => {
        const meta = ACTION_META[entry.action] ?? ACTION_META.AUTH_LOGIN_SUCCESS;
        const Icon = meta.icon;
        const reason = entry.reason ? REASON_LABEL[entry.reason] : null;
        return (
          <div key={entry.id} className={styles.row}>
            <div
              className={[styles.iconBox, styles[`tone_${meta.toneClass}`]].join(
                " "
              )}
              aria-hidden="true"
            >
              <Icon size={16} />
            </div>
            <div className={styles.body}>
              <div className={styles.titleLine}>
                <span className={styles.title}>{meta.label}</span>
                {reason ? (
                  <span className={styles.reason}>· {reason}</span>
                ) : null}
              </div>
              <div className={styles.meta}>
                <span title={new Date(entry.createdAt).toLocaleString("vi-VN")}>
                  {formatRelative(entry.createdAt)}
                </span>
                {entry.ip ? (
                  <span className={styles.metaItem}>
                    <Globe2 size={12} aria-hidden="true" />
                    {entry.ip}
                  </span>
                ) : null}
                {entry.userAgent ? (
                  <span className={styles.metaItem}>
                    <MonitorSmartphone size={12} aria-hidden="true" />
                    <span className={styles.ua}>{entry.userAgent}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}