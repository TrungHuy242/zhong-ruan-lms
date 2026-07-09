/**
 * useDashboardWidgets — quản lý ẩn/hiện từng widget trên Dashboard, persist
 * vào localStorage.
 *
 * Pattern tái sử dụng từ `useTableColumns`:
 * - Lazy init từ localStorage.
 * - Persist mỗi khi thay đổi.
 * - Có thể reset về mặc định.
 *
 * Widget keys hiện có:
 * - "kpi"        : 6 thẻ KPI
 * - "charts"     : 3 biểu đồ thống kê (gộp 1 widget cho đơn giản)
 * - "activities" : Recent activities
 * - "quickActions": Quick actions
 */
import { useCallback, useEffect, useState } from "react";

export type DashboardWidgetKey = "kpi" | "charts" | "activities" | "quickActions";

export const ALL_DASHBOARD_WIDGETS: readonly DashboardWidgetKey[] = [
  "kpi",
  "charts",
  "activities",
  "quickActions",
] as const;

/** Widget mặc định hiển thị. */
export const DEFAULT_DASHBOARD_WIDGETS: Record<DashboardWidgetKey, boolean> = {
  kpi: true,
  charts: true,
  activities: true,
  quickActions: true,
};

export const WIDGET_LABELS: Record<DashboardWidgetKey, string> = {
  kpi: "Thẻ KPI tổng quan",
  charts: "Biểu đồ thống kê theo tháng",
  activities: "Hoạt động gần đây",
  quickActions: "Thao tác nhanh",
};

const STORAGE_KEY = "zrlms_dashboard_widgets";

export interface UseDashboardWidgetsResult {
  /** Widget nào đang bật. */
  enabled: Record<DashboardWidgetKey, boolean>;
  /** Bật/tắt 1 widget. */
  toggle: (key: DashboardWidgetKey) => void;
  /** Set trực tiếp 1 widget. */
  setEnabled: (key: DashboardWidgetKey, value: boolean) => void;
  /** Reset về mặc định. */
  reset: () => void;
  /** Check 1 widget có bật không. */
  isEnabled: (key: DashboardWidgetKey) => boolean;
}

function isValidKey(k: unknown): k is DashboardWidgetKey {
  return (
    typeof k === "string" &&
    (ALL_DASHBOARD_WIDGETS as readonly string[]).includes(k)
  );
}

export function useDashboardWidgets(): UseDashboardWidgetsResult {
  const [enabled, setEnabledState] = useState<Record<DashboardWidgetKey, boolean>>(
    () => {
      if (typeof window === "undefined") return { ...DEFAULT_DASHBOARD_WIDGETS };
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_DASHBOARD_WIDGETS };
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") {
          return { ...DEFAULT_DASHBOARD_WIDGETS };
        }
        // Merge: chỉ giữ key hợp lệ; thiếu key nào thì dùng mặc định.
        const next: Record<DashboardWidgetKey, boolean> = {
          ...DEFAULT_DASHBOARD_WIDGETS,
        };
        for (const key of ALL_DASHBOARD_WIDGETS) {
          if (isValidKey(key) && typeof parsed[key] === "boolean") {
            next[key] = parsed[key];
          }
        }
        return next;
      } catch {
        return { ...DEFAULT_DASHBOARD_WIDGETS };
      }
    }
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
    } catch {
      // localStorage full / disabled — bỏ qua, vẫn hoạt động trong session.
    }
  }, [enabled]);

  const toggle = useCallback((key: DashboardWidgetKey) => {
    setEnabledState((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setEnabled = useCallback(
    (key: DashboardWidgetKey, value: boolean) => {
      setEnabledState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const reset = useCallback(() => {
    setEnabledState({ ...DEFAULT_DASHBOARD_WIDGETS });
  }, []);

  const isEnabled = useCallback(
    (key: DashboardWidgetKey) => Boolean(enabled[key]),
    [enabled]
  );

  return { enabled, toggle, setEnabled, reset, isEnabled };
}