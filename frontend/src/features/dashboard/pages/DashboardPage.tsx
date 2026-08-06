import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card } from "../../../shared/components/ui";
import {
  getMonthlyStats,
  getOverview,
  type DashboardOverview,
  type MonthlyStats,
} from "../services/dashboardApi";
import { ApiError } from "../../../shared/api";
import { authStorage } from "../../../shared/storage/authStorage";
import { useAutoRefresh } from "../../../shared/hooks/useAutoRefresh";
import { KpiCard } from "../components/KpiCard";
import { MonthlyChart, type MonthlyDataPoint } from "../components/MonthlyChart";
import { RecentActivities } from "../components/RecentActivities";
import { QuickActions } from "../components/QuickActions";
import {
  Bell,
  FolderOpen,
  GraduationCap,
  ScrollText,
  UserCog,
  Users as UsersIcon,
} from "lucide-react";
import styles from "./DashboardPage.module.css";

/**
 * DashboardPage — trang tổng quan Admin.
 *
 * Chỉ hiện 4 widget cố định (KPI / Chart / Quick Actions / Activities).
 * Không có:
 *   - "Cập nhật lần cuối" (không hữu ích với auto-refresh)
 *   - Nút "Xuất ảnh" dashboard (hiếm dùng, phức tạp)
 *   - Nút "Tùy chỉnh widget" (layout cố định là đủ)
 *   - Tab switcher trên chart — chỉ hiện User trends
 *
 * Ẩn theo quyết định audit 2026-08:
 *   - html2canvas import: vẫn trong package.json
 *   - useDashboardWidgets / DashboardWidgetSettings: giữ nguyên file/component
 *   - MonthlyChart series prop: vẫn accept 3 series, hardcode "users"
 *   - Auto-refresh logic: giữ nguyên, chỉ ẩn Refresh button
 *   Có thể bật lại nếu cần.
 */

/** Chu kỳ auto refresh (ms). */
const AUTO_REFRESH_INTERVAL_MS = 60_000;
/** Series mặc định cho biểu đồ — chỉ hiện Users (thường dùng nhất). */
const DEFAULT_CHART_SERIES = "users" as const;

type OverviewSource =
  | "users.total"
  | "users.byRole.STUDENT"
  | "users.byRole.TEACHER"
  | "notifications.total"
  | "files.total"
  | "auditLogs.total";

interface StatItem {
  key: string;
  label: string;
  source: OverviewSource;
  Icon: typeof UsersIcon;
  hint: string;
  monthlyKey?: "users" | "files" | "notifications";
  tone: "primary" | "success" | "accent" | "warning" | "info" | "neutral";
}

const STAT_ITEMS: StatItem[] = [
  {
    key: "totalUsers",
    label: "Tổng Users",
    source: "users.total",
    Icon: UsersIcon,
    tone: "primary",
    hint: "Tổng số tài khoản đang hoạt động trong hệ thống (không tính user đã xoá mềm).",
    monthlyKey: "users",
  },
  {
    key: "totalStudents",
    label: "Tổng Students",
    source: "users.byRole.STUDENT",
    Icon: GraduationCap,
    tone: "success",
    hint: "Tổng số học viên (role STUDENT) trong hệ thống.",
    monthlyKey: "users",
  },
  {
    key: "totalTeachers",
    label: "Tổng Teachers",
    source: "users.byRole.TEACHER",
    Icon: UserCog,
    tone: "accent",
    hint: "Tổng số giáo viên (role TEACHER) trong hệ thống.",
    monthlyKey: "users",
  },
  {
    key: "totalNotifications",
    label: "Tổng Notifications",
    source: "notifications.total",
    Icon: Bell,
    tone: "warning",
    hint: "Tổng số thông báo đã được gửi (không tính thông báo đã xoá).",
    monthlyKey: "notifications",
  },
  {
    key: "totalFiles",
    label: "Tổng Files",
    source: "files.total",
    Icon: FolderOpen,
    tone: "info",
    hint: "Tổng số file đã được upload (không tính file đã xoá).",
    monthlyKey: "files",
  },
  {
    key: "totalAuditLogs",
    label: "Tổng Audit Logs",
    source: "auditLogs.total",
    Icon: ScrollText,
    tone: "neutral",
    hint: "Tổng số bản ghi nhật ký hệ thống (mọi hành động nhạy cảm).",
  },
];

function pickValue(overview: DashboardOverview, source: OverviewSource): number {
  switch (source) {
    case "users.total":
      return overview.users.total;
    case "users.byRole.STUDENT":
      return overview.users.byRole.STUDENT;
    case "users.byRole.TEACHER":
      return overview.users.byRole.TEACHER;
    case "notifications.total":
      return overview.notifications.total;
    case "files.total":
      return overview.files.total;
    case "auditLogs.total":
      return overview.auditLogs.total;
  }
}

function getPreviousValue(
  stat: StatItem,
  monthly: MonthlyStats | null,
  currentTotal: number
): number | null {
  if (!monthly || !stat.monthlyKey) return null;
  const series = monthly[stat.monthlyKey];
  const lastMonth = series[series.length - 1] ?? 0;
  return Math.max(0, currentTotal - lastMonth);
}

export function DashboardPage() {
  useEffect(() => {
    document.title = "Dashboard — Zhong Ruan LMS";
  }, []);

  const currentUser = authStorage.getUser();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStats | null>(null);

  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await getOverview();
      setOverview(data);
    } catch (err) {
      setOverviewError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được thống kê tổng quan"
      );
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    setMonthlyError(null);
    try {
      const data = await getMonthlyStats(6);
      setMonthly(data);
    } catch (err) {
      setMonthlyError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được thống kê theo tháng"
      );
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadOverview(), loadMonthly()]);
  }, [loadOverview, loadMonthly]);

  // Load lần đầu
  useEffect(() => {
    void loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto refresh mỗi 60s
  useAutoRefresh({
    callback: () => loadAll(),
    intervalMs: AUTO_REFRESH_INTERVAL_MS,
    enabled: true,
  });

  const stats = useMemo(() => {
    return STAT_ITEMS.map((s) => ({
      ...s,
      value: overview ? pickValue(overview, s.source) : 0,
      previousValue: overview
        ? getPreviousValue(s, monthly, pickValue(overview, s.source))
        : null,
    }));
  }, [overview, monthly]);

  const monthlyData: MonthlyDataPoint[] = useMemo(() => {
    if (!monthly) return [];
    return monthly.months.map((m, i) => ({
      month: m,
      users: monthly.users[i] ?? 0,
      files: monthly.files[i] ?? 0,
      notifications: monthly.notifications[i] ?? 0,
    }));
  }, [monthly]);

  const handleChanged = useCallback(() => {
    void loadAll();
  }, [loadAll]);

  return (
    <div className={styles.page}>
      <header className={styles.welcomeBar}>
        <h1 className={styles.welcomeTitle}>
          Xin chào,{" "}
          <span className={styles.welcomeName}>
            {currentUser?.fullName ?? "bạn"}
          </span>
        </h1>
      </header>

      {/* KPI Cards — always visible */}
      <section className={styles.kpiSection} aria-label="Thống kê tổng quan">
        {overviewError ? (
          <div className={styles.errorWrap}>
            <Alert variant="error">{overviewError}</Alert>
            <Button variant="secondary" size="sm" onClick={() => void loadOverview()}>
              Thử lại
            </Button>
          </div>
        ) : (
          <div className={styles.kpiGrid}>
            {stats.map((s) => (
              <KpiCard
                key={s.key}
                icon={<s.Icon />}
                value={s.value}
                label={s.label}
                tone={s.tone}
                loading={overviewLoading}
                previousValue={s.previousValue}
                hint={s.hint}
              />
            ))}
          </div>
        )}
      </section>

      {/* Chart — always visible, only Users series */}
      <Card padding="md" className={styles.chartCard}>
        <h2 className={styles.chartTitle}>Thống kê theo tháng</h2>
        <MonthlyChart
          data={monthlyData}
          series={DEFAULT_CHART_SERIES}
          loading={monthlyLoading}
          error={monthlyError}
          empty={!monthlyLoading && !monthly && !monthlyError}
        />
      </Card>

      {/* Quick Actions + Recent Activities */}
      <div className={styles.bottomGrid}>
        <Card padding="md" className={styles.quickCard}>
          <h2 className={styles.widgetTitle}>Thao tác nhanh</h2>
          <QuickActions onChanged={handleChanged} />
        </Card>

        <Card padding="md" className={styles.activityCard}>
          <h2 className={styles.widgetTitle}>Hoạt động gần đây</h2>
          <RecentActivities limit={10} />
        </Card>
      </div>
    </div>
  );
}
