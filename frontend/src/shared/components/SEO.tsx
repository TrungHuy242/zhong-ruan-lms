/**
 * SEO — component meta tags chuẩn cho mọi trang public.
 *
 * Dùng react-helmet-async nên hoạt động ổn ở cả SPA (HelmetProvider ở main.tsx)
 * và prerender (puppeteer đọc page.content() sau khi helmet apply xong).
 *
 * Mọi trang public BẮT BUỘC render <SEO> ở đầu để:
 *   - Title/description riêng cho từng trang (SEO).
 *   - og:image mặc định từ public/og-default.png (chia sẻ link có ảnh preview).
 *   - <html lang="vi"> đúng cho screen reader.
 */
import { Helmet } from "react-helmet-async";

export interface SEOProps {
  title: string;
  description: string;
  ogImage?: string;
  canonicalUrl?: string;
}

const SITE = "Zhong Ruan — Tiếng Trung Online";
// OG image mặc định dùng khi trang không truyền ogImage riêng. PHẢI tồn tại
// ở public/og-default.png (kích thước 1200x630px, < 8MB) — bằng không share
// link sẽ KHÔNG có ảnh preview trên Facebook/Zalo, mất tác dụng "thu hút"
// ngay ở bước chia sẻ.
const DEFAULT_OG_IMAGE = "/og-default.png";

export function SEO({ title, description, ogImage, canonicalUrl }: SEOProps) {
  const fullTitle = title.includes("Zhong Ruan") ? title : `${title} | ${SITE}`;
  const resolvedOgImage = ogImage ?? DEFAULT_OG_IMAGE;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedOgImage} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      <html lang="vi" />
    </Helmet>
  );
}