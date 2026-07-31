/**
 * publicEnrollmentScheduleApi.ts — Public API cho EnrollmentSchedule (dùng cho Homepage banner).
 *
 * Singleton: GET /public/enrollment-schedule trả về DUY NHẤT 1 bản ghi đang active
 * (displayOrder thấp nhất + createdAt mới nhất). Nếu không có bản published nào,
 * backend trả { schedule: null } — FE render ẩn hoàn toàn.
 */

import { apiFetch } from "../../../shared/api";
import type { EnrollmentSchedule } from "../../enrollment-schedule/types/enrollmentSchedule.types";

export interface PublicEnrollmentScheduleResponse {
  schedule: EnrollmentSchedule | null;
}

/** GET /public/enrollment-schedule */
export async function getPublicEnrollmentSchedule(): Promise<EnrollmentSchedule | null> {
  const res = await apiFetch<PublicEnrollmentScheduleResponse>("/public/enrollment-schedule");
  return res.schedule ?? null;
}
