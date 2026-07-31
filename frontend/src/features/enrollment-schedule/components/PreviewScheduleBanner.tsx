/**
 * PreviewScheduleBanner — wrapper cho modal "Xem trước" trong Admin.
 *
 * Tái sử dụng <ScheduleDisplay> giống y hệt Public để đảm bảo preview chính xác.
 * pointer-events: none để user không bấm nhầm CTA trong modal preview.
 */

import type { EnrollmentSchedule } from "../types/enrollmentSchedule.types";
import { ScheduleDisplay } from "./ScheduleDisplay";

interface PreviewScheduleBannerProps {
  schedule: EnrollmentSchedule;
}

export function PreviewScheduleBanner({ schedule }: PreviewScheduleBannerProps) {
  return (
    <div style={{ pointerEvents: "none" }}>
      <ScheduleDisplay schedule={schedule} />
    </div>
  );
}
