/**
 * publicPricingApi — giao tiếp public với backend cho module Pricing Plans.
 *
 * Endpoints (BE):
 *   - GET /api/public/pricing-plans → { data: { plans } }
 *
 * KHÔNG cần auth (route public). BE trả về chỉ gồm isPublished=true.
 *
 * Transform: backend dùng features/priceUnit, frontend dùng benefits/unit.
 */

import { apiFetch } from "../../../shared/api";

export type PricingClassType = "GROUP" | "PRIVATE";
export type PricingUnit = "buổi" | "tháng" | "khóa";

export interface PublicPricingPlan {
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
  displayOrder: number;
}

// Raw response từ backend (backend dùng features/priceUnit)
interface BackendPricingPlan {
  id: string;
  name: string;
  classType: PricingClassType;
  price: number;
  priceUnit: string;
  originalPrice?: number;
  description?: string;
  features: string[];
  courseSlug?: string;
  isFeatured: boolean;
  displayOrder: number;
}

interface BackendResponse {
  plans: BackendPricingPlan[];
}

/**
 * GET /public/pricing-plans — lấy danh sách bảng giá public.
 */
export async function listPublicPricingPlans(): Promise<PublicPricingPlan[]> {
  const data = await apiFetch<BackendResponse>("/public/pricing-plans");
  if (!data || !Array.isArray(data.plans)) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  // Transform backend fields → frontend props:
  //   features → benefits, priceUnit → unit
  return data.plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    classType: plan.classType,
    price: plan.price,
    originalPrice: plan.originalPrice,
    unit: plan.priceUnit as PricingUnit,
    description: plan.description,
    benefits: Array.isArray(plan.features) ? plan.features : [],
    linkedCourseSlug: plan.courseSlug,
    isFeatured: plan.isFeatured,
    displayOrder: plan.displayOrder,
  }));
}

/**
 * Format giá tiền VND với dấu phân cách nghìn.
 */
export function formatVND(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}
