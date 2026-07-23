/**
 * PricingCard — card hiển thị gói bảng giá trên trang public.
 *
 * Variant:
 *   - Default: card thường
 *   - Featured: viền brand-primary, badge "Phổ biến nhất", scale nhẹ
 *
 * Props:
 *   - plan: PublicPricingPlan data
 *   - featured: boolean — plan này có phải là featured hay không
 */
import { Link } from "react-router-dom";
import { Check, Star } from "lucide-react";
import type { PublicPricingPlan } from "../services/publicPricingApi";
import { formatVND } from "../services/publicPricingApi";
import styles from "./PricingCard.module.css";

interface PricingCardProps {
  plan: PublicPricingPlan;
  featured?: boolean;
}

const CLASS_TYPE_LABELS: Record<string, string> = {
  GROUP: "Lớp nhóm",
  PRIVATE: "1 kèm 1",
};

export function PricingCard({ plan, featured = false }: PricingCardProps) {
  const hasDiscount = plan.originalPrice && plan.originalPrice > plan.price;

  return (
    <div className={`${styles.card} ${featured ? styles.cardFeatured : ""}`}>
      {featured && (
        <div className={styles.featuredBadge}>
          <Star size={14} />
          <span>Phổ biến nhất</span>
        </div>
      )}

      <div className={styles.header}>
        <span className={styles.classType}>
          {CLASS_TYPE_LABELS[plan.classType] ?? plan.classType}
        </span>
        <h3 className={styles.name}>{plan.name}</h3>
        {plan.description && (
          <p className={styles.description}>{plan.description}</p>
        )}
      </div>

      <div className={styles.priceBlock}>
        <div className={styles.priceRow}>
          <span className={styles.price}>{formatVND(plan.price)}</span>
          <span className={styles.currency}>đ</span>
        </div>
        {hasDiscount && (
          <span className={styles.originalPrice}>
            {formatVND(plan.originalPrice!)}đ / {plan.unit}
          </span>
        )}
        <span className={styles.unit}>/ {plan.unit}</span>
      </div>

      <ul className={styles.benefits}>
        {plan.benefits.map((benefit, idx) => (
          <li key={idx} className={styles.benefit}>
            <Check size={16} className={styles.checkIcon} aria-hidden="true" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <Link to="/register" className={styles.cta}>
        Đăng ký học thử miễn phí
      </Link>
    </div>
  );
}
