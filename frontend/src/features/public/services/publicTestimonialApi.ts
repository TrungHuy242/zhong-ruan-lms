/**
 * publicTestimonialApi.ts — Public API cho Testimonial (dùng cho Homepage section).
 *
 * GET /api/public/testimonials?limit=N
 *   - BE sort theo displayOrder ASC, createdAt DESC.
 *   - Chỉ trả về testimonial đã published và chưa bị soft-delete.
 *   - FE tự quyết định lấy bao nhiêu (HomePage lấy 3).
 *
 * Response shape (BE trả trực tiếp, KHÔNG envelope):
 *   { testimonials: Testimonial[] }
 *
 * apiFetch tự unwrap `data` wrapper nếu có — ở đây BE không bọc `data`, nên
 * FE nhận nguyên `{ testimonials }` sau khi qua apiFetch (giữ nguyên).
 */

import { apiFetch } from "../../../shared/api";
import type { Testimonial } from "../../testimonials/types/testimonial.types";

export interface PublicTestimonialsResponse {
  testimonials: Testimonial[];
}

/**
 * GET /public/testimonials?limit=N
 *
 * @param limit - số lượng tối đa cần lấy (optional; BE cap 100).
 * @returns Mảng testimonial, có thể rỗng nếu Admin ẩn hết.
 */
export async function getPublicTestimonials(
  limit?: number
): Promise<Testimonial[]> {
  const path =
    limit && Number.isInteger(limit) && limit > 0
      ? `/public/testimonials?limit=${Math.min(100, limit)}`
      : "/public/testimonials";
  const data = await apiFetch<PublicTestimonialsResponse>(path);
  if (!data || !Array.isArray(data.testimonials)) {
    return [];
  }
  return data.testimonials;
}