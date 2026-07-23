/**
 * PricingPage — /bang-gia
 *
 * Trang bảng giá công khai.
 *
 * Luồng:
 *   - Gọi GET /public/pricing-plans (dữ liệu động từ Admin)
 *   - Grid PricingCard (mỗi card hiện tên gói, giá, quyền lợi, CTA)
 *   - Section chính sách tĩnh (PolicyCard x3)
 *   - FAQ accordion về học phí
 *   - Loading skeleton, Empty state, Error state
 *
 * Pattern tham chiếu: TeachersListPage (loading/empty/error states).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SEO } from "../../shared/components/SEO";
import { Breadcrumb } from "../../features/public/components/Breadcrumb";
import { PricingCard } from "../../features/public/components/PricingCard";
import { PolicyCard } from "../../features/public/components/PolicyCard";
import { FAQAccordion } from "../../features/public/components/FAQAccordion";
import { CTABanner } from "../../features/public/components/CTABanner";
import { Alert, Button } from "../../shared/components/ui";
import { ApiError } from "../../shared/api";
import {
  listPublicPricingPlans,
  type PublicPricingPlan,
} from "../../features/public/services/publicPricingApi";
import { policiesContent } from "../../features/public/data/policiesContent";
import { RotateCcw, Tag } from "lucide-react";
import styles from "./PricingPage.module.css";

interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

const PRICING_FAQ: FaqItem[] = [
  {
    id: 1,
    question: "Học phí có phát sinh thêm không?",
    answer:
      "Không. Học phí được công khai minh bạch trên bảng giá, không phát sinh chi phí ẩn. Các khoản phí khác (nếu có) như tài liệu học tập sẽ được thông báo rõ ràng trước khi bạn đăng ký.",
  },
  {
    id: 2,
    question: "Tôi có thể đổi từ lớp nhóm sang 1 kèm 1 không?",
    answer:
      "Có. Bạn có thể chuyển đổi giữa các gói học phí bất kỳ lúc nào. Khi chuyển sang gói 1 kèm 1, mức học phí sẽ được điều chỉnh theo bảng giá tương ứng. Vui lòng liên hệ giảng viên hoặc bộ phận tư vấn để được hỗ trợ.",
  },
  {
    id: 3,
    question: "Chính sách hoàn học phí áp dụng thế nào?",
    answer:
      "Nếu học không hiệu quả theo đúng cam kết đầu vào (VD: sau 4 buổi đầu tiên mà không có tiến bộ rõ rệt theo đánh giá của giảng viên), bạn sẽ được hoàn lại toàn bộ học phí đã đóng. Tham khảo chi tiết chính sách hoàn học phí hoặc liên hệ tư vấn để biết thêm.",
  },
];

export function PricingPage() {
  const [plans, setPlans] = useState<PublicPricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async (cancelled: { v: boolean }) => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await listPublicPricingPlans();
      if (cancelled.v) return;
      setPlans(result);
    } catch (err) {
      if (cancelled.v) return;
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Không tải được bảng giá";
      setLoadError(message);
      setPlans([]);
    } finally {
      if (!cancelled.v) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cancelled = { v: false };
    void load(cancelled);
    return () => {
      cancelled.v = true;
    };
  }, [reloadToken, load]);

  const isEmpty = useMemo(
    () => !loading && plans.length === 0 && !loadError,
    [loading, plans.length, loadError]
  );

  // Sort: featured plans first, then by displayOrder
  const sortedPlans = useMemo(
    () =>
      [...plans].sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return a.displayOrder - b.displayOrder;
      }),
    [plans]
  );

  return (
    <>
      <SEO
        title="Bảng giá khóa học tiếng Trung — Học Phí Minh Bạch | Zhong Ruan"
        description="Bảng học phí minh bạch cho từng khóa HSK, ưu đãi đăng ký sớm, chính sách hoàn học phí 100%. Không phát sinh chi phí ẩn."
      />

      <Breadcrumb items={[{ label: "Bảng giá" }]} />

      {/* ===== Hero ===== */}
      <section className={styles.hero}>
        <div className={styles.heroContainer}>
          <span className={styles.heroBadge}>Bảng giá</span>
          <h1 className={styles.heroHeading}>
            Học Phí Minh Bạch — Không Phát Sinh Chi Phí Ẩn
          </h1>
          <p className={styles.heroSubheading}>
            Cam kết hoàn học phí 100% nếu không hiệu quả. Bảo lưu không
            giới hạn. Đổi lịch linh hoạt trước 3 giờ.
          </p>
        </div>
      </section>

      {/* ===== Pricing Grid ===== */}
      <section className={styles.pricingSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Gói học phí</h2>
            <p className={styles.sectionSubtitle}>
              Chọn gói phù hợp với nhu cầu và mục tiêu học tập của bạn
            </p>
          </div>

          {loadError ? (
            <div className={styles.errorState} role="alert">
              <Alert variant="error" className={styles.alertSpacing}>
                {loadError}
              </Alert>
              <Button
                variant="secondary"
                size="md"
                leftIcon={<RotateCcw size={14} />}
                onClick={() => setReloadToken((n) => n + 1)}
              >
                Thử lại
              </Button>
            </div>
          ) : loading ? (
            <div className={styles.pricingGrid}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={styles.skeletonHeader} />
                  <div className={styles.skeletonPrice} />
                  <div className={styles.skeletonBenefits}>
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLine} />
                  </div>
                  <div className={styles.skeletonCta} />
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <div className={styles.emptyState}>
              <Tag size={48} aria-hidden="true" />
              <p className={styles.emptyTitle}>Chưa có bảng giá công khai</p>
              <p className={styles.emptyHint}>
                Bảng giá sẽ sớm được cập nhật. Vui lòng liên hệ để được tư
                vấn về học phí.
              </p>
              <Link to="/lien-he" className={styles.emptyCta}>
                Liên hệ tư vấn
              </Link>
            </div>
          ) : (
            <div className={styles.pricingGrid}>
              {sortedPlans.map((plan) => (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  featured={plan.isFeatured}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== Policies ===== */}
      <section className={styles.policiesSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Cam kết của chúng tôi</h2>
            <p className={styles.sectionSubtitle}>
              Học thử miễn phí và trải nghiệm trước khi đăng ký chính thức
            </p>
          </div>
          <div className={styles.policiesGrid}>
            {policiesContent.map((policy, idx) => (
              <PolicyCard
                key={idx}
                icon={policy.icon}
                title={policy.title}
                description={policy.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className={styles.faqSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Câu hỏi thường gặp</h2>
            <p className={styles.sectionSubtitle}>
              Giải đáp thắc mắc về học phí và chính sách tại Zhong Ruan
            </p>
          </div>
          <FAQAccordion items={PRICING_FAQ} />
        </div>
      </section>

      {/* ===== CTA Banner ===== */}
      <CTABanner
        headline="Sẵn sàng bắt đầu hành trình học tiếng Trung của bạn?"
        ctaLabel="Đăng ký học thử miễn phí"
        ctaTo="/register"
      />
    </>
  );
}
