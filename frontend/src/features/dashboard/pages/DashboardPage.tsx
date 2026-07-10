import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import html2canvas from "html2canvas";
import {
  Alert,
  Button,
  Card,
} from "../../../shared/components/ui";
import {
  getMonthlyStats,
  getOverview,
  type DashboardOverview,
  type MonthlyStats,
} from "../services/dashboardApi";
import { ApiError } from "../../../shared/api";
import { authStorage } from "../../../shared/storage/authStorage";
import { useAutoRefresh } from "../../../shared/hooks/useAutoRefresh";
import { useDashboardWidgets } from "../hooks/useDashboardWidgets";
import { KpiCard } from "../components/KpiCard";
import { MonthlyChart, type MonthlyDataPoint } from "../components/MonthlyChart";
import { RecentActivities } from "../components/RecentActivities";
import { QuickActions } from "../components/QuickActions";
import { DashboardWidgetSettings } from "../components/DashboardWidgetSettings";
import {
  Bell,
  FolderOpen,
  GraduationCap,
  ScrollText,
  UserCog,
  Users as UsersIcon,
  Sparkles,
  ImageDown,
  RefreshCw,
  Loader2,
} from "lucide-react";
import styles from "./DashboardPage.module.css";

/** Chu kỳ auto refresh (ms). */
const AUTO_REFRESH_INTERVAL_MS = 60_000;

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
  /** Key trong monthly (number[]) để tính so sánh kỳ trước. */
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
    hint:
      "Tổng số tài khoản đang hoạt động trong hệ thống (không tính user đã xoá mềm).",
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

/**
 * Tính giá trị kỳ trước (tích luỹ trước tháng gần nhất) để so sánh.
 *
 * Công thức: current_total - monthly_last = giá trị đã đạt được TRƯỚC tháng
 * hiện tại. Đây là proxy "kỳ trước" khi BE không trả sẵn trường này.
 */
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
  const currentUser = authStorage.getUser();
  const widgets = useDashboardWidgets();

  // Ref tới vùng content để export ảnh.
  const exportRef = useRef<HTMLDivElement | null>(null);

  // ===== Data state =====
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStats | null>(null);

  // Mỗi widget có loading + error riêng — lỗi 1 widget không sập cả trang.
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  // Manual refresh state + banner + last updated + exporting
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Loại chart đang chọn (chỉ vẽ 1 series tại 1 thời điểm cho gọn).
  const [chartSeries, setChartSeries] = useState<
    "users" | "files" | "notifications"
  >("users");

  // ===== Load functions =====
  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await getOverview();
      setOverview(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được thống kê tổng quan";
      setOverviewError(message);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadMonthly = useCallback(async (silent = false) => {
    if (!silent) setMonthlyLoading(true);
    setMonthlyError(null);
    try {
      const data = await getMonthlyStats(6);
      setMonthly(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được thống kê theo tháng";
      setMonthlyError(message);
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  const loadAll = useCallback(
    async (opts: { silent?: boolean; manual?: boolean } = {}) => {
      const { silent = false, manual = false } = opts;
      if (manual) setIsManualRefreshing(true);
      const tasks: Promise<unknown>[] = [];
      if (widgets.isEnabled("kpi")) tasks.push(loadOverview(silent));
      if (widgets.isEnabled("charts")) tasks.push(loadMonthly(silent));
      // activities widget tự load nội bộ — không fetch ở đây.
      await Promise.all(tasks);
      setLastUpdated(new Date());
      if (manual) setIsManualRefreshing(false);
    },
    [loadOverview, loadMonthly, widgets]
  );

  // Load lần đầu — chỉ gọi 1 lần, sau đó auto-refresh lo phần còn lại.
  // KHÔNG phụ thuộc widgets.enabled (vì lần đầu tiên widget đã có default true).
  useEffect(() => {
    void loadAll({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Khi widget bị ẩn/hiện, fetch lại data tương ứng (nếu trước đó ẩn thì
  // data không có sẵn — cần fetch ngay khi bật lại).
  const prevEnabledRef = useRef(widgets.enabled);
  useEffect(() => {
    const prev = prevEnabledRef.current;
    if (!prev.charts && widgets.enabled.charts) {
      void loadMonthly(false);
    }
    if (!prev.kpi && widgets.enabled.kpi) {
      void loadOverview(false);
    }
    prevEnabledRef.current = widgets.enabled;
  }, [widgets.enabled, loadMonthly, loadOverview]);

  // Auto refresh mỗi 60s (chỉ fetch widget đang hiện).
  useAutoRefresh({
    callback: () => loadAll({ silent: true }),
    intervalMs: AUTO_REFRESH_INTERVAL_MS,
    enabled: true,
  });

  // ===== Stats (KPI) =====
  const stats = useMemo(() => {
    return STAT_ITEMS.map((s) => ({
      ...s,
      value: overview ? pickValue(overview, s.source) : 0,
      previousValue: overview
        ? getPreviousValue(s, monthly, pickValue(overview, s.source))
        : null,
    }));
  }, [overview, monthly]);

  // ===== Chart data =====
  const monthlyData: MonthlyDataPoint[] = useMemo(() => {
    if (!monthly) return [];
    return monthly.months.map((m, i) => ({
      month: m,
      users: monthly.users[i] ?? 0,
      files: monthly.files[i] ?? 0,
      notifications: monthly.notifications[i] ?? 0,
    }));
  }, [monthly]);

  // ===== Handlers =====
  const handleManualRefresh = useCallback(async () => {
    await loadAll({ silent: false, manual: true });
    setBanner({ type: "success", text: "Đã làm mới dữ liệu Dashboard" });
  }, [loadAll]);

  const handleChanged = useCallback(
    (_kind: "user" | "notification" | "upload") => {
      // Khi Quick Action tạo thành công → gọi lại API để số liệu cập nhật ngay.
      void loadAll({ silent: false });
    },
    [loadAll]
  );

  // ===== Export ảnh =====
  const handleExport = useCallback(async () => {
    if (!exportRef.current) return;
    if (exporting) return;
    setExporting(true);
    try {
      // Tạm thời ẩn các nút điều khiển (Tùy chỉnh / Refresh / Xuất ảnh)
      // để ảnh chụp gọn gàng.
      const hiddenButtons =
        exportRef.current.querySelectorAll<HTMLElement>("[data-export-hide]");
      const previousDisplay: string[] = [];
      hiddenButtons.forEach((el, idx) => {
        previousDisplay[idx] = el.style.display;
        el.style.display = "none";
      });
      try {
        const canvas = await html2canvas(exportRef.current, {
          backgroundColor: "#F7F7F9",
          scale: window.devicePixelRatio > 1 ? 2 : 1,
          useCORS: true,
          logging: false,
        });
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (!blob) throw new Error("Không tạo được ảnh");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const today = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `dashboard-${today}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setBanner({ type: "success", text: "Đã xuất ảnh Dashboard" });
      } finally {
        // Khôi phục hiển thị các nút.
        hiddenButtons.forEach((el, idx) => {
          el.style.display = previousDisplay[idx] ?? "";
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Xuất ảnh thất bại";
      setBanner({ type: "error", text: message });
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  // ===== Render =====
  return (
    <div className={styles.page}>
      {/* Header — phần Tổng quan + các nút điều khiển */}
      <header className={styles.toolbarHeader}>
        <div className={styles.welcome}>
          <div className={styles.welcomeIcon} aria-hidden="true">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className={styles.welcomeTitle}>
              Xin chào,{" "}
              <span className={styles.welcomeName}>
                {currentUser?.fullName ?? "bạn"}
              </span>
            </h1>
            <p className={styles.welcomeSubtitle}>
              Tổng quan hệ thống Zhong Ruan LMS hôm nay.
            </p>
          </div>
        </div>

        <div className={styles.toolbarActions}>
          {lastUpdated ? (
            <span className={styles.lastUpdated} aria-live="polite">
              Cập nhật lần cuối:{" "}
              {lastUpdated.toLocaleTimeString("vi-VN", { hour12: false })}
            </span>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={
              isManualRefreshing ? (
                <Loader2 size={14} className={styles.spinIcon} />
              ) : (
                <RefreshCw size={14} />
              )
            }
            isLoading={isManualRefreshing}
            onClick={handleManualRefresh}
            data-export-hide="true"
          >
            {isManualRefreshing ? "Đang tải..." : "Refresh"}
          </Button>
          <span data-export-hide="true">
            <DashboardWidgetSettings widgets={widgets} />
          </span>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={
              exporting ? (
                <Loader2 size={14} className={styles.spinIcon} />
              ) : (
                <ImageDown size={14} />
              )
            }
            isLoading={exporting}
            onClick={handleExport}
            data-export-hide="true"
          >
            {exporting ? "Đang xuất..." : "Xuất ảnh"}
          </Button>
        </div>
      </header>

      {banner ? (
        <Alert
          variant={banner.type === "success" ? "success" : "error"}
          onClose={() => setBanner(null)}
        >
          {banner.text}
        </Alert>
      ) : null}

      {/* Vùng export (ref) — chỉ chứa nội dung muốn chụp */}
      <div ref={exportRef} className={styles.exportArea}>
        {/* ===== KPI Cards ===== */}
        {widgets.enabled.kpi ? (
          <section
            className={styles.kpiSection}
            aria-label="Thống kê tổng quan"
          >
            {overviewError ? (
              <div className={styles.errorWrap}>
                <Alert variant="error">{overviewError}</Alert>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void loadOverview(false)}
                >
                  Thử lại
                </Button>
              </div>
            ) : (
              <div className={styles.grid}>
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
        ) : null}

        {/* ===== Charts ===== */}
        {widgets.enabled.charts ? (
          <Card padding="md" className={styles.chartCard}>
            <header className={styles.chartHeader}>
              <h2 className={styles.chartTitle}>Thống kê theo tháng</h2>
              <div className={styles.chartSwitcher} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={chartSeries === "users"}
                  className={`${styles.chartSwitchBtn} ${chartSeries === "users" ? styles.chartSwitchBtnActive : ""}`}
                  onClick={() => setChartSeries("users")}
                >
                  User
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={chartSeries === "files"}
                  className={`${styles.chartSwitchBtn} ${chartSeries === "files" ? styles.chartSwitchBtnActive : ""}`}
                  onClick={() => setChartSeries("files")}
                >
                  File upload
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={chartSeries === "notifications"}
                  className={`${styles.chartSwitchBtn} ${chartSeries === "notifications" ? styles.chartSwitchBtnActive : ""}`}
                  onClick={() => setChartSeries("notifications")}
                >
                  Notification
                </button>
              </div>
            </header>
            <MonthlyChart
              data={monthlyData}
              series={chartSeries}
              loading={monthlyLoading}
              error={monthlyError}
              empty={!monthlyLoading && !monthly && !monthlyError}
            />
          </Card>
        ) : null}

        {/* ===== Quick Actions + Recent Activities (2 cột trên desktop) ===== */}
        <div className={styles.bottomGrid}>
          {widgets.enabled.quickActions ? (
            <Card padding="md" className={styles.quickCard}>
              <h2 className={styles.widgetTitle}>Thao tác nhanh</h2>
              <QuickActions onChanged={handleChanged} />
            </Card>
          ) : null}

          {widgets.enabled.activities ? (
            <Card padding="md" className={styles.activityCard}>
              <h2 className={styles.widgetTitle}>Hoạt động gần đây</h2>
              <RecentActivities limit={10} />
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}