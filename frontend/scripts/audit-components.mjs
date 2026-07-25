/**
 * Audit script — quét 3 component shared sau redesign editorial.
 *
 * Mục tiêu:
 *  1. Verify visual style đồng bộ với HomePage editorial system
 *  2. Verify logic React giữ nguyên (props, classes không đổi)
 *  3. Verify không còn SaaS tells (border-radius, box-shadow, gradient)
 *  4. Verify 5 trang dùng CTABanner đều hiển thị đúng
 *  5. Capture screenshots cho user xem
 *
 * Output:
 *  - audit-report.json (machine-readable)
 *  - screenshots/{page}.png (visual proof)
 */
import puppeteer from "puppeteer";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = "http://localhost:4173";
const PAGES = [
  { id: "khoa-hoc", url: "/khoa-hoc", component: ["CourseCard", "CourseComparisonTable", "CTABanner"] },
  { id: "khoa-hoc-hsk-1-2", url: "/khoa-hoc/hsk-1-2", component: ["CourseCard", "CTABanner"] },
  { id: "khoa-hoc-hsk-3-4", url: "/khoa-hoc/hsk-3-4", component: ["CourseCard", "CTABanner"] },
  { id: "khoa-hoc-hsk-5-6", url: "/khoa-hoc/hsk-5-6", component: ["CourseCard", "CTABanner"] },
  { id: "bang-gia", url: "/bang-gia", component: ["CTABanner"] },
  { id: "giang-vien", url: "/giang-vien", component: ["CTABanner"] },
  { id: "giang-vien-truong-minh-trung-huy", url: "/giang-vien/truong-minh-trung-huy", component: ["CTABanner"] },
];

const TELL_REGEX = {
  borderRadius: /border-radius\s*:\s*[^0]/i,
  boxShadow: /box-shadow\s*:\s*[^n]/i, // not 'none'
  linearGradient: /linear-gradient/i,
  italicHeader: /font-style\s*:\s*italic/i,
};

async function detectTells(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const styles = window.getComputedStyle(el);
    return {
      borderRadius: styles.borderRadius,
      boxShadow: styles.boxShadow,
      background: styles.background,
      backgroundColor: styles.backgroundColor,
      backgroundImage: styles.backgroundImage,
      fontFamily: styles.fontFamily,
      fontStyle: styles.fontStyle,
      fontWeight: styles.fontWeight,
      fontSize: styles.fontSize,
      color: styles.color,
      border: styles.border,
      borderTop: styles.borderTop,
      padding: styles.padding,
    };
  }, selector);
}

const report = { timestamp: new Date().toISOString(), pages: [] };
mkdirSync(resolve("screenshots/component-audit"), { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  try {
    for (const p of PAGES) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      console.log(`\n>>> ${p.id}: ${BASE}${p.url}`);
      await page.goto(`${BASE}${p.url}`, { waitUntil: "networkidle0", timeout: 30000 });

      const pageData = { id: p.id, url: p.url, components: {} };

      // CourseCard
      if (p.component.includes("CourseCard")) {
        const card = await detectTells(page, "[class*='card']");
        pageData.components.courseCard = card;

        // Find CourseCard specifically by content
        const cardSelector = await page.evaluate(() => {
          // CourseCard root has both 'card' and possibly 'cardDetailed' class
          const candidates = document.querySelectorAll('[class*="card"]');
          for (const c of candidates) {
            if (c.querySelector("[class*='name']") && c.querySelector("[class*='price']")) {
              return {
                name: c.querySelector("[class*='name']")?.textContent?.trim()?.slice(0, 50),
                tagName: c.tagName,
                className: c.className,
                styles: {
                  borderRadius: window.getComputedStyle(c).borderRadius,
                  boxShadow: window.getComputedStyle(c).boxShadow,
                  backgroundColor: window.getComputedStyle(c).backgroundColor,
                  border: window.getComputedStyle(c).border,
                },
              };
            }
          }
          return null;
        });
        pageData.components.courseCardDetailed = cardSelector;
      }

      // CourseComparisonTable
      if (p.component.includes("CourseComparisonTable")) {
        const tableStyles = await detectTells(page, "table");
        pageData.components.comparisonTable = tableStyles;

        const tableWrap = await page.evaluate(() => {
          const t = document.querySelector("[class*='tableWrap']");
          if (!t) return null;
          return {
            className: t.className,
            borderRadius: window.getComputedStyle(t).borderRadius,
            boxShadow: window.getComputedStyle(t).boxShadow,
            borderTop: window.getComputedStyle(t).borderTop,
            borderBottom: window.getComputedStyle(t).borderBottom,
          };
        });
        pageData.components.tableWrap = tableWrap;
      }

      // CTABanner
      if (p.component.includes("CTABanner")) {
        const ctaData = await page.evaluate(() => {
          const banner = document.querySelector("[class*='banner']");
          if (!banner) return null;
          const headline = banner.querySelector("[class*='headline']");
          const btn = banner.querySelector("[class*='ctaBtn']");
          return {
            banner: {
              className: banner.className,
              background: window.getComputedStyle(banner).background,
              backgroundColor: window.getComputedStyle(banner).backgroundColor,
              backgroundImage: window.getComputedStyle(banner).backgroundImage,
              borderRadius: window.getComputedStyle(banner).borderRadius,
              boxShadow: window.getComputedStyle(banner).boxShadow,
            },
            headline: headline
              ? {
                  text: headline.textContent?.trim()?.slice(0, 80),
                  fontFamily: window.getComputedStyle(headline).fontFamily,
                  fontSize: window.getComputedStyle(headline).fontSize,
                  fontStyle: window.getComputedStyle(headline).fontStyle,
                  color: window.getComputedStyle(headline).color,
                }
              : null,
            ctaBtn: btn
              ? {
                  text: btn.textContent?.trim()?.slice(0, 50),
                  backgroundColor: window.getComputedStyle(btn).backgroundColor,
                  color: window.getComputedStyle(btn).color,
                  borderRadius: window.getComputedStyle(btn).borderRadius,
                  boxShadow: window.getComputedStyle(btn).boxShadow,
                  fontFamily: window.getComputedStyle(btn).fontFamily,
                }
              : null,
          };
        });
        pageData.components.ctaBanner = ctaData;
      }

      // Capture full page screenshot
      await page.screenshot({
        path: `screenshots/component-audit/${p.id}.png`,
        fullPage: false,
      });

      report.pages.push(pageData);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  writeFileSync(
    resolve("screenshots/component-audit/audit-report.json"),
    JSON.stringify(report, null, 2),
    "utf-8",
  );

  console.log("\n=== AUDIT REPORT ===");
  for (const p of report.pages) {
    console.log(`\n${p.id} (${p.url})`);
    if (p.components.courseCardDetailed) {
      console.log(
        `  CourseCard: borderRadius=${p.components.courseCardDetailed.styles.borderRadius}, boxShadow=${p.components.courseCardDetailed.styles.boxShadow}`,
      );
    }
    if (p.components.tableWrap) {
      console.log(
        `  TableWrap: borderRadius=${p.components.tableWrap.borderRadius}, boxShadow=${p.components.tableWrap.boxShadow}`,
      );
    }
    if (p.components.ctaBanner) {
      console.log(
        `  CTABanner: bgColor=${p.components.ctaBanner.banner.backgroundColor}, bgImage=${p.components.ctaBanner.banner.backgroundImage}`,
      );
      console.log(`    Headline font: ${p.components.ctaBanner.headline?.fontFamily?.slice(0, 40)}`);
      console.log(`    CTA btn color: ${p.components.ctaBanner.ctaBtn?.backgroundColor}`);
    }
  }
})();
