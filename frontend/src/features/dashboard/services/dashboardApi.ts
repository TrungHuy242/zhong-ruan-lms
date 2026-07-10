/**
 * dashboardApi — giao tiếp với backend cho trang Admin Dashboard.
 *
 * BE endpoints:
 *
 * 1) GET /api/dashboard/overview
 *    Response sau khi apiFetch unwrap field `data`:
 *    {
 *      users:         { total, byRole: { STUDENT, TEACHER, ADMIN } },
 *      notifications: { total },
 *      files:         { total },
 *      auditLogs:     { total }
 *    }
 *    BE KHÔNG trả dữ liệu kỳ trước ở endpoint này — % so sánh sẽ được FE
 *    tính từ monthly (xem MonthlyStats bên dưới).
 *
 * 2) GET /api/dashboard/stats/monthly?months=6
 *    Time-series 3 chỉ số (users/files/notifications) theo tháng, khoảng N tháng
 *    gần nhất (mặc định 6, tối đa 12).
 *
 *    Response shape (sau apiFetch unwrap `data`):
 *    {
 *      months:        ["2026-02", "2026-03", ...],
 *      users:         [number, ...],
 *      files:         [number, ...],
 *      notifications: [number, ...],
 *      generatedAt:   string,
 *      range:         { from: string, to: string }
 *    }
 */

import { apiFetch } from "../../../shared/api";

export interface DashboardOverview {
  users: {
    total: number;
    byRole: {
      STUDENT: number;
      TEACHER: number;
      ADMIN: number;
    };
  };
  notifications: { total: number };
  files: { total: number };
  auditLogs: { total: number };
}

export interface MonthlyStats {
  months: string[];
  users: number[];
  files: number[];
  notifications: number[];
  generatedAt: string;
  range: { from: string; to: string };
}

export async function getOverview(): Promise<DashboardOverview> {
  return apiFetch<DashboardOverview>("/dashboard/overview");
}

/**
 * Lấy thống kê theo tháng cho 3 chỉ số. Truyền `months` tuỳ chọn (1–12),
 * mặc định 6. Service clamp invalid value về [1, 12].
 */
export async function getMonthlyStats(months = 6): Promise<MonthlyStats> {
  const safe = Math.max(1, Math.min(12, Math.floor(months || 6)));
  return apiFetch<MonthlyStats>(`/dashboard/stats/monthly?months=${safe}`);
}