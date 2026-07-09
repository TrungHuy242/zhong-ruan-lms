/**
 * dashboardApi — giao tiếp với backend cho trang Admin Dashboard.
 *
 * BE: GET /api/dashboard/overview
 *   Response sau khi apiFetch unwrap field `data`:
 *   {
 *     users:        { total, byRole: { STUDENT, TEACHER, ADMIN } },
 *     notifications:{ total },
 *     files:        { total },
 *     auditLogs:    { total }
 *   }
 *
 *   BE KHÔNG trả lastLogin trong endpoint này — không có field đó ở response.
 *   Nếu sau này BE mở rộng, có thể bổ sung ở đây mà không phải đổi UI.
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

export async function getOverview(): Promise<DashboardOverview> {
  return apiFetch<DashboardOverview>("/dashboard/overview");
}
