// scripts/diacritic-render-check.mjs
// Pixel-level verification: render heading text and inspect computed glyph widths.
import puppeteer from "puppeteer";

const PORT = 4178;
const URL = `http://localhost:${PORT}/bang-gia`;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.goto(URL, { waitUntil: "networkidle0", timeout: 30000 });

const result = await page.evaluate(() => {
  const probes = [
    { sel: "h1", label: "h1" },
    { sel: "[class*='pullQuoteText']", label: "pullQuoteText" },
    { sel: "[class*='name']", label: "plan-name" },
    { sel: "[class*='price']", label: "price" },
    { sel: "[class*='currency']", label: "currency" },
    { sel: "[class*='unit']", label: "unit" },
    { sel: "[class*='featuredBadge']", label: "featuredBadge" },
    { sel: "[class*='sectionEyebrow']", label: "sectionEyebrow" },
    { sel: "[class*='sectionTitle']", label: "sectionTitle" },
  ];
  const out = [];
  for (const { sel, label } of probes) {
    const els = Array.from(document.querySelectorAll(sel));
    for (const el of els.slice(0, 2)) {
      const text = el.textContent?.trim();
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      out.push({
        label,
        text: text?.slice(0, 80),
        width: Math.round(r.width),
        height: Math.round(r.height),
        fontFamily: s.fontFamily.slice(0, 40),
        fontStyle: s.fontStyle,
        fontSize: s.fontSize,
        letterSpacing: s.letterSpacing,
        overflowWrap: s.overflowWrap,
        textWrap: s.textWrap,
        whiteSpace: s.whiteSpace,
        fontVariantNumeric: s.fontVariantNumeric,
        accentSplit: (() => {
          // Check if there are large gaps within a Vietnamese word like "tiến bộ" or "Học phí"
          // Compare the average letter spacing to total text width
          if (!text) return null;
          const avgCharWidth = r.width / text.length;
          return avgCharWidth.toFixed(2);
        })(),
      });
    }
  }
  return out;
});

console.log(JSON.stringify(result, null, 2));

await browser.close();
