/**
 * enrollmentScheduleApi.ts — Admin API cho module EnrollmentSchedule.
 *
 * Endpoints:
 *   GET    /admin/enrollment-schedule             — list có pagination/sort
 *   GET    /admin/enrollment-schedule/:id         — chi tiết
 *   POST   /admin/enrollment-schedule             — tạo mới
 *   PUT    /admin/enrollment-schedule/:id         — cập nhật
 *   DELETE /admin/enrollment-schedule/:id         — soft-delete
 *   POST   /admin/enrollment-schedule/:id/restore — restore
 *   DELETE /admin/enrollment-schedule/:id/permanent — force-delete
 *
 * Backend route đã đăng ký ở backend/src/modules/enrollment-schedule/enrollment-schedule.admin.routes.js
 */

import { apiFetch, type ApiError } from "../../../shared/api";
import type {
  EnrollmentSchedule,
  EnrollmentSchedulePayload,
  ListEnrollmentSchedulesParams,
  PaginatedEnrollmentSchedules,
} from "../types/enrollmentSchedule.types";

export type {
  EnrollmentSchedule,
  EnrollmentSchedulePayload,
  ListEnrollmentSchedulesParams,
  PaginatedEnrollmentSchedules,
};

/** GET /admin/enrollment-schedule */
export async function listEnrollmentSchedules(
  params: ListEnrollmentSchedulesParams = {}
): Promise<PaginatedEnrollmentSchedules> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortDir) qs.set("sortDir", params.sortDir);
  const query = qs.toString();
  const url = `/admin/enrollment-schedule${query ? `?${query}` : ""}`;
  // Backend trả thẳng { schedules, pagination } — KHÔNG có wrapper { data }.
  // apiFetch auto-unwrap nếu có, nên payload thực = response gốc.
  return apiFetch<PaginatedEnrollmentSchedules>(url);
}

/** GET /admin/enrollment-schedule/:id */
export async function getEnrollmentScheduleById(id: string): Promise<EnrollmentSchedule> {
  return apiFetch<EnrollmentSchedule>(`/admin/enrollment-schedule/${id}`);
}

/** POST /admin/enrollment-schedule */
export async function createEnrollmentSchedule(
  payload: EnrollmentSchedulePayload
): Promise<EnrollmentSchedule> {
  return apiFetch<EnrollmentSchedule>("/admin/enrollment-schedule", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
}

/** PUT /admin/enrollment-schedule/:id */
export async function updateEnrollmentSchedule(
  id: string,
  payload: EnrollmentSchedulePayload
): Promise<EnrollmentSchedule> {
  return apiFetch<EnrollmentSchedule>(`/admin/enrollment-schedule/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
}

/** DELETE /admin/enrollment-schedule/:id — soft-delete (chuyển vào Trash). */
export async function deleteEnrollmentSchedule(id: string): Promise<void> {
  await apiFetch(`/admin/enrollment-schedule/${id}`, { method: "DELETE" });
}

/** POST /admin/enrollment-schedule/:id/restore */
export async function restoreEnrollmentSchedule(
  id: string
): Promise<{ id: string; restored: boolean }> {
  return apiFetch<{ id: string; restored: boolean }>(
    `/admin/enrollment-schedule/${id}/restore`,
    { method: "POST" }
  );
}

/** DELETE /admin/enrollment-schedule/:id/permanent — xoá cứng khỏi DB. */
export async function forceDeleteEnrollmentSchedule(id: string): Promise<void> {
  await apiFetch(`/admin/enrollment-schedule/${id}/permanent`, { method: "DELETE" });
}

export { type ApiError };
