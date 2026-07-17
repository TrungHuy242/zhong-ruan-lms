// frontend/scripts/generate-sitemap.js
//
// Sinh sitemap.xml cho Google Search Console / crawler.
//
// So với phiên bản tĩnh (frontend/public/sitemap.xml cũ):
//   - Danh sách URL giảng viên KHÔNG còn hard-code.
//   - BE là nguồn chân lý: script gọi GET /api/public/teachers và lặp qua
//     tất cả trang (paginated, limit=50) để liệt kê TẤT CẢ giảng viên đã
//     xuất bản — không chỉ featured — để Google biết trang tồn tại dù có
//     thể chưa được prerender.
//   - Các route tĩnh (5 marketing gốc + 3 khóa học) vẫn giữ danh sách cố
//     định — không phụ thuộc backend.
//
// ⚠ RÀNG BUỘC VẬN HÀNH (tương tự prerender.js):
//   - Backend PHẢI đang chạy lúc `npm run build` để có đủ URL giảng viên.
//   - Nếu BE offline: log cảnh báo, BỎ QUA phần teacher (sitemap chỉ có
//     route tĩnh), KHÔNG fail build. Admin có thể build lại sau khi BE lên.
//
// Thời điểm chạy: SAU `vite build`, cùng đợt với prerender.js. Đầu ra ghi
// vào BOTH:
//   - frontend/public/sitemap.xml  (cho vite copy qua dist/ lúc build)
//   - dist/sitemap.xml             (cho môi trường đã build sẵn)
//
// Vite mặc định copy toàn bộ public/ vào dist/, nên ghi vào public/ là
// đủ — nhưng ghi thẳng vào dist/ để chắc chắn không bị mất nếu build
// đã chạy trước đó rồi mới generate.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_BASE = process.env.SITE_BASE_URL || "https://zhongruan.vn";
const BACKEND_API_BASE = process.env.BACKEND_API_BASE || "http://localhost:5000/api";
const TEACHER_PAGE_LIMIT = 50;

// ===== Routes tĩnh (cố định, không phụ thuộc backend) =====
const STATIC_URLS = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/khoa-hoc", changefreq: "weekly", priority: "0.9" },
  { loc: "/khoa-hoc/hsk-1-2", changefreq: "weekly", priority: "0.9" },
  { loc: "/khoa-hoc/hsk-3-4", changefreq: "weekly", priority: "0.9" },
  { loc: "/khoa-hoc/hsk-5-6", changefreq: "weekly", priority: "0.9" },
  { loc: "/giang-vien", changefreq: "weekly", priority: "0.8" },
  { loc: "/bang-gia", changefreq: "monthly", priority: "0.7" },
  { loc: "/lien-he", changefreq: "monthly", priority: "0.6" },
];

/**
 * Lấy TẤT CẢ giảng viên đã published từ BE (lặp qua pagination).
 * Trả về mảng slug. Nếu lỗi → trả về [] và in cảnh báo, KHÔNG throw.
 */
async function fetchAllTeacherSlugs() {
  const all = [];
  let page = 1;
  let totalPages = 1;
  try {
    while (page <= totalPages) {
      const url = `${BACKEND_API_BASE}/public/teachers?page=${page}&limit=${TEACHER_PAGE_LIMIT}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        console.warn(
          `[sitemap] ⚠ BE trả ${res.status} khi gọi ${url} — bỏ qua phần teacher.`
        );
        return all;
      }
      const json = await res.json();
      const teachers = json?.data?.teachers ?? [];
      const pagination = json?.data?.pagination;
      if (!Array.isArray(teachers)) {
        console.warn(`[sitemap] ⚠ Response trang ${page} không hợp lệ.`);
        return all;
      }
      for (const t of teachers) {
        if (typeof t?.slug === "string" && t.slug.length > 0) {
          all.push(t.slug);
        }
      }
      // Cập nhật totalPages: dùng giá trị BE trả nếu có, fallback 1.
      if (pagination && typeof pagination.totalPages === "number") {
        totalPages = Math.max(1, pagination.totalPages);
      }
      page++;
      // Safety: không loop vô hạn
      if (page > 100) {
        console.warn(`[sitemap] ⚠ Đã fetch 100 trang, dừng lại để tránh infinite loop.`);
        break;
      }
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[sitemap] ⚠ Không fetch được danh sách giảng viên (${reason}).`);
    console.warn(`[sitemap]   Sitemap sẽ chỉ liệt kê ${STATIC_URLS.length} route tĩnh.`);
  }
  return all;
}

/**
 * Escape ký tự đặc biệt cho XML.
 */
function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSitemapXml(urls) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ];
  for (const u of urls) {
    lines.push(`  <url>`);
    lines.push(`    <loc>${escapeXml(u.loc)}</loc>`);
    lines.push(`    <lastmod>${escapeXml(u.lastmod)}</lastmod>`);
    lines.push(`    <changefreq>${escapeXml(u.changefreq)}</changefreq>`);
    lines.push(`    <priority>${escapeXml(u.priority)}</priority>`);
    lines.push(`  </url>`);
  }
  lines.push(`</urlset>`);
  lines.push(""); // trailing newline
  return lines.join("\n");
}

async function main() {
  const teacherSlugs = await fetchAllTeacherSlugs();
  const today = new Date().toISOString().slice(0, 10);

  // Build URL list
  const urls = STATIC_URLS.map((u) => ({
    ...u,
    loc: `${SITE_BASE}${u.loc}`,
    lastmod: today,
  }));

  for (const slug of teacherSlugs) {
    urls.push({
      loc: `${SITE_BASE}/giang-vien/${slug}`,
      lastmod: today,
      changefreq: "monthly",
      priority: "0.7",
    });
  }

  console.log(
    `[sitemap] Tổng URL: ${urls.length} (${STATIC_URLS.length} tĩnh + ${teacherSlugs.length} giảng viên)`
  );

  const xml = buildSitemapXml(urls);

  // Ghi vào BOTH public/sitemap.xml (để vite copy qua dist/) và dist/sitemap.xml
  // (cho case chạy script sau khi dist đã có sẵn).
  const targets = [
    path.resolve(__dirname, "../public/sitemap.xml"),
    path.resolve(__dirname, "../dist/sitemap.xml"),
  ];

  for (const target of targets) {
    try {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, xml, "utf-8");
      console.log(`[sitemap] wrote ${target}`);
    } catch (err) {
      console.warn(`[sitemap] Không ghi được ${target}: ${err.message}`);
    }
  }

  if (teacherSlugs.length === 0) {
    console.warn(
      `[sitemap] ⚠ Không có URL giảng viên nào — sitemap chỉ có route tĩnh.`
    );
    console.warn(
      `[sitemap]   Nếu muốn Google index các trang giảng viên, hãy build lại khi backend đang chạy.`
    );
    process.exitCode = 0; // KHÔNG fail build
  }
}

main().catch((err) => {
  console.error("[sitemap] ERROR:", err);
  process.exit(1);
});