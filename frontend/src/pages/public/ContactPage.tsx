/**
 * ContactPage — Trang liên hệ công khai (/lien-he).
 *
 * Macrostructure: Workbench (composer-left + reference-right)
 * Theme: editorial — locked từ design.md §9
 * System diff: container count (2-col asymmetric surface) vs PricingPage Quote-Led (1-col narrative)
 *
 * Bố cục GIỮ NGUYÊN (constraint #3):
 *   - Hero (eyebrow + h1 + lede) ở trên cùng.
 *   - Bên dưới: 2 cột trên desktop (form trái | info phải).
 *   - Mobile: xếp dọc — form trước, info sau.
 *
 * SEO: <SEO> chuẩn + 1 <h1> duy nhất (constraint #4).
 *
 * Lint sentinel: ContactForm.tsx + ContactInfo.tsx KHÔNG đụng tới (constraint #1, #2).
 * Chỉ đổi className keys + bọc composer head mới ở page level.
 *
 * Composer side: <Card padding="lg"> bọc ContactForm + page-level composer head
 *   (.composerTitle + .composerSubtitle) — Card bị override bởi .surface để
 *   thành flat hairline frame (border-top brand-red, 0 radius, 0 shadow).
 *
 * Reference side: <ContactInfo /> render free-floating <aside.panel> có sẵn
 *   padding + border-top brand-gold (đã redesign trong ContactInfo.module.css).
 *   KHÔNG bọc Card ở đây để tránh double chrome.
 */
import { Card } from "../../shared/components/ui";
import { SEO } from "../../shared/components/SEO";
import { ContactForm } from "../../features/public/components/ContactForm";
import { ContactInfo } from "../../features/public/components/ContactInfo";
import styles from "./ContactPage.module.css";

export function ContactPage() {
  return (
    <>
      <SEO
        title="Liên hệ tư vấn khóa học — Zhong Ruan"
        description="Gửi yêu cầu tư vấn khoá học tiếng Trung cho Zhong Ruan. Hỗ trợ qua Zalo 0795 508 242, hotline và email huytruong061004@gmail.com. Địa chỉ 110 Lê Sỹ, Đà Nẵng."
      />

      <section className={styles.page}>
        <div className={styles.container}>
          <header className={styles.masthead}>
            <span className={styles.eyebrow}>Liên hệ</span>
            <h1 className={styles.title}>
              Liên hệ <span className={styles.titleAccent}>tư vấn</span>
            </h1>
            <p className={styles.lede}>
              Bạn đang cân nhắc theo học tiếng Trung? Hãy để lại thông tin — chúng tôi
              sẽ liên hệ tư vấn lộ trình phù hợp trong vòng 24 giờ làm việc.
            </p>
          </header>

          <section className={styles.workbench}>
            <Card padding="lg" className={styles.surface}>
              <header className={styles.composerHead}>
                <h2 className={styles.composerTitle}>Gửi yêu cầu tư vấn</h2>
                <p className={styles.composerSubtitle}>
                  Điền form bên dưới, đội ngũ Zhong Ruan sẽ liên hệ lại sớm nhất.
                </p>
              </header>
              <ContactForm />
            </Card>

            <ContactInfo />
          </section>
        </div>
      </section>
    </>
  );
}
