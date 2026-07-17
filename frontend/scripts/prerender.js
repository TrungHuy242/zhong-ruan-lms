// frontend/scripts/prerender.js
//
// Sau khi `vite build` sinh dist/index.html (rỗng SPA), script này:
//   1. Khởi động `vite preview` ở process con (port 4173).
//   2. Đợi server ready (poll HEAD request, có timeout 30s, không treo vô hạn).
//   3. Dùng puppeteer render từng URL public, đợi Helmet apply xong.
//   4. Ghi HTML đã render vào dist/<route>/index.html (giữ nguyên content thật,
//      không phải <div id="root"></div> rỗng → SEO crawler đọc được).
//
// Bắt buộc:
//   - vite preview mặc định `appType: "spa"` nên serve index.html cho mọi route.
//   - HelmetProvider bọc ngoài BrowserRouter (xem main.tsx) để Helmet hoạt động
//     ngay ở lần render đầu.
//
// Cleanup: try/catch/finally quanh toàn bộ + preview.kill() + đợi exit event
// để tránh orphan process chiếm port 4173 ở lần build sau.

import puppeteer from "puppeteer";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const PREVIEW_PORT = 4173; // mặc định của `vite preview`
const ROUTES = [
  { path: "/", file: "dist/index.html" },
  { path: "/khoa-hoc", file: "dist/khoa-hoc/index.html" },
  { path: "/giang-vien", file: "dist/giang-vien/index.html" },
  { path: "/bang-gia", file: "dist/bang-gia/index.html" },
  { path: "/lien-he", file: "dist/lien-he/index.html" },
];
const SERVER_URL = `http://localhost:${PREVIEW_PORT}`;

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
  // 1. Khởi động vite preview ở process con (stdio pipe để không làm nhiễu log)
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