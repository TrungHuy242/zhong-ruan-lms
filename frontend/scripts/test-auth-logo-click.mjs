// scripts/test-auth-logo-click.mjs
// Phase 3 isolated: click logo từ /login và /register phải về / (Trang chủ)
import puppeteer from "puppeteer";

const BASE = process.env.AUTH_TEST_URL ?? "http://localhost:5174";

const browser = await puppeteer.launch({ headless: true });
let failures = 0;

try {
  for (const path of ["/login", "/register"]) {
    const p = await browser.newPage();
    await p.setViewport({ width: 1280, height: 900 });
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle0", timeout: 60000 });
    await p.waitForSelector('a[aria-label*="Về trang chủ"]', { timeout: 15000 });
    await p.click('a[aria-label*="Về trang chủ"]');
    await p.waitForFunction(() => location.pathname === "/", { timeout: 30000 });
    const fp = await p.evaluate(() => location.pathname);
    const ok = fp === "/";
    if (!ok) failures++;
    console.log(`[${ok ? "PASS" : "FAIL"}] Click logo from ${path} → ${fp}`);
    await p.close();
  }

  // Mobile viewport test (ẩn panel brand nhưng header vẫn hiện)
  console.log("\n=== Mobile viewport test (375px) ===");
  for (const path of ["/login", "/register"]) {
    const p = await browser.newPage();
    await p.setViewport({ width: 375, height: 812 });
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle0", timeout: 60000 });
    await p.waitForSelector('a[aria-label*="Về trang chủ"]', { timeout: 15000 });
    const headerVisible = await p.evaluate(() => {
      const a = document.querySelector('a[aria-label*="Về trang chủ"]');
      const cs = a ? getComputedStyle(a) : null;
      const rect = a?.getBoundingClientRect();
      return cs && rect && cs.display !== "none" && rect.width > 0 && rect.height > 0;
    });
    if (!headerVisible) failures++;
    console.log(`[${headerVisible ? "PASS" : "FAIL"}] Mobile @375px ${path}: AuthMinimalHeader logo visible`);

    await p.click('a[aria-label*="Về trang chủ"]');
    await p.waitForFunction(() => location.pathname === "/", { timeout: 30000 });
    const fp = await p.evaluate(() => location.pathname);
    const ok = fp === "/";
    if (!ok) failures++;
    console.log(`[${ok ? "PASS" : "FAIL"}] Mobile @375px ${path}: click → / (got ${fp})`);
    await p.close();
  }
} finally {
  await browser.close().catch(() => {});
}

console.log(`\n=== FAILURES: ${failures} ===`);
process.exit(failures > 0 ? 1 : 0);
