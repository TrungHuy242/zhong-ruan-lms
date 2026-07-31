/**
 * enrollmentSchedule.types.ts — Shared types cho EnrollmentSchedule module (Admin + Public).
 *
 * Singleton-style: thường chỉ 1 bản ghi published ở displayOrder thấp nhất
 * — nhưng API vẫn cho phép nhiều bản ghi để Admin xem lịch sử các đợt.
 */

export interface EnrollmentSchedule {
  id: string;
  title: string;
  coursesEnrolling: string[];
  morningTimes: string;
  afternoonTimes: string;
  eveningTimes: string;
  scheduleGroupA: string;
  scheduleGroupB: string;
  note: string | null;
  tagline: string | null;
  ctaText: string;
  ctaLink: string;
  phoneNumbers: string[];
  isPublished: boolean;
  displayOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export type EnrollmentSchedulePayload = {
  title?: string;
  coursesEnrolling?: string[];
  morningTimes?: string;
  afternoonTimes?: string;
  eveningTimes?: string;
  scheduleGroupA?: string;
  scheduleGroupB?: string;
  note?: string | null;
  tagline?: string | null;
  ctaText?: string;
  ctaLink?: string;
  phoneNumbers?: string[];
  isPublished?: boolean;
  displayOrder?: number;
};

export type ListEnrollmentSchedulesParams = {
  page?: number;
  limit?: number;
  sortBy?: "displayOrder" | "createdAt" | "title" | "updatedAt";
  sortDir?: "asc" | "desc";
};

export type PaginatedEnrollmentSchedules = {
  schedules: EnrollmentSchedule[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
