// frontend/scripts/qa-public-site.js
//
// QA tự động cho TOÀN BỘ public site (5 trang) — wrap 3 mục:
//   Mục 6 (Console/Network errors): page.on('console') + page.on('response'),
//   Mục 5 (Click-through linking 5 menu/CTA + test 404):
//   Mục 3 (Responsive — kiểm tra tràn ngang ở 3 breakpoint: 375/768/1280).
//
// Yêu cầu: Backend phải đang chạy port 5000 (preview cho fetch API).
//
// Output:
//   - public-site-qa-report.json (có cấu trúc, có thể diff giữa các đợt).
//   - public-site-qa-report.md (human-readable).
//   - screenshots/*.png (lưu lại, không tự đánh giá thẩm mỹ).

import puppeteer from "puppeteer";
import fs from "node:fs/promises";
import path from "node:path";

const BE = "http://localhost:5000";
const FE = "http://localhost:5173";
const SCREENSHOT_DIR = path.resolve("public-site-qa-screenshots");

const PAGES = [
  { id: "home", path: "/" },
  { id: "courses", path: "/khoa-hoc" },
  { id: "course-hsk12", path: "/khoa-hoc/hsk-1-2" },
  { id: "teachers", path: "/giang-vien" },
  { id: "pricing", path: "/bang-gia" },
  { id: "contact", path: "/lien-he" },
];

const BREAKPOINTS = [
  { id: "mobile-375", width: 375, height: 800 },
  { id: "tablet-768", width: 768, height: 900 },
  { id: "desktop-1280", width: 1280, height: 900 },
];

const TARGET_HEADER = ["Trang chủ", "Khóa học", "Giảng viên", "Bảng giá", "Liên hệ"];

/**
 * Render 1 page @ 1 viewport, kèm theo:
 *   - console errors/warnings (bỏ qua favicon 404)
 *   - network non-2xx responses
 *   - overflow chiều ngang (body.scrollWidth > viewport.width)
 *   - screenshot
 */
async function captureOne(page, viewport, pageSpec, consoleErrs, networkErrs, overflows, extraLabel = "") {
  await page.setViewport(viewport);
  const url = `${FE}${pageSpec.path}`;
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

  // Đợi render xong (route đã prerender nên content có ngay).
  await new Promise((r) => setTimeout(r, 700));

  // Overflow ngang.
  const overflow = await page.evaluate(() => {
    const w = document.documentElement.scrollWidth;
    const iw = window.innerWidth;
    return { docWidth: w, winWidth: iw, overflowed: w > iw + 1 };
  });
  const pageKey = `${pageSpec.id}@${viewport.id}`;
  if (overflow.overflowed) {
    overflows.push({ page: pageKey, docWidth: overflow.docWidth, winWidth: overflow.winWidth });
  }

  // Screenshots
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  const filename = `${pageSpec.id}-${viewport.id}${extraLabel ? "-" + extraLabel : ""}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: false });
}

async function main() {
  const consoleErrs = [];
  const networkErrs = [];
  const overflows = [];
  const clickResults = [];

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // ===== MỤC 6 — Console + Network errors =====
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error" || type === "warning") {
      consoleErrs.push({
        type,
        text: msg.text(),
        location: msg.location(),
      });
    }
  });
  page.on("response", (res) => {
    // Bỏ qua favicon và prerender asset
    const url = res.url();
    if (url.endsWith("/favicon.ico")) return;
    if (url.includes("/@vite/") || url.includes("/node_modules/.vite/")) return;
    if (res.status() >= 400) {
      networkErrs.push({ url, status: res.status() });
    }
  });
  page.on("pageerror", (err) => {
    consoleErrs.push({ type: "pageerror", text: err.message });
  });

  // ===== Duyệt 5 trang × 3 breakpoints =====
  for (const bp of BREAKPOINTS) {
    for (const p of PAGES) {
      try {
        await captureOne(page, bp, p, consoleErrs, networkErrs, overflows);
      } catch (e) {
        networkErrs.push({ url: `${FE}${p.path}`, status: "EXCEPTION", detail: String(e) });
      }
    }
  }

  // ===== MỤC 5 — Click-through header menu + test 404 =====
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${FE}/`, { waitUntil: "networkidle0" });

  // Lấy các link header.
  const headerLinks = await page.evaluate((targets) => {
    const root = document.querySelector("header");
    if (!root) return [];
    return Array.from(root.querySelectorAll("a")).map((a) => ({
      text: (a.textContent || "").trim(),
      href: a.getAttribute("href") || "",
    })).filter((l) => targets.includes(l.text));
  }, TARGET_HEADER);

  // Click từng link, kiểm tra URL thay đổi đúng route.
  for (const link of headerLinks) {
    if (!link.href) continue;
    try {
      await page.goto(`${FE}/`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 500));
      const sel = `header a[href="${link.href}"]`;
      const exists = await page.$(sel);
      if (!exists) {
        clickResults.push({ text: link.text, href: link.href, result: "HEADER_LINK_MISSING" });
        continue;
      }
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle0", timeout: 15000 }).catch(() => {}),
        exists.click(),
      ]);
      const finalUrl = new URL(page.url()).pathname;
      const expected = link.href;
      const match = finalUrl === expected || (expected === "/" && finalUrl === "/");
      clickResults.push({
        text: link.text,
        href: expected,
        finalUrl,
        match,
      });
    } catch (e) {
      clickResults.push({ text: link.text, href: link.href, error: String(e) });
    }
  }

  // Test 404 route.
  const NOT_FOUND_PROBES = [
    "/khoa-hoc/hsk-999",
    "/giang-vien/slug-khong-ton-tai-xyz123",
  ];
  for (const probe of NOT_FOUND_PROBES) {
    try {
      await page.goto(`${FE}${probe}`, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 500));
      const has404 = await page.evaluate(() => {
        const h = document.querySelector("h1");
        const text = (h?.textContent || "").toLowerCase();
        return /không tìm thấy|khong tim thay|not found|404/.test(text);
      });
      const hasCrash = await page.evaluate(() => {
        // Trang chỉ render root rỗng không có nội dung là "crash".
        const root = document.querySelector("#root");
        return root ? root.children.length === 0 : true;
      });
      clickResults.push({
        text: probe,
        href: probe,
        notFoundTextPresent: has404,
        looksBroken: hasCrash,
      });
    } catch (e) {
      clickResults.push({ text: probe, error: String(e) });
    }
  }

  // ===== MỤC 4 — Error state khi BE chết =====
  // Giả lập bằng cách set baseURL sai → tất cả API call fail.
  await page.setRequestInterception(true);
  let interceptActive = true;
  const errorStateResults = [];
  const probesForErrorState = [
    { id: "teachers-error", path: "/giang-vien", expectLabel: "Không tải được" },
    { id: "pricing-error", path: "/bang-gia", expectLabel: "Không tải được" },
  ];
  page.on("request", (req) => {
    if (!interceptActive) {
      req.continue();
      return;
    }
    if (req.url().startsWith(BE)) {
      req.abort("failed");
    } else {
      req.continue();
    }
  });

  for (const probe of probesForErrorState) {
    try {
      await page.goto(`${FE}${probe.path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
      await new Promise((r) => setTimeout(r, 1500));
      const found = await page.evaluate((label) => {
        const body = (document.body?.innerText || "").toLowerCase();
        return {
          labelPresent: body.includes(label.toLowerCase()),
          retryBtnPresent: /thử lại|thu lai|thử-lại|retry/i.test(body),
          blankPage: body.trim().length < 30,
        };
      }, probe.expectLabel);
      errorStateResults.push({ id: probe.id, path: probe.path, ...found });
    } catch (e) {
      errorStateResults.push({ id: probe.id, error: String(e) });
    }
  }

  await page.setRequestInterception(false);
  interceptActive = false;

  await browser.close();

  const report = {
    timestamp: new Date().toISOString(),
    consoleErrors: consoleErrs.filter((e) =>
      // Lọc các warning không liên quan
      !/preload.*font.*\b(woff|woff2|ttf)\b/i.test(e.text || "")
    ),
    networkErrors: networkErrs,
    overflows,
    clickResults,
    errorStateResults,
  };

  await fs.writeFile("public-site-qa-report.json", JSON.stringify(report, null, 2), "utf-8");

  // Markdown human-readable
  const lines = [];
  lines.push(`# QA Public Site — ${report.timestamp}`);
  lines.push("");
  lines.push(`## 1. Console errors (${report.consoleErrors.length})`);
  if (report.consoleErrors.length === 0) lines.push("- (sạch)");
  for (const e of report.consoleErrors.slice(0, 30)) lines.push(`- [${e.type}] ${e.text?.slice(0, 200)}`);
  lines.push("");
  lines.push(`## 2. Network errors (${report.networkErrors.length})`);
  if (report.networkErrors.length === 0) lines.push("- (sạch)");
  for (const e of report.networkErrors.slice(0, 30)) lines.push(`- ${e.status} ${e.url}`);
  lines.push("");
  lines.push(`## 3. Overflow ngang (${report.overflows.length} trường hợp tràn)`);
  if (report.overflows.length === 0) lines.push("- (không trang nào tràn)");
  for (const e of report.overflows) lines.push(`- ${e.page}: docWidth=${e.docWidth}, winWidth=${e.winWidth}`);
  lines.push("");
  lines.push(`## 4. Click-through header (${report.clickResults.length})`);
  for (const e of report.clickResults) lines.push(`- ${e.text} → ${e.href ?? "?"} => ${JSON.stringify({ match: e.match, notFoundTextPresent: e.notFoundTextPresent, looksBroken: e.looksBroken, error: e.error })}`);
  lines.push("");
  lines.push(`## 5. Error state khi BE chết (${report.errorStateResults.length})`);
  for (const e of report.errorStateResults) lines.push(`- ${JSON.stringify(e)}`);
  await fs.writeFile("public-site-qa-report.md", lines.join("\n"), "utf-8");

  console.log("[QA] Report saved: public-site-qa-report.{json,md}");
  console.log("[QA] Screenshots saved in:", SCREENSHOT_DIR);
  console.log("[QA] Summary:");
  console.log(`  - Console errors: ${report.consoleErrors.length}`);
  console.log(`  - Network errors: ${report.networkErrors.length}`);
  console.log(`  - Overflows: ${report.overflows.length}`);
  console.log(`  - Click results: ${report.clickResults.length}`);
  console.log(`  - Error state results: ${report.errorStateResults.length}`);
}

main().catch((e) => {
  console.error("[QA] FATAL:", e);
  process.exit(1);
});
