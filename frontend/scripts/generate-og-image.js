// frontend/scripts/generate-og-image.js
//
// Tạo placeholder og-default.png 1200x630px bằng puppeteer (đã cài cho prerender).
// Chạy 1 lần khi cần: `npm run og:placeholder`.
// Sau đó commit file public/og-default.png vào git.
// Khi có designer thật, thay file PNG cùng tên — không phải sửa code.

import puppeteer from "puppeteer";
import fs from "node:fs/promises";

const HTML = `<!doctype html>
<html><head><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; font-family: 'Be Vietnam Pro', sans-serif;
    background: linear-gradient(135deg, #C8102E 0%, #8A0A1E 100%);
    color: #fff; display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    padding: 80px; text-align: center; }
  .badge { background: #D4AF37; color: #8A0A1E; font-weight: 700;
    padding: 12px 32px; border-radius: 999px; font-size: 28px;
    margin-bottom: 40px; letter-spacing: 2px; }
  h1 { font-size: 96px; font-weight: 800; line-height: 1.1;
    margin-bottom: 24px; text-shadow: 0 4px 24px rgba(0,0,0,0.3); }
  p { font-size: 36px; opacity: 0.95; max-width: 900px; line-height: 1.4; }
</style></head>
<body>
  <div class="badge">HSK 1 - HSK 6</div>
  <h1>Zhong Ruan</h1>
  <p>Tiếng Trung Online - Lộ trình cá nhân hoá, giáo viên bản ngữ</p>
</body></html>`;

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(HTML, { waitUntil: "networkidle0" });
  // Đợi font load xong (nếu browser cache có)
  try {
    await page.evaluate(() => document.fonts && document.fonts.ready);
  } catch {
    // bỏ qua nếu không có document.fonts (browser cũ)
  }
  await page.screenshot({
    path: "public/og-default.png",
    type: "png",
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });
  await browser.close();
  console.log("[og] wrote public/og-default.png (1200x630)");
}

main().catch((e) => { console.error(e); process.exit(1); });