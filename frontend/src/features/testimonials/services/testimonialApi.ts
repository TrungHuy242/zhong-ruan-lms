/**
 * testimonialApi — giao tiếp với backend cho module Testimonial (Admin).
 *
 * Endpoints (BE - backend/src/modules/testimonials/):
 *   - GET    /admin/testimonials       : list có search/filter/sort/pagination
 *                                        → trả { message, data: { testimonials, pagination } }
 *   - POST   /admin/testimonials       : tạo mới
 *                                        → trả { message, data: { testimonial } }
 *   - GET    /admin/testimonials/:id   : chi tiết
 *                                        → trả { message, data: { testimonial } }
 *   - PUT    /admin/testimonials/:id   : cập nhật (cũng dùng cho toggle publish nhanh)
 *   - DELETE /admin/testimonials/:id   : soft-delete
 *   - POST   /admin/testimonials/:id/restore : khôi phục từ thùng rác
 *   - DELETE /admin/testimonials/:id/force   : hard-delete (vĩnh viễn)
 *
 * Toggle nhanh isPublished: tận dụng PUT với payload { isPublished } —
 * không thêm endpoint mới, BE update field độc lập OK.
 *
 * BE trả về key "testimonial" (số ít) cho POST/GET/PUT/DELETE.
 */

import { apiFetch } from "../../../shared/api";
import {
  uploadFileRaw,
  type UploadFileRawOptions,
} from "../../files/services/fileApi";
import type {
  CreateTestimonialPayload,
  ListTestimonialsParams,
  PaginatedTestimonials,
  Testimonial,
  TestimonialMutationResult,
  UpdateTestimonialPayload,
} from "../types/testimonial.types";

export type {
  CreateTestimonialPayload,
  ListTestimonialsParams,
  PaginatedTestimonials,
  Testimonial,
  TestimonialMutationResult,
  UpdateTestimonialPayload,
  TestimonialSortBy,
  SortOrder,
} from "../types/testimonial.types";
export {
  TESTIMONIAL_AVAILABLE_COLUMN_KEYS,
  TESTIMONIAL_LOCKED_COLUMN_KEYS,
  TESTIMONIAL_PAGE_SIZE,
  TESTIMONIAL_SORT_LABELS,
} from "../constants/testimonial.constants";

// ===== URL helper =====
//
// BE serve static ở /uploads/<storedName>. Khi upload qua POST /upload
// (generic), response trả UploadedFile { storedName, ... } — FE tự build URL
// để hiển thị preview + lưu vào field avatarUrl.
export function getTestimonialAvatarUrl(
  storedName: string | null | undefined
): string | null {
  if (!storedName) return null;
  return `/uploads/${storedName}`;
}

/**
 * GET /admin/testimonials — list có search/filter/sort/pagination server-side.
 *
 * BE parse query string theo `keyword` (search) và field riêng (isFeatured/isPublished).
 * Lưu ý: BE chưa hỗ trợ filter deleted riêng — admin thấy cả deleted + not-deleted.
 */
export async function listTestimonials(
  params: ListTestimonialsParams = {}
): Promise<PaginatedTestimonials> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("keyword", params.search);
  if (params.isFeatured) qs.set("isFeatured", params.isFeatured);
  if (params.isPublished) qs.set("isPublished", params.isPublished);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.page) qs.set("page", String(params.page));
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);

  const path = `/admin/testimonials${qs.toString() ? `?${qs}` : ""}`;
  const data = await apiFetch<PaginatedTestimonials>(path);
  if (!data || !Array.isArray(data.testimonials)) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data;
}

/**
 * POST /admin/testimonials — tạo testimonial mới.
 * BE nhận: studentName, courseInfo?, content, rating?, avatarUrl?, source?,
 *          isFeatured, isPublished, displayOrder.
 */
export async function createTestimonial(
  payload: CreateTestimonialPayload
): Promise<Testimonial> {
  const data = await apiFetch<{ testimonial: Testimonial }>(
    "/admin/testimonials",
    { method: "POST", body: payload }
  );
  if (!data?.testimonial) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.testimonial;
}

/**
 * GET /admin/testimonials/:id — chi tiết 1 testimonial.
 */
export async function getTestimonial(id: string): Promise<Testimonial> {
  const data = await apiFetch<{ testimonial: Testimonial }>(
    `/admin/testimonials/${id}`
  );
  if (!data?.testimonial) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.testimonial;
}

/**
 * PUT /admin/testimonials/:id — cập nhật testimonial. Partial payload OK (BE check undefined).
 *
 * Cũng dùng để toggle nhanh isPublished/featured: truyền field đó với giá trị mới.
 */
export async function updateTestimonial(
  id: string,
  payload: UpdateTestimonialPayload
): Promise<Testimonial> {
  const data = await apiFetch<{ testimonial: Testimonial }>(
    `/admin/testimonials/${id}`,
    { method: "PUT", body: payload }
  );
  if (!data?.testimonial) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.testimonial;
}

/**
 * Soft-delete 1 testimonial. DELETE /admin/testimonials/:id.
 */
export async function deleteTestimonial(
  id: string
): Promise<TestimonialMutationResult> {
  return apiFetch(`/admin/testimonials/${id}`, { method: "DELETE" });
}

/**
 * Khôi phục testimonial đã bị soft-delete. POST /admin/testimonials/:id/restore.
 */
export async function restoreTestimonial(
  id: string
): Promise<TestimonialMutationResult> {
  return apiFetch(`/admin/testimonials/${id}/restore`, { method: "POST" });
}

/**
 * Hard-delete vĩnh viễn. DELETE /admin/testimonials/:id/force.
 * Cẩn thận — không khôi phục được.
 */
export async function forceDeleteTestimonial(
  id: string
): Promise<{ id: string; hardDeleted: boolean }> {
  return apiFetch(`/admin/testimonials/${id}/force`, { method: "DELETE" });
}

/**
 * Upload ảnh đại diện qua API upload chung POST /upload.
 * Trả về { storedName, url }. Caller lưu `url` vào field avatarUrl.
 */
export interface UploadTestimonialAvatarOptions
  extends UploadFileRawOptions {}

export interface UploadedTestimonialAvatar {
  storedName: string;
  url: string;
}

export async function uploadTestimonialAvatar(
  file: File,
  opts: UploadTestimonialAvatarOptions = {}
): Promise<UploadedTestimonialAvatar> {
  const uploaded = await uploadFileRaw(file, opts);
  const url = getTestimonialAvatarUrl(uploaded.storedName);
  if (!url) {
    throw new Error("Không lấy được URL ảnh sau khi upload");
  }
  return { storedName: uploaded.storedName, url };
}