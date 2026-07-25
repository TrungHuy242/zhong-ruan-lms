// scripts/diacritic-faq-check.mjs
// Vietnamese diacritic glyph integrity check on FAQAccordion contexts.
// Specifically tests for character-decomposition splits that produce "Họ c phí" instead of "Học phí".
// Tests font-family, letter-spacing, overflow-wrap on .question and .answerText.
import puppeteer from "puppeteer";

const PORT = 4173;
const PAGES = [
  { url: `http://localhost:${PORT}/bang-gia`, name: "PricingPage" },
  { url: `http://localhost:${PORT}/khoa-hoc/hsk-1-2`, name: "CourseDetailPage" },
];

const browser = await puppeteer.launch({ headless: true });

const results = [];

for (const p of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(p.url, { waitUntil: "networkidle0", timeout: 30000 });
  try {
    await page.waitForSelector("#faq-question-1", { timeout: 6000 });
  } catch (e) {
    results.push({ page: p.name, error: "FAQ not found" });
    await page.close();
    continue;
  }
  await page.click("#faq-question-1");
  await new Promise((r) => setTimeout(r, 400));

  const probe = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('[id^="faq-question-"]'));
    const out = [];
    for (const q of items) {
      const id = q.id;
      const answer = document.querySelector(`#${id.replace("question-", "answer-")}`);
      const questionSpan = q.querySelector("span:nth-child(2)");
      const answerText = answer?.querySelector("p");
      const qcs = questionSpan ? getComputedStyle(questionSpan) : null;
      const acs = answerText ? getComputedStyle(answerText) : null;
      const qRect = questionSpan?.getBoundingClientRect();
      const aRect = answerText?.getBoundingClientRect();
      out.push({
        id,
        question: {
          text: questionSpan?.textContent?.slice(0, 60),
          fontFamily: qcs?.fontFamily,
          fontStyle: qcs?.fontStyle,
          fontWeight: qcs?.fontWeight,
          fontSize: qcs?.fontSize,
          letterSpacing: qcs?.letterSpacing,
          overflowWrap: qcs?.overflowWrap,
          width: qRect ? Math.round(qRect.width) : null,
          height: qRect ? Math.round(qRect.height) : null,
        },
        answer: {
          text: answerText?.textContent?.slice(0, 60),
          fontFamily: acs?.fontFamily,
          fontStyle: acs?.fontStyle,
          fontWeight: acs?.fontWeight,
          fontSize: acs?.fontSize,
          letterSpacing: acs?.letterSpacing,
          overflowWrap: acs?.overflowWrap,
          width: aRect ? Math.round(aRect.width) : null,
          height: aRect ? Math.round(aRect.height) : null,
        },
      });
    }
    return out;
  });

  results.push({ page: p.name, items: probe });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
