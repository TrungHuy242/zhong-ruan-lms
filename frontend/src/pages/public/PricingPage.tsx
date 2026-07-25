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
 * Hallmark · Quote-Led macrostructure (round 26-07 redesign):
 *   - Pull-quote hero (lead voice owns the fold)
 *   - 3-promise row (hairline rules)
 *   - Pricing grid (4-col → 2-col → 1-col, featured brand-red border-top)
 *   - Policies (3-col → 1-col)
 *   - FAQ + CTA
 *
 * Pattern tham chiếu: macrostructure 09 - Quote-Led (references/macrostructures/09-quote-led.md).
 * System locked: design.md §9 (palette/typography/letter-spacing).
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
import { RotateCcw } from "lucide-react";
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

      {/* ===== MASTHEAD — Quote-Led register =====
          Cấu trúc ngữ nghĩa:
            eyebrow (kicker) → <blockquote> display-italic quote (lede)
            → <h1> roman serif (page identity) → sub → attribution → 3-promise row
          Gate 38a: italic chỉ ở blockquote body, không phải heading.
          SEO: <h1> giữ 1 duy nhất, hiển thị rõ cho cả người + bot. */}
      <section className={styles.masthead}>
        <div className={styles.mastheadInner}>
          <p className={styles.mastheadEyebrow}>Bảng giá · Học kỳ 2026</p>

          <blockquote className={styles.pullQuote}>
            <span className={styles.pullQuoteMark} aria-hidden="true">“</span>
            <p className={styles.pullQuoteText}>
              Học phí là một lời hứa — hứa rằng bạn sẽ tiến bộ, hoặc chúng tôi
              hoàn lại.
            </p>
          </blockquote>

          <h1 className={styles.mastheadTitle}>
            Học Phí Minh Bạch —{" "}
            <span className={styles.mastheadTitleAccent}>
              Không Phát Sinh Chi Phí Ẩn
            </span>
          </h1>

          <p className={styles.mastheadSub}>
            Cam kết hoàn học phí 100% nếu không hiệu quả. Bảo lưu không giới
            hạn. Đổi lịch linh hoạt trước 3 giờ.
          </p>

          <div className={styles.pullQuoteAttribution}>
            <span className={styles.pullQuoteAttributionName}>
              Học viện Zhong Ruan
            </span>
            <span className={styles.pullQuoteAttributionRole}>
              Tuyên ngôn giáo dục
            </span>
          </div>

          <div className={styles.promises}>
            <div className={styles.promise}>
              <span className={styles.promiseLabel}>Cam kết 01</span>
              <p className={styles.promiseValue}>Minh bạch tuyệt đối</p>
            </div>
            <div className={styles.promiseRule} aria-hidden="true" />
            <div className={styles.promise}>
              <span className={styles.promiseLabel}>Cam kết 02</span>
              <p className={styles.promiseValue}>Hoàn 100% nếu không hiệu quả</p>
            </div>
            <div className={styles.promiseRule} aria-hidden="true" />
            <div className={styles.promise}>
              <span className={styles.promiseLabel}>Cam kết 03</span>
              <p className={styles.promiseValue}>Bảo lưu không thời hạn</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Pricing Grid ===== */}
      <section className={`${styles.section} ${styles.sectionWhite}`}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Gói học phí</p>
            <h2 className={styles.sectionTitle}>
              Bốn gói — <span className={styles.sectionTitleAccent}>một chuẩn</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Chọn gói phù hợp với nhu cầu và mục tiêu học tập của bạn. Mọi gói
              đều đồng giá 90.000đ/buổi, học cùng giảng viên Thạc sĩ, Tiến sĩ.
            </p>
          </header>

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
              {[0, 1, 2, 3].map((i) => (
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
              <p className={styles.emptyEyebrow}>Trống</p>
              <h3 className={styles.emptyTitle}>Chưa có bảng giá công khai</h3>
              <p className={styles.emptyHint}>
                Bảng giá sẽ sớm được cập nhật. Vui lòng liên hệ để được tư vấn
                về học phí và lộ trình học tập phù hợp.
              </p>
              <Link to="/lien-he" className={styles.emptyLink}>
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
      <section className={`${styles.section} ${styles.sectionIvory}`}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Cam kết của chọn người</p>
            <h2 className={styles.sectionTitle}>
              Học thử miễn phí — và <span className={styles.sectionTitleAccent}>ba điều sau đây</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Học thử miễn phí và trải nghiệm trước khi đăng ký chính thức
            </p>
          </header>
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
      <section className={`${styles.section} ${styles.sectionWhite}`}>
        <div className={styles.container}>
          <header className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Câu hỏi thường gặp</p>
            <h2 className={styles.sectionTitle}>
              Về học phí — <span className={styles.sectionTitleAccent}>trước khi đăng ký</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              Giải đáp thắc mắc về học phí và chính sách tại Zhong Ruan
            </p>
          </header>
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
