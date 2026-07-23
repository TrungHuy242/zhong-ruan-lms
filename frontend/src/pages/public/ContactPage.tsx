/**
 * ContactPage — Trang liên hệ công khai (/lien-he).
 *
 * Bố cục:
 *   - Hero (badge + h1 + subtitle) ở trên cùng, full-width.
 *   - Bên dưới: 2 cột trên desktop
 *       Trái: <ContactForm> trong Card.
 *       Phải: <ContactInfo> (aside thông tin tĩnh).
 *     Mobile: xếp dọc — form trước, info sau.
 *
 * SEO: dùng <SEO> chuẩn (react-helmet-async) đã được cấu hình sẵn.
 * Prerender: route /lien-he đã có trong scripts/prerender.js STATIC_ROUTES.
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

      <section className={styles.hero}>
        <span className={styles.badge}>Liên hệ</span>
        <h1 className={styles.title}>Liên hệ tư vấn</h1>
        <p className={styles.subtitle}>
          Bạn đang cân nhắc theo học tiếng Trung? Hãy để lại thông tin — chúng tôi
          sẽ liên hệ tư vấn lộ trình phù hợp trong vòng 24 giờ làm việc.
        </p>
      </section>

      <section className={styles.grid}>
        <Card padding="lg" className={styles.formCard}>
          <header className={styles.formHeader}>
            <h2 className={styles.formTitle}>Gửi yêu cầu tư vấn</h2>
            <p className={styles.formSubtitle}>
              Điền form bên dưới, đội ngũ Zhong Ruan sẽ liên hệ lại sớm nhất.
            </p>
          </header>
          <ContactForm />
        </Card>

        <ContactInfo />
      </section>
    </>
  );
}
