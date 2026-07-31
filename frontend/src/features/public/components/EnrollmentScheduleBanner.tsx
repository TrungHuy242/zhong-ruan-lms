/**
 * EnrollmentScheduleBanner — block "Lịch khai giảng" trên Trang chủ Public.
 *
 * Flow:
 *  - Mount: gọi GET /public/enrollment-schedule.
 *  - Loading / lỗi / null → return null (ẩn hoàn toàn, KHÔNG để trống khoảng trắng).
 *  - Có data → render <ScheduleDisplay> (component chia sẻ với Admin Preview).
 */

import { useEffect, useState } from "react";
import { getPublicEnrollmentSchedule } from "../services/publicEnrollmentScheduleApi";
import type { EnrollmentSchedule } from "../../enrollment-schedule/types/enrollmentSchedule.types";
import { ScheduleDisplay } from "../../enrollment-schedule/components/ScheduleDisplay";

export function EnrollmentScheduleBanner() {
  const [schedule, setSchedule] = useState<EnrollmentSchedule | null | undefined>(
    undefined
  );

  useEffect(() => {
    let cancelled = false;
    getPublicEnrollmentSchedule()
      .then((data) => {
        if (!cancelled) setSchedule(data);
      })
      .catch(() => {
        if (!cancelled) setSchedule(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Loading hoặc không có data → ẩn hoàn toàn
  if (schedule === undefined) return null;
  if (schedule === null) return null;

  return <ScheduleDisplay schedule={schedule} />;
}
