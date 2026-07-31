/**
 * ScheduleDisplay — phần hiển thị layout "bảng lịch 2 cột" cho 1 EnrollmentSchedule.
 *
 * Tách riêng để:
 *  - Public component <EnrollmentScheduleBanner /> fetch + render <ScheduleDisplay schedule={data}/>;
 *  - Admin trang "Xem trước" render <PreviewScheduleBanner schedule={row}/> = <ScheduleDisplay schedule={row}/>;
 *  - Giữ 1 nguồn markup/CSS duy nhất — đảm bảo preview y hệt public.
 *
 * Bám sát editorial system (DESIGN.md §9):
 *   - ivory paper `--zr-paper`, hairline `--zr-rule`, brand-red + gold
 *   - 0 radius, 0 shadow, hairline borders
 *   - Display heading Source Serif 4 (no italic), body Be Vietnam Pro
 *   - CTA button: solid brand-red, uppercase + letter-spacing 0.08em
 *   - Phone numbers list ngang, icon Phone, tel: link trên mobile
 */

import { Phone } from "lucide-react";
import { Link } from "react-router-dom";
import type { EnrollmentSchedule } from "../types/enrollmentSchedule.types";
import styles from "../../public/components/EnrollmentScheduleBanner.module.css";

interface ScheduleDisplayProps {
  schedule: EnrollmentSchedule;
}

export function ScheduleDisplay({ schedule }: ScheduleDisplayProps) {
  const phoneItems = schedule.phoneNumbers ?? [];
  const courseItems = schedule.coursesEnrolling ?? [];

  return (
    <div className={styles.section} aria-labelledby="enrollment-schedule-title">
      <div className={styles.inner}>
        {/* Eyebrow */}
        <span className={styles.eyebrow}>Lịch khai giảng</span>

        {/* Heading */}
        <h2 id="enrollment-schedule-title" className={styles.heading}>
          {schedule.title}
        </h2>

        {/* Tagline (optional) */}
        {schedule.tagline ? (
          <p className={styles.tagline}>{schedule.tagline}</p>
        ) : null}

        <div className={styles.grid}>
          {/* Left column — Courses enrolling */}
          <div className={styles.col}>
            <span className={styles.colLabel}>Khóa đang tuyển sinh</span>
            {courseItems.length === 0 ? (
              <p className={styles.colEmpty}>Chưa cập nhật.</p>
            ) : (
              <ul className={styles.courseList}>
                {courseItems.map((c, idx) => (
                  <li key={`${c}-${idx}`} className={styles.courseItem}>
                    <span className={styles.courseOrdinal} aria-hidden="true">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.courseName}>{c}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right column — Schedule + phones + CTA */}
          <div className={styles.col}>
            <span className={styles.colLabel}>Lịch học theo khung giờ</span>
            <dl className={styles.scheduleList}>
              <div className={styles.scheduleRow}>
                <dt className={styles.scheduleKey}>Sáng</dt>
                <dd className={styles.scheduleValue}>
                  {schedule.morningTimes}
                </dd>
              </div>
              <div className={styles.scheduleRow}>
                <dt className={styles.scheduleKey}>Chiều</dt>
                <dd className={styles.scheduleValue}>
                  {schedule.afternoonTimes}
                </dd>
              </div>
              <div className={styles.scheduleRow}>
                <dt className={styles.scheduleKey}>Tối</dt>
                <dd className={styles.scheduleValue}>
                  {schedule.eveningTimes}
                </dd>
              </div>
              <div className={styles.scheduleRow}>
                <dt className={styles.scheduleKey}>Nhóm A</dt>
                <dd className={styles.scheduleValue}>
                  {schedule.scheduleGroupA}
                </dd>
              </div>
              <div className={styles.scheduleRow}>
                <dt className={styles.scheduleKey}>Nhóm B</dt>
                <dd className={styles.scheduleValue}>
                  {schedule.scheduleGroupB}
                </dd>
              </div>
            </dl>

            {schedule.note ? (
              <p className={styles.note}>{schedule.note}</p>
            ) : null}

            {phoneItems.length > 0 ? (
              <div className={styles.phoneBlock}>
                <span className={styles.phoneLabel}>Hotline tư vấn</span>
                <ul className={styles.phoneList}>
                  {phoneItems.map((p, idx) => (
                    <li key={`${p}-${idx}`} className={styles.phoneItem}>
                      <Phone size={14} aria-hidden="true" />
                      <a href={`tel:${p}`} className={styles.phoneLink}>
                        {p}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Link to={schedule.ctaLink} className={styles.ctaBtn}>
              {schedule.ctaText}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
