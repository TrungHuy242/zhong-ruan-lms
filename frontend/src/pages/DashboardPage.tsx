import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  StatCard,
  type StatCardTone,
} from "../components/ui";
import { getOverview, type DashboardOverview } from "../lib/dashboardApi";
import { ApiError } from "../lib/api";
import { authStorage } from "../lib/authStorage";
import {
  Bell,
  FolderOpen,
  GraduationCap,
  ScrollText,
  UserCog,
  Users as UsersIcon,
  Sparkles,
} from "lucide-react";
import styles from "./DashboardPage.module.css";

interface StatItem {
  key: string;
  label: string;
  value: number;
  Icon: typeof UsersIcon;
  tone: StatCardTone;
}

export function DashboardPage() {
  const currentUser = authStorage.getUser();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getOverview();
      setOverview(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được dữ liệu thống kê";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 6 thẻ thống kê — ĐÚNG mapping từ BE, không tự ý bịa số liệu.
  const stats: StatItem[] = [
    {
      key: "totalUsers",
      label: "Tổng Users",
      value: overview?.users.total ?? 0,
      Icon: UsersIcon,
      tone: "primary",
    },
    {
      key: "totalStudents",
      label: "Tổng Students",
      value: overview?.users.byRole.STUDENT ?? 0,
      Icon: GraduationCap,
      tone: "success",
    },
    {
      key: "totalTeachers",
      label: "Tổng Teachers",
      value: overview?.users.byRole.TEACHER ?? 0,
      Icon: UserCog,
      tone: "accent",
    },
    {
      key: "totalNotifications",
      label: "Tổng Notifications",
      value: overview?.notifications.total ?? 0,
      Icon: Bell,
      tone: "warning",
    },
    {
      key: "totalFiles",
      label: "Tổng Files",
      value: overview?.files.total ?? 0,
      Icon: FolderOpen,
      tone: "info",
    },
    {
      key: "totalAuditLogs",
      label: "Tổng Audit Logs",
      value: overview?.auditLogs.total ?? 0,
      Icon: ScrollText,
      tone: "neutral",
    },
  ];

  // Format số với dấu phẩy ngăn hàng nghìn (1,234).
  const numberFormatter = new Intl.NumberFormat("vi-VN");

  return (
    <div className={styles.page}>
      {/* Phần chào mừng — luôn hiển thị, lấy từ authStorage không phụ thuộc API. */}
      <header className={styles.welcome}>
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
      </header>

      {/* Grid 6 thẻ thống kê */}
      {loadError ? (
        <div className={styles.errorWrap}>
          <Alert variant="error">{loadError}</Alert>
          <Button variant="secondary" size="md" onClick={load}>
            Thử lại
          </Button>
        </div>
      ) : (
        <section
          className={styles.grid}
          aria-label="Thống kê tổng quan"
          aria-busy={loading || undefined}
        >
          {stats.map((s) => (
            <StatCard
              key={s.key}
              icon={<s.Icon />}
              value={numberFormatter.format(s.value)}
              label={s.label}
              tone={s.tone}
              loading={loading}
            />
          ))}
        </section>
      )}
    </div>
  );
}
