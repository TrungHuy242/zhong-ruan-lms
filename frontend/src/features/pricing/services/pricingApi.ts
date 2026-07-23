/**
 * pricingApi — giao tiếp với backend cho module Pricing Plans (Admin).
 *
 * Endpoints (BE):
 *   - GET    /admin/pricing-plans : list có search/filter/sort/pagination
 *                                   → trả { message, data: { plans, pagination } }
 *   - POST   /admin/pricing-plans : tạo mới
 *                                   → trả { message, data: { plan } }
 *   - GET    /admin/pricing-plans/:id : chi tiết
 *                                   → trả { message, data: { plan } }
 *   - PUT    /admin/pricing-plans/:id : cập nhật (cũng dùng cho toggle publish nhanh)
 *   - DELETE /admin/pricing-plans/:id : soft-delete
 *
 * Toggle nhanh isPublished/featured: tận dụng PUT với payload { isPublished } —
 * không thêm endpoint mới, BE update field độc lập OK.
 */

import { apiFetch } from "../../../shared/api";

export type PricingClassType = "GROUP" | "PRIVATE";
export type PricingUnit = "buổi" | "tháng" | "khóa";

export interface PricingPlan {
  id: string;
  name: string;
  classType: PricingClassType;
  price: number;
  originalPrice?: number;
  unit: PricingUnit;
  description?: string;
  benefits: string[];
  linkedCourseSlug?: string;
  isFeatured: boolean;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListPricingPlansParams {
  page?: number;
  limit?: number;
  sortBy?: PricingSortBy;
  sortOrder?: "asc" | "desc";
  search?: string;
  classType?: PricingClassType | "ALL";
  isFeatured?: "true" | "false" | "ALL";
  isPublished?: "true" | "false" | "ALL";
}

export type PricingSortBy =
  | "name"
  | "classType"
  | "price"
  | "isFeatured"
  | "isPublished"
  | "displayOrder"
  | "createdAt";

export interface PaginatedPricingPlans {
  plans: PricingPlan[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreatePricingPlanPayload {
  name: string;
  classType: PricingClassType;
  price: number;
  originalPrice?: number | null;
  unit: PricingUnit;
  description?: string;
  benefits: string[];
  linkedCourseSlug?: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  displayOrder?: number;
}

export interface UpdatePricingPlanPayload extends Partial<Omit<CreatePricingPlanPayload, "benefits">> {
  benefits?: string[];
}

export const PRICING_PAGE_SIZE = 20;

/**
 * GET /admin/pricing-plans — list có search/filter/sort/pagination server-side.
 */
export async function listPricingPlans(
  params: ListPricingPlansParams = {}
): Promise<PaginatedPricingPlans> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("keyword", params.search);
  if (params.classType && params.classType !== "ALL") qs.set("classType", params.classType);
  if (params.isFeatured && params.isFeatured !== "ALL") qs.set("isFeatured", params.isFeatured);
  if (params.isPublished && params.isPublished !== "ALL") qs.set("isPublished", params.isPublished);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.page) qs.set("page", String(params.page));
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);

  const path = `/admin/pricing-plans${qs.toString() ? `?${qs}` : ""}`;
  const data = await apiFetch<PaginatedPricingPlans>(path);
  if (!data || !Array.isArray(data.plans)) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data;
}

/**
 * POST /admin/pricing-plans — tạo pricing plan mới.
 */
export async function createPricingPlan(
  payload: CreatePricingPlanPayload
): Promise<PricingPlan> {
  const data = await apiFetch<{ plan: PricingPlan }>("/admin/pricing-plans", {
    method: "POST",
    body: payload,
  });
  if (!data?.plan) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.plan;
}

/**
 * GET /admin/pricing-plans/:id — chi tiết 1 pricing plan.
 */
export async function getPricingPlan(id: string): Promise<PricingPlan> {
  const data = await apiFetch<{ plan: PricingPlan }>(`/admin/pricing-plans/${id}`);
  if (!data?.plan) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.plan;
}

/**
 * PUT /admin/pricing-plans/:id — cập nhật pricing plan.
 * Partial payload OK (BE check undefined).
 */
export async function updatePricingPlan(
  id: string,
  payload: UpdatePricingPlanPayload
): Promise<PricingPlan> {
  const data = await apiFetch<{ plan: PricingPlan }>(`/admin/pricing-plans/${id}`, {
    method: "PUT",
    body: payload,
  });
  if (!data?.plan) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.plan;
}

/**
 * DELETE /admin/pricing-plans/:id — soft-delete 1 plan.
 */
export async function deletePricingPlan(
  id: string
): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/pricing-plans/${id}`, { method: "DELETE" });
}

/**
 * Format giá tiền VND với dấu phân cách nghìn.
 */
export function formatVND(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

/**
 * Parse string giá VND (đã format) về number.
 * VD: "1.500.000" → 1500000
 */
export function parseVND(value: string): number {
  return Number(value.replace(/\./g, ""));
}
