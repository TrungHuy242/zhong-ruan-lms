// scripts/screenshot-hero-v2.mjs
// Hallmark · Hero v2 layout audit — desktop/tablet/mobile + integrity check.
import puppeteer from "puppeteer";
import fs from "node:fs/promises";
import path from "node:path";

const PREVIEW_PORT = 4173;
const SERVER_URL = `http://localhost:${PREVIEW_PORT}`;
const OUT = "frontend/qa-screenshots/hero-v2";

const ROUTES = [
  { name: "desktop-1280", url: "/", width: 1280, height: 900 },
  { name: "tablet-768", url: "/", width: 768, height: 900 },
  { name: "mobile-375", url: "/", width: 375, height: 900 },
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

// Integrity check @ 1280x900
console.log("\n[audit] Hero layout integrity @ 1280x900");
await page.setViewport({ width: 1280, height: 900 });
await page.goto(`${SERVER_URL}/`, { waitUntil: "networkidle0", timeout: 30000 });
await new Promise((res) => setTimeout(res, 500));

const audit = await page.evaluate(() => {
  const get = (el) => {
    if (!el) return null;
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      cls: el.className,
      width: Math.round(r.width),
      height: Math.round(r.height),
      top: Math.round(r.top),
      left: Math.round(r.left),
      borderRadius: s.borderRadius,
    };
  };
  const hero = document.querySelector('[class*="_hero_"]');
  const heroInner = document.querySelector('[class*="_heroInner_"]');
  const heroCopy = document.querySelector('[class*="_heroCopy_"]');
  const heroVisual = document.querySelector('[class*="_heroVisual_"]');
  const heroActions = document.querySelector('[class*="_heroActions_"]');
  const heroCtaPrimary = document.querySelector('[class*="_heroCtaPrimary_"]');
  const heroImage = document.querySelector('[class*="_heroImage_"]');
  const bodyScrollW = document.documentElement.scrollWidth;
  const viewportW = window.innerWidth;
  return {
    hero: get(hero),
    heroInner: get(heroInner),
    heroCopy: get(heroCopy),
    heroVisual: get(heroVisual),
    heroActions: get(heroActions),
    heroCtaPrimary: get(heroCtaPrimary),
    heroImage: get(heroImage),
    overflow: { bodyScrollW, viewportW, overflows: bodyScrollW > viewportW },
  };
});
console.log(JSON.stringify(audit, null, 2));

await browser.close();
