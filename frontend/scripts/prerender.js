// frontend/scripts/prerender.js
//
// Sau khi `vite build` sinh dist/index.html (rỗng SPA), script này:
//   1. Khởi động `vite preview` ở process con (port 4173).
//   2. Đợi server ready (poll HEAD request, có timeout 30s, không treo vô hạn).
//   3. FETCH ĐỘNG danh sách giảng viên nổi bật từ backend
//      GET /api/public/teachers/featured (cần backend đang chạy).
//      → Nếu OK: build thêm 1 route per featured teacher vào ROUTES.
//      → Nếu lỗi (BE không chạy, network, 5xx): log cảnh báo rõ ràng, BỎ QUA
//        phần teacher, vẫn prerender các route tĩnh còn lại — không làm fail
//        toàn bộ build.
//   4. Dùng puppeteer render từng URL public (8 tĩnh + N teacher featured),
//      đợi Helmet apply xong.
//   5. Ghi HTML đã render vào dist/<route>/index.html (giữ nguyên content thật,
//      không phải <div id="root"></div> rỗng → SEO crawler đọc được).
//
// Bắt buộc:
//   - vite preview mặc định `appType: "spa"` nên serve index.html cho mọi route.
//   - HelmetProvider bọc ngoài BrowserRouter (xem main.tsx) để Helmet hoạt động
//     ngay ở lần render đầu.
//
// Cleanup: try/catch/finally quanh toàn bộ + preview.kill() + đợi exit event
// để tránh orphan process chiếm port 4173 ở lần build sau.
//
// ⚠ RÀNG BUỘC VẬN HÀNH MỚI (kể từ khi module Teacher có Admin CRUD):
//   - Để có bản prerender cho từng giảng viên nổi bật, BACKEND PHẢI ĐANG CHẠY
//     lúc `npm run build`. Nếu BE offline, các trang /giang-vien/:slug của
//     giảng viên featured sẽ KHÔNG có bản HTML tĩnh — vẫn truy cập được
//     (client-render), nhưng Google crawler sẽ thấy ít page prerender hơn.
//   - Sitemap.xml (xem generate-sitemap.js) có cùng ràng buộc: nếu BE offline,
//     sitemap chỉ liệt kê route tĩnh, KHÔNG có URL giảng viên nào.

import puppeteer from "puppeteer";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const PREVIEW_PORT = 4173; // mặc định của `vite preview`
const BACKEND_API_BASE = process.env.BACKEND_API_BASE || "http://localhost:5000/api";
const TEACHER_FEATURED_LIMIT = 50; // BE mặc định 6 — lấy dư để không sót.

// ===== 8 ROUTES TĨNH (cố định, không phụ thuộc backend) =====
const STATIC_ROUTES = [
  { path: "/", file: "dist/index.html" },
  { path: "/khoa-hoc", file: "dist/khoa-hoc/index.html" },
  { path: "/khoa-hoc/hsk-1-2", file: "dist/khoa-hoc/hsk-1-2/index.html" },
  { path: "/khoa-hoc/hsk-3-4", file: "dist/khoa-hoc/hsk-3-4/index.html" },
  { path: "/khoa-hoc/hsk-5-6", file: "dist/khoa-hoc/hsk-5-6/index.html" },
  { path: "/giang-vien", file: "dist/giang-vien/index.html" },
  { path: "/bang-gia", file: "dist/bang-gia/index.html" },
  { path: "/lien-he", file: "dist/lien-he/index.html" },
];

const SERVER_URL = `http://localhost:${PREVIEW_PORT}`;

/**
 * Fetch danh sách giảng viên nổi bật (isFeatured=true) từ backend.
 * - Trả về mảng slug (rỗng nếu lỗi).
 * - KHÔNG throw — caller quyết định log cảnh báo nhưng vẫn tiếp tục build.
 */
async function fetchFeaturedTeacherSlugs() {
  const url = `${BACKEND_API_BASE}/public/teachers/featured?limit=${TEACHER_FEATURED_LIMIT}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(
        `[prerender] ⚠ BE trả ${res.status} khi gọi ${url} — bỏ qua phần teacher featured.`
      );
      return [];
    }
    const json = await res.json();
    const teachers = json?.data?.teachers;
    if (!Array.isArray(teachers)) {
      console.warn(
        `[prerender] ⚠ Response không hợp lệ (thiếu data.teachers) — bỏ qua.`
      );
      return [];
    }
    const slugs = teachers
      .map((t) => t?.slug)
      .filter((s) => typeof s === "string" && s.length > 0);
    return slugs;
  } catch (err) {
    const reason =
      err instanceof Error ? err.message : String(err);
    console.warn(
      `[prerender] ⚠ Không fetch được featured teachers (${reason}).`
    );
    console.warn(
      `[prerender]   Backend phải đang chạy để prerender các trang giảng viên nổi bật.`
    );
    console.warn(
      `[prerender]   → Tiếp tục prerender 8 route tĩnh như bình thường.`
    );
    return [];
  }
}

/**
 * Poll HTTP HEAD/GET đến URL cho đến khi server trả 200 hoặc hết timeout.
 * Tránh race condition "preview chưa ready mà puppeteer đã gọi rồi".
 */
async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return;
    } catch {
      // server chưa lên — thử lại
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server ${url} không sẵn sàng sau ${timeoutMs}ms`);
}

async function main() {
  // ===== 1. Fetch featured teachers TRƯỚC khi start preview =====
  // (Gọi API ngay lúc build, không phụ thuộc preview server.)
  const teacherSlugs = await fetchFeaturedTeacherSlugs();

  // Build mảng route động cho từng featured teacher.
  // CHỈ lấy teacher isFeatured=true (theo yêu cầu) — trang isFeatured=false vẫn
  // truy cập được bình thường (client-render), chỉ không có bản HTML tĩnh.
  const dynamicRoutes = teacherSlugs.map((slug) => ({
    path: `/giang-vien/${slug}`,
    file: `dist/giang-vien/${slug}/index.html`,
  }));

  const ROUTES = [...STATIC_ROUTES, ...dynamicRoutes];

  console.log(
    `[prerender] Tổng routes: ${ROUTES.length} (${STATIC_ROUTES.length} tĩnh + ${dynamicRoutes.length} giảng viên featured)`
  );
  if (teacherSlugs.length === 0) {
    console.log(
      `[prerender] ℹ Không có featured teacher nào — chỉ prerender 8 route tĩnh.`
    );
  } else {
    console.log(`[prerender] Featured teachers: ${teacherSlugs.join(", ")}`);
  }

  // 2. Khởi động vite preview ở process con (stdio pipe để không làm nhiễu log)
  const preview = spawn(
    "npx",
    ["vite", "preview", "--port", String(PREVIEW_PORT)],
    { stdio: "pipe", shell: true }
  );
  preview.stdout.on("data", (d) =>
    process.stdout.write(`[preview] ${d}`)
  );
  preview.stderr.on("data", (d) =>
    process.stderr.write(`[preview] ${d}`)
  );

  let exitCode = 1;
  try {
    await waitForServer(`${SERVER_URL}/`, 30000);
    console.log("[prerender] preview server ready");

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    for (const { path: routePath, file } of ROUTES) {
      const url = `${SERVER_URL}${routePath}`;
      console.log(`[prerender] ${url}`);
      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
      // Đợi helmet apply xong (thường tức thì nhưng chờ 1 nhịp)
      await new Promise((r) => setTimeout(r, 500));
      const html = await page.content();
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, html, "utf-8");
      console.log(`  -> wrote ${file}`);
    }

    await browser.close();
    exitCode = 0;
  } catch (e) {
    console.error("[prerender] ERROR:", e);
    exitCode = 1;
  } finally {
    preview.kill();
    // Đợi process con thực sự tắt trước khi thoát để tránh orphan
    await new Promise((r) => preview.on("exit", r));
    process.exit(exitCode);
  }
}

main();