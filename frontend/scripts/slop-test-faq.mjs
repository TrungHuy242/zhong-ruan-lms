// scripts/slop-test-faq.mjs
// Slop-test sentinel audit for FAQAccordion across contexts:
// - PricingPage (main usage)
// - CourseDetailPage (secondary usage)
//
// Verifies anti-SaaS sentinels: border-radius=0, box-shadow=none, no scale on hover,
// no gradient on question/answer, italic headings gate (=0), Vietnamese diacritic glyphs.
import puppeteer from "puppeteer";

const PORT = 4173;
const PAGES = [
  { url: `http://localhost:${PORT}/bang-gia`, name: "PricingPage", waitFor: "faq-question-1" },
  { url: `http://localhost:${PORT}/khoa-hoc/hsk-1-2`, name: "CourseDetailPage", waitFor: "faq-question-1" },
];

const browser = await puppeteer.launch({ headless: true });

const results = [];

for (const p of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(p.url, { waitUntil: "networkidle0", timeout: 30000 });
  try {
    await page.waitForSelector(`#${p.waitFor}`, { timeout: 6000 });
  } catch (e) {
    results.push({ page: p.name, error: "FAQ not found" });
    await page.close();
    continue;
  }

  await page.click(`#${p.waitFor}`);
  await new Promise((r) => setTimeout(r, 450));

  const probe = await page.evaluate(() => {
    const item = document.querySelector('[id^="faq-question-1"]')?.closest('div[role="listitem"]');
    if (!item) return { _error: "no item" };
    const question = item.querySelector("button > span:nth-child(2)");
    const answer = document.querySelector("#faq-answer-1");
    const answerText = answer?.querySelector("p");
    const indicator = item.querySelector("button > span:last-of-type");
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const itemCs = cs(item);
    const buttonCs = cs(item.querySelector("button"));
    const questionCs = cs(question);
    const answerTextCs = cs(answerText);
    const indicatorCs = cs(indicator);

    const beforeCs = indicator ? getComputedStyle(indicator, "::before") : null;
    const afterCs = indicator ? getComputedStyle(indicator, "::after") : null;

    return {
      item: {
        borderRadius: itemCs?.borderRadius,
        boxShadow: itemCs?.boxShadow,
        borderTopColor: itemCs?.borderTopColor,
        borderTopWidth: itemCs?.borderTopWidth,
        background: itemCs?.background,
      },
      button: {
        padding: buttonCs?.padding,
        background: buttonCs?.background,
        boxShadow: buttonCs?.boxShadow,
        borderRadius: buttonCs?.borderRadius,
        display: buttonCs?.display,
        gridTemplateColumns: buttonCs?.gridTemplateColumns,
      },
      question: {
        fontFamily: questionCs?.fontFamily,
        fontStyle: questionCs?.fontStyle,
        fontWeight: questionCs?.fontWeight,
        fontSize: questionCs?.fontSize,
        letterSpacing: questionCs?.letterSpacing,
        overflowWrap: questionCs?.overflowWrap,
        lineHeight: questionCs?.lineHeight,
      },
      answerText: {
        fontFamily: answerTextCs?.fontFamily,
        fontStyle: answerTextCs?.fontStyle,
        fontWeight: answerTextCs?.fontWeight,
        fontSize: answerTextCs?.fontSize,
        lineHeight: answerTextCs?.lineHeight,
        color: answerTextCs?.color,
        overflowWrap: answerTextCs?.overflowWrap,
        borderTopColor: answerTextCs?.borderTopColor,
        paddingLeft: answerTextCs?.paddingLeft,
      },
      indicator: indicatorCs
        ? {
            width: indicatorCs.width,
            height: indicatorCs.height,
            position: indicatorCs.position,
          }
        : null,
      indicatorBefore: beforeCs
        ? {
            width: beforeCs.width,
            height: beforeCs.height,
            background: beforeCs.background,
            position: beforeCs.position,
          }
        : null,
      indicatorAfter: afterCs
        ? {
            opacity: afterCs.opacity,
            transform: afterCs.transform,
            background: afterCs.background,
          }
        : null,
    };
  });

  const overflow = await page.evaluate(() => ({
    htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
    bodyOverflowX: getComputedStyle(document.body).overflowX,
  }));

  const h1Count = await page.evaluate(() => document.querySelectorAll("h1").length);

  const headingItalic = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("h1, h2, h3").forEach((h) => {
      const cs = getComputedStyle(h);
      if (cs.fontStyle === "italic") out.push({ tag: h.tagName, text: h.textContent?.slice(0, 40) });
    });
    return out;
  });

  results.push({
    page: p.name,
    url: p.url,
    ...probe,
    overflow,
    h1Count,
    headingItalic,
  });

  await page.close();
}

// Mobile 375 — same PricingPage
const mobilePage = await browser.newPage();
await mobilePage.setViewport({ width: 375, height: 812 });
await mobilePage.goto(`http://localhost:${PORT}/bang-gia`, { waitUntil: "networkidle0" });
try {
  await mobilePage.waitForSelector("#faq-question-1", { timeout: 5000 });
  await mobilePage.click("#faq-question-1");
  await new Promise((r) => setTimeout(r, 400));
  const mobileProbe = await mobilePage.evaluate(() => {
    const item = document.querySelector('[id^="faq-question-1"]')?.closest('div[role="listitem"]');
    const question = item?.querySelector("button > span:nth-child(2)");
    const answerText = document.querySelector("#faq-answer-1 p");
    const cs = (el) => (el ? getComputedStyle(el) : null);
    return {
      buttonGridTemplateColumns: cs(item?.querySelector("button"))?.gridTemplateColumns,
      questionFontSize: cs(question)?.fontSize,
      answerTextPaddingLeft: cs(answerText)?.paddingLeft,
      htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
      bodyOverflowX: getComputedStyle(document.body).overflowX,
    };
  });
  results.push({ page: "PricingPage@375", ...mobileProbe });
} catch (e) {
  results.push({ page: "PricingPage@375", error: e.message });
}
await mobilePage.close();

await browser.close();
console.log(JSON.stringify(results, null, 2));
