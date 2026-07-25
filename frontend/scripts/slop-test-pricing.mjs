// scripts/slop-test-pricing.mjs
// Audit PricingPage rendered HTML for slop-test sentinels.
import puppeteer from "puppeteer";

const PORT = 4178;
const URL = `http://localhost:${PORT}/bang-gia`;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.goto(URL, { waitUntil: "networkidle0", timeout: 30000 });

const audit = await page.evaluate(() => {
  const offenders = [];
  const allEls = Array.from(document.querySelectorAll("*"));
  for (const el of allEls) {
    const s = window.getComputedStyle(el);
    const r = parseFloat(s.borderRadius);
    if (r > 0 && el.children.length > 0) {
      offenders.push({
        tag: el.tagName,
        cls: el.className?.toString().slice(0, 60),
        radius: s.borderRadius,
      });
    }
  }
  // Also: italic display headings (gate 38a)
  const italicHeadings = [];
  document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(h => {
    const s = window.getComputedStyle(h);
    if (s.fontStyle === "italic") {
      italicHeadings.push({
        tag: h.tagName,
        text: h.textContent?.slice(0, 60),
        cls: h.className?.toString().slice(0, 60),
      });
    }
  });

  // Check transform: scale (anti-pattern)
  const scaledOnHover = [];
  // We can't trigger hover programmatically here; check static transforms
  allEls.forEach(el => {
    const s = window.getComputedStyle(el);
    if (s.transform && s.transform !== "none" && s.transform !== "matrix(1, 0, 0, 1, 0, 0)") {
      // Some transforms like translateY are OK in motion but not scale on default state
      if (s.transform.includes("scale") && parseFloat(s.transform.match(/scale\(([^)]+)\)/)?.[1] || "1") !== 1) {
        scaledOnHover.push({
          tag: el.tagName,
          cls: el.className?.toString().slice(0, 60),
          transform: s.transform,
        });
      }
    }
  });

  // Pills, gradients, shadows
  const shadowedElements = [];
  allEls.forEach(el => {
    const s = window.getComputedStyle(el);
    if (s.boxShadow && s.boxShadow !== "none") {
      shadowedElements.push({
        tag: el.tagName,
        cls: el.className?.toString().slice(0, 60),
        shadow: s.boxShadow.slice(0, 50),
      });
    }
  });

  const gradients = [];
  allEls.forEach(el => {
    const s = window.getComputedStyle(el);
    if (s.backgroundImage && s.backgroundImage.includes("gradient")) {
      gradients.push({
        tag: el.tagName,
        cls: el.className?.toString().slice(0, 60),
        bg: s.backgroundImage.slice(0, 80),
      });
    }
  });

  // Check root html/body overflow-x
  const htmlOverflowX = window.getComputedStyle(document.documentElement).overflowX;
  const bodyOverflowX = window.getComputedStyle(document.body).overflowX;

  return {
    roundedOffenders: offenders.slice(0, 20),
    roundedTotalCount: offenders.length,
    italicHeadings,
    scaledOnHover,
    shadowedElements: shadowedElements.slice(0, 10),
    gradients: gradients.slice(0, 10),
    htmlOverflowX,
    bodyOverflowX,
  };
});

console.log(JSON.stringify(audit, null, 2));
await browser.close();
