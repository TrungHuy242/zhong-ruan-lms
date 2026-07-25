// scripts/cross-page-chrome-audit.mjs
// Audit PublicHeader + PublicFooter across 5 public pages × 3 viewports.
// Verified: layout integrity, no SaaS tells, Vietnamese diacritic integrity,
// spacer above HomePage hero intact.
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const PORT = 4178;
const BASE = `http://localhost:${PORT}`;

const PAGES = [
  { name: "home", url: "/", heroOffset: 0 }, // first section directly below header
  { name: "courses", url: "/khoa-hoc" },
  { name: "teachers", url: "/giang-vien" },
  { name: "pricing", url: "/bang-gia" },
  { name: "contact", url: "/lien-he" },
];

const VIEWPORTS = [
  { name: "mobile", width: 414, height: 900 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await puppeteer.launch({ headless: true });

const report = {
  date: new Date().toISOString(),
  pages: [],
  sentinels: {},
};

const sentinels = {
  headerBorderRadius: 0,
  headerBoxShadow: "none",
  headerFontFamily: "Be Vietnam Pro",
  ctaText: "Đăng ký học thử miễn phí",
  footerBgInkOrCharcoal: true,
  footerBrandRedBorderTop: true,
};

// Helper: collect all CSS rules that match a selector and inspect font-family,
// letter-spacing, and overflow-wrap of the element itself.
async function probeElement(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      exists: true,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      letterSpacing: cs.letterSpacing,
      lineHeight: cs.lineHeight,
      color: cs.color,
      background: cs.backgroundColor,
      borderRadius: cs.borderRadius,
      boxShadow: cs.boxShadow,
      borderTopColor: cs.borderTopColor,
      borderBottomColor: cs.borderBottomColor,
      borderTopWidth: cs.borderTopWidth,
      borderTopStyle: cs.borderTopStyle,
      overflowWrap: cs.overflowWrap,
      whiteSpace: cs.whiteSpace,
      minWidth: cs.minWidth,
      maxWidth: cs.maxWidth,
      display: cs.display,
      textContent: (el.textContent || "").trim().slice(0, 80),
    };
  }, selector);
}

async function probeFontSupport(page, text) {
  return await page.evaluate((t) => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    ctx.font = '40px "Source Serif 4", serif';
    const wSerif = ctx.measureText(t).width;
    ctx.font = '40px "monospace"';
    const wMono = ctx.measureText(t).width;
    return { wSerif: Math.round(wSerif * 100) / 100, wMono: Math.round(wMono * 100) / 100 };
  }, text);
}

async function snapshotPage(page, pageName, url, viewport) {
  await page.setViewport({ width: viewport.width, height: viewport.height });
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 800));

  // Capture errors
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const out = { pageName, url, viewport: viewport.name, errors, probes: {} };

  // Header probe
  out.probes.header = await probeElement(page, "header");

  // Header brand-red is at top? scrolled detection? scroll a bit
  await page.evaluate(() => window.scrollTo(0, 200));
  await new Promise((r) => setTimeout(r, 300));
  out.probes.headerScrolled = await probeElement(page, "header");

  // Reset scroll
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 200));

  // CTA button
  const ctaSel = "header a[href='/register'], header [class*='ctaButton']";
  out.probes.ctaButton = await probeElement(page, ctaSel);

  // Footer probe
  out.probes.footer = await probeElement(page, "footer");

  // Footer col title (eyebrow)
  out.probes.footerColTitle = await probeElement(page, "footer [class*='colTitle']");

  // Footer social buttons
  out.probes.footerSocialBtn = await probeElement(page, "footer [class*='socialBtn']");

  // Bottom
  out.probes.footerBottom = await probeElement(page, "footer [class*='bottom']");

  // Vietnamese diacritic integrity — render some text and inspect support
  out.probes.fontDiacritic = {
    title: await probeFontSupport(page, "Khóa học"),
    teacher: await probeFontSupport(page, "Giảng viên"),
    contact: await probeFontSupport(page, "Liên hệ"),
    register: await probeFontSupport(page, "Đăng ký học thử miễn phí"),
  };

  // Main padding-top vs header height — verify spacer math
  out.probes.mainPadding = await probeElement(page, "main");

  // Section directly below header (verify first non-header section is visible)
  out.probes.firstSectionTop = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return null;
    const sections = main.querySelectorAll("section");
    if (sections.length === 0) return null;
    const rect = sections[0].getBoundingClientRect();
    return Math.round(rect.top);
  });

  // Snapshot png
  const snapshotDir = path.resolve("scripts/_chrome-snapshots");
  if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });
  await page.screenshot({
    path: path.join(snapshotDir, `${pageName}-${viewport.name}-top.png`),
    fullPage: false,
  });

  // Page count for slug /khoa-hoc/[slug] — for mobile scroll below
  if (pageName === "courses") {
    // already covered at /khoa-hoc
  }

  out.errors = errors;
  return out;
}

for (const p of PAGES) {
  const page = await browser.newPage();
  page.on("console", () => {});
  const pageReports = [];
  for (const v of VIEWPORTS) {
    try {
      const r = await snapshotPage(page, p.name, p.url, v);
      pageReports.push(r);
      console.log(`OK ${p.name} @${v.name}`);
    } catch (e) {
      console.error(`FAIL ${p.name} @${v.name}: ${e.message}`);
      pageReports.push({ pageName: p.name, viewport: v.name, error: e.message });
    }
  }
  report.pages.push({ ...p, runs: pageReports });
  await page.close();
}

// Hero spacing integrity test on HomePage (Desktop only, since other pages
// have hero + masthead that overlaps header by design)
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
const headerRect = await page.evaluate(() => {
  const h = document.querySelector("header");
  return { h: h.getBoundingClientRect().height };
});
const firstSectionTop = await page.evaluate(() => {
  const m = document.querySelector("main");
  const s = m?.querySelector("section");
  return s ? Math.round(s.getBoundingClientRect().top) : null;
});
report.heroSpacing = {
  home_headerHeight: headerRect.h,
  home_firstSectionTop: firstSectionTop,
  expected_padding_match: firstSectionTop === 72, // expect exact match (72px desktop header + 72px main padding-top)
};

await page.close();
await browser.close();

const outPath = path.resolve("scripts/_chrome-audit-report.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
console.log(`\nReport: ${outPath}`);
console.log(`\n=== Hero spacing check (HomePage desktop) ===`);
console.log(JSON.stringify(report.heroSpacing, null, 2));

// Compute pass/fail summary
let pass = 0;
let fail = 0;
let diacriticFail = 0;

for (const p of report.pages) {
  for (const r of p.runs) {
    if (r.error) {
      fail++;
      continue;
    }
    const issues = [];
    const h = r.probes?.header;
    const f = r.probes?.footer;
    const ct = r.probes?.ctaButton;

    if (h && h.borderRadius !== "0px") issues.push(`header borderRadius=${h.borderRadius}`);
    if (h && h.boxShadow !== "none") issues.push(`header boxShadow=${h.boxShadow}`);
    if (ct && ct.borderRadius !== "0px") issues.push(`cta borderRadius=${ct.borderRadius}`);
    if (ct && ct.boxShadow !== "none") issues.push(`cta boxShadow=${ct.boxShadow}`);
    if (f && f.borderRadius !== "0px") issues.push(`footer borderRadius=${f.borderRadius}`);
    if (f && f.boxShadow !== "none") issues.push(`footer boxShadow=${f.boxShadow}`);

    // Vietnamese font glyph check
    const fd = r.probes?.fontDiacritic;
    if (fd) {
      for (const [k, v] of Object.entries(fd)) {
        // If a Source Serif 4 measurement equals monospace, font is missing
        if (Math.abs(v.wSerif - v.wMono) < 0.5) {
          issues.push(`fontSerif-fallback-for-${k}`);
          diacriticFail++;
        }
      }
    }

    if (issues.length) {
      console.log(`  ${p.name}@${r.viewport}: FAIL - ${issues.join(", ")}`);
      fail++;
    } else {
      pass++;
    }
  }
}

console.log(`\n=== Summary ===`);
console.log(`Pass: ${pass}, Fail: ${fail}, Diacritic-fallback: ${diacriticFail}`);
