/**
 * LoginHistory — hiển thị 10 lần LOGIN/LOGOUT gần nhất của self.
 *
 * Mỗi item hiển thị:
 *   - Thời gian (relative "5 phút trước", hover → absolute)
 *   - IP
 *   - Thiết bị (parse từ userAgent — Browser + OS)
 *   - Trạng thái (Success/Fail/Logout) với tone màu
 *
 * Layout chia 4 cột grid để thông tin thẳng hàng (desktop);
 * mobile: stack dọc với label nhỏ kèm giá trị.
 *
 * Loading/empty/error/retry đầy đủ theo DESIGN.md empty/loading pattern.
 */

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  History as HistoryIcon,
  Laptop2,
  LogOut,
  MapPin,
  RotateCw,
  Smartphone,
  Tablet,
  XCircle,
} from "lucide-react";
import { Alert, Button, Skeleton } from "../../../shared/components/ui";
import { ApiError } from "../../../shared/api";
import {
  getLoginHistory,
  type LoginHistoryAction,
  type LoginHistoryEntry,
} from "../services/profileApi";
import styles from "./LoginHistory.module.css";

// ===== Action meta =====
interface ActionMeta {
  label: string;
  toneClass: string;
  icon: typeof CheckCircle2;
  isSuccess: boolean;
}

const ACTION_META: Record<LoginHistoryAction, ActionMeta> = {
  AUTH_LOGIN_SUCCESS: {
    label: "Thành công",
    toneClass: "success",
    icon: CheckCircle2,
    isSuccess: true,
  },
  AUTH_LOGIN_FAIL: {
    label: "Thất bại",
    toneClass: "error",
    icon: XCircle,
    isSuccess: false,
  },
  AUTH_LOGOUT_SUCCESS: {
    label: "Đăng xuất",
    toneClass: "neutral",
    icon: LogOut,
    isSuccess: true,
  },
};

const REASON_LABEL: Record<string, string> = {
  INVALID_CREDENTIALS: "Sai mật khẩu",
  USER_SUSPENDED: "Tài khoản bị khoá",
};

// ===== UA parser (đơn giản, đủ cho UX) =====
interface DeviceInfo {
  os: string;
  browser: string;
  type: "desktop" | "mobile" | "tablet";
  Icon: typeof Laptop2;
}

function detectDevice(ua: string | null): DeviceInfo {
  const empty: DeviceInfo = {
    os: "Không rõ",
    browser: "Không rõ",
    type: "desktop",
    Icon: Laptop2,
  };
  if (!ua) return empty;

  const lower = ua.toLowerCase();

  // OS
  let os = "Không rõ";
  if (lower.includes("windows nt 10")) os = "Windows 10/11";
  else if (lower.includes("windows nt")) os = "Windows";
  else if (lower.includes("mac os x") || lower.includes("macintosh")) os = "macOS";
  else if (lower.includes("android")) os = "Android";
  else if (
    lower.includes("iphone") ||
    lower.includes("ipad") ||
    lower.includes("ios")
  )
    os = "iOS";
  else if (lower.includes("linux")) os = "Linux";

  // Browser
  let browser = "Không rõ";
  if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("chrome/") && !lower.includes("chromium")) browser = "Chrome";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome")) browser = "Safari";
  else if (lower.includes("opr/") || lower.includes("opera")) browser = "Opera";

  // Type
  let type: DeviceInfo["type"] = "desktop";
  let Icon: DeviceInfo["Icon"] = Laptop2;
  if (lower.includes("ipad") || lower.includes("tablet")) {
    type = "tablet";
    Icon = Tablet;
  } else if (
    lower.includes("iphone") ||
    lower.includes("android") && lower.includes("mobile")
  ) {
    type = "mobile";
    Icon = Smartphone;
  }

  return { os, browser, type, Icon };
}

// ===== Time formatter =====
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

function formatAbsolute(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export interface LoginHistoryProps {
  limit?: number;
  /** Auto refresh interval (ms). Mặc định 0 = không tự động. */
  autoRefreshMs?: number;
}

export function LoginHistory({
  limit = 10,
  autoRefreshMs = 0,
}: LoginHistoryProps) {
  const [items, setItems] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
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
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto refresh.
  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs < 5000) return;
    const id = window.setInterval(() => {
      void load();
    }, autoRefreshMs);
    return () => window.clearInterval(id);
  }, [autoRefreshMs, load]);

  // ===== Loading skeleton =====
  if (loading) {
    return (
      <div className={styles.tableLike} aria-busy="true" aria-live="polite">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.row}>
            <Skeleton variant="rectangular" height={48} />
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
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RotateCw size={14} />}
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          Thử lại
        </Button>
      </div>
    );
  }

  // ===== Empty =====
  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <HistoryIcon size={40} aria-hidden="true" />
        <p className={styles.emptyTitle}>Chưa có lịch sử đăng nhập nào</p>
        <span className={styles.emptyHint}>
          Mỗi lần bạn đăng nhập hoặc đăng xuất sẽ xuất hiện tại đây.
        </span>
      </div>
    );
  }

  return (
    <div className={styles.tableLike}>
      {/* Header — chỉ hiển thị trên desktop */}
      <div className={styles.headerRow}>
        <span className={styles.colStatus}>Trạng thái</span>
        <span className={styles.colTime}>Thời gian</span>
        <span className={styles.colIp}>IP</span>
        <span className={styles.colDevice}>Thiết bị</span>
      </div>

      {items.map((entry) => {
        const meta = ACTION_META[entry.action] ?? ACTION_META.AUTH_LOGIN_SUCCESS;
        const Icon = meta.icon;
        const reason = entry.reason ? REASON_LABEL[entry.reason] : null;
        const device = detectDevice(entry.userAgent);

        return (
          <div key={entry.id} className={styles.row}>
            {/* Status badge */}
            <div className={styles.colStatus}>
              <span
                className={[styles.statusBadge, styles[`tone_${meta.toneClass}`]].join(
                  " "
                )}
              >
                <Icon size={12} aria-hidden="true" />
                {meta.label}
                {reason ? <span className={styles.reason}> · {reason}</span> : null}
              </span>
            </div>

            {/* Time */}
            <div className={styles.colTime}>
              <span title={formatAbsolute(entry.createdAt)}>
                {formatRelative(entry.createdAt)}
              </span>
            </div>

            {/* IP */}
            <div className={styles.colIp}>
              {entry.ip ? (
                <span className={styles.mono}>
                  <MapPin size={12} aria-hidden="true" />
                  {entry.ip}
                </span>
              ) : (
                <span className={styles.muted}>—</span>
              )}
            </div>

            {/* Device */}
            <div className={styles.colDevice}>
              {entry.userAgent ? (
                <span className={styles.device}>
                  <device.Icon size={14} aria-hidden="true" />
                  <span>
                    {device.browser} · {device.os}
                  </span>
                </span>
              ) : (
                <span className={styles.muted}>—</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Suspicious warning banner nếu có login fail trong 7 ngày gần nhất */}
      {items.some(
        (e) =>
          e.action === "AUTH_LOGIN_FAIL" &&
          Date.now() - new Date(e.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
      ) ? (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            Có lần đăng nhập thất bại gần đây. Nếu không phải bạn, hãy đổi mật
            khẩu ngay.
          </span>
        </div>
      ) : null}
    </div>
  );
}