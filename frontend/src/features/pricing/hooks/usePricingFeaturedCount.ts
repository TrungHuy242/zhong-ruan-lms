/**
 * usePricingFeaturedCount — hook đếm số pricing plan đang được đánh "Nổi bật".
 *
 * Dùng cho PricingFormPage để hiển thị cảnh báo khi user chọn thêm nổi bật.
 *
 * Hành vi:
 *   - Lấy tất cả pricing plans (1 page, limit 100 đủ dùng cho <100 plans).
 *   - Filter theo isFeatured.
 *   - Trừ đi plan hiện tại nếu đang edit (để không cảnh báo về chính nó).
 *   - Trả về số đếm để PricingFormPage render Alert cảnh báo.
 */

import { useEffect, useState } from "react";
import { listPricingPlans } from "../services/pricingApi";

export function usePricingFeaturedCount(excludePlanId: string | null): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listPricingPlans({ limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const featured = (res.plans ?? []).filter((p) => p.isFeatured);
        const adjusted = excludePlanId
          ? featured.filter((p) => String(p.id) !== excludePlanId).length
          : featured.length;
        setCount(adjusted);
      })
      .catch(() => {
        // Không block UI nếu lỗi — mặc định count=0
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [excludePlanId]);

  return count;
}
