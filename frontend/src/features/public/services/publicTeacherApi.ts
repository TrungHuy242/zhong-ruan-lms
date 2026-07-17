/**
 * publicTeacherApi — giao tiếp public với backend cho module Teacher.
 *
 * Endpoints (BE - backend/src/modules/teachers/teacher.public.controller.js):
 *   - GET /public/teachers       → { data: { teachers, pagination } }
 *   - GET /public/teachers/featured → { data: { teachers, total } }
 *   - GET /public/teachers/:slug → { data: { teacher } } (404 nếu không tồn tại)
 *
 * KHÔNG cần auth (route public). Tất cả teacher trả về chỉ gồm isPublished=true,
 * deletedAt=null — BE tự filter.
 *
 * FE chỉ unwrap `data` 1 lần (apiFetch tự lo), nên:
 *   - listTeachers → trả về { teachers, pagination } (đã unwrap data wrapper).
 *   - getPublicTeacherBySlug → trả về Teacher.
 */

import { apiFetch } from "../../../shared/api";

/** Public shape của Teacher (subset admin — BE exclude isPublished, deletedAt). */
export interface PublicTeacher {
  id: string;
  fullName: string;
  slug: string;
  title: string;
  bio: string;
  bioShort: string;
  avatarUrl: string | null;
  yearsOfExperience: number | null;
  specialties: string[];
  isFeatured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedPublicTeachers {
  teachers: PublicTeacher[];
  pagination: PaginationMeta;
}

export interface ListPublicTeachersParams {
  /** Tìm theo fullName/title/bioShort. */
  keyword?: string;
  /** Lọc theo 1 specialty cụ thể (BE: specialties[?]=has). */
  specialty?: string;
  /** Trang (1-indexed, mặc định 1). */
  page?: number;
  /** Số item/trang (BE chấp nhận 10/20/50). */
  limit?: 10 | 20 | 50;
}

export async function listPublicTeachers(
  params: ListPublicTeachersParams = {}
): Promise<PaginatedPublicTeachers> {
  const qs = new URLSearchParams();
  if (params.keyword) qs.set("keyword", params.keyword);
  if (params.specialty) qs.set("specialty", params.specialty);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.page) qs.set("page", String(params.page));

  const path = `/public/teachers${qs.toString() ? `?${qs}` : ""}`;
  const data = await apiFetch<PaginatedPublicTeachers>(path);
  if (!data || !Array.isArray(data.teachers)) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data;
}

/**
 * GET /public/teachers/featured — danh sách giảng viên nổi bật (isFeatured=true).
 * Trả về cùng shape nhưng không có pagination — BE limit cứng (mặc định 6).
 */
export async function listFeaturedPublicTeachers(
  limit = 6
): Promise<PublicTeacher[]> {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 6));
  const data = await apiFetch<{ teachers: PublicTeacher[]; total: number }>(
    `/public/teachers/featured?limit=${safeLimit}`
  );
  return Array.isArray(data?.teachers) ? data.teachers : [];
}

/**
 * GET /public/teachers/:slug — chi tiết 1 giảng viên.
 * Throw ApiError 404 nếu slug không tồn tại hoặc teacher chưa publish.
 */
export async function getPublicTeacherBySlug(slug: string): Promise<PublicTeacher> {
  const data = await apiFetch<{ teacher: PublicTeacher }>(
    `/public/teachers/${encodeURIComponent(slug)}`
  );
  if (!data?.teacher) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.teacher;
}