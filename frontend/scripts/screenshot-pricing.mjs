// scripts/screenshot-pricing.mjs
// Hallmark · PricingPage redesign audit — screenshots desktop/tablet/mobile/empty.
import puppeteer from "puppeteer";
import fs from "node:fs/promises";
import path from "node:path";

const PREVIEW_PORT = 4178;
const SERVER_URL = `http://localhost:${PREVIEW_PORT}`;
const OUT = "frontend/screenshots/pricing-redesign";

const ROUTES = [
  { name: "desktop", url: "/bang-gia", width: 1280, height: 900 },
  { name: "tablet", url: "/bang-gia", width: 768, height: 900 },
  { name: "mobile", url: "/bang-gia", width: 375, height: 900 },
  { name: "small-mobile", url: "/bang-gia", width: 320, height: 900 },
];

await fs.mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

for (const r of ROUTES) {
  await page.setViewport({ width: r.width, height: r.height });
  const url = `${SERVER_URL}${r.url}`;
  console.log(`[shot] ${url} @ ${r.width}x${r.height}`);
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((res) => setTimeout(res, 800));
  const file = path.join(OUT, `${r.name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  -> ${file}`);
}

// Vietnamese diacritic + money layout integrity check on rendered page
console.log("\n[audit] Live page DOM checks @ 1280x900");
await page.setViewport({ width: 1280, height: 900 });
await page.goto(`${SERVER_URL}/bang-gia`, { waitUntil: "networkidle0", timeout: 30000 });

const audit = await page.evaluate(() => {
  const get = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      text: el.textContent?.trim().slice(0, 80),
      width: r.width,
      height: r.height,
      borderRadius: s.borderRadius,
      boxShadow: s.boxShadow,
      fontFamily: s.fontFamily,
      fontStyle: s.fontStyle,
      fontSize: s.fontSize,
      color: s.color,
      background: s.backgroundColor,
      overflowWrap: s.overflowWrap,
      textWrap: s.textWrap,
      whiteSpace: s.whiteSpace,
      fontVariantNumeric: s.fontVariantNumeric,
    };
  };
  return {
    h1: get("h1"),
    pullQuote: get("blockquote"),
    pullQuoteText: get("blockquote p"),
    pullQuoteMark: get("blockquote span"),
    eyebrow: get("._mastheadEyebrow_qtu4p_19, [class*='mastheadEyebrow']"),
    pricingGrid: get("[class*='pricingGrid']"),
    featuredCard: get("[class*='cardFeatured']"),
    featuredBadge: get("[class*='featuredBadge']"),
    price: get("[class*='price_']"),
    currency: get("[class*='currency_']"),
    unit: get("[class*='unit_']"),
    cardCount: document.querySelectorAll("[class*='_card_1viam_']").length,
    policyCardCount: document.querySelectorAll("[class*='_card_33vbp_']").length,
    featuredCaptionCount: (document.body.textContent?.match(/Phổ biến nhất/g) || []).length,
    h1Count: document.querySelectorAll("h1").length,
    // Price characters intact
    priceText: Array.from(document.querySelectorAll("[class*='_price_']")).map(el => el.textContent),
    // Sentinel: any element with rounded corner > 0?
    roundedCount: Array.from(document.querySelectorAll("*"))
      .filter(el => {
        const s = window.getComputedStyle(el);
        const r = parseFloat(s.borderRadius);
        return r > 0 && el.children.length > 0;
      })
      .length,
  };
});

console.log(JSON.stringify(audit, null, 2));

await browser.close();
console.log("\nDONE");
