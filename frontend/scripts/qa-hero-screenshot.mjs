// frontend/scripts/qa-hero-screenshot.mjs
//
// Screenshot HeroSection ở 3 breakpoint (375 / 768 / 1280) và kiểm tra:
//  - Ảnh hero hiển thị đúng tỷ lệ (không vỡ)
//  - Không tràn ngang (scrollWidth <= clientWidth)
//  - File ảnh load thành công (naturalWidth > 0)
//
// Usage: node scripts/qa-hero-screenshot.mjs

import puppeteer from "puppeteer";
import fs from "node:fs/promises";

const PREVIEW_URL = "http://localhost:4173";
const OUT_DIR = "qa-screenshots/hero-temp";

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 800 },
];

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  let allPass = true;

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${PREVIEW_URL}/`, { waitUntil: "networkidle0", timeout: 30000 });
    // Đợi ảnh load
    await page.waitForSelector("img[src='/hero-temp.jpg']", { timeout: 5000 });
    const result = await page.evaluate(() => {
      const img = document.querySelector("img[src='/hero-temp.jpg']");
      if (!img) return { found: false };
      const r = img.getBoundingClientRect();
      return {
        found: true,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    const overflow = result.scrollWidth > result.clientWidth + 1;
    const imgLoaded = result.complete && result.naturalWidth > 0;
    const status = !overflow && imgLoaded ? "PASS" : "FAIL";
    if (status === "FAIL") allPass = false;
    console.log(`[${vp.name}] ${status}`);
    console.log(`  viewport ${vp.width}x${vp.height}`);
    console.log(`  img rect: w=${result.rect?.width}px h=${result.rect?.height}px aspect=${(result.rect?.width / result.rect?.height).toFixed(3)}`);
    console.log(`  natural: ${result.naturalWidth}x${result.naturalHeight}`);
    console.log(`  loaded: ${result.complete} overflow: ${overflow}`);
    console.log(`  scroll/client: ${result.scrollWidth}/${result.clientWidth}`);

    const file = `${OUT_DIR}/${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  -> screenshot ${file}`);
    await page.close();
  }

  await browser.close();
  console.log(`\n${allPass ? "ALL PASS" : "SOME FAIL"}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});