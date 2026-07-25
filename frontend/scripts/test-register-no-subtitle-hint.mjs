// scripts/test-register-no-subtitle-hint.mjs
import puppeteer from "puppeteer";
const b = await puppeteer.launch({ headless: true });
let failures = 0;
const log = (ok, msg) => { if (!ok) failures++; console.log(`[${ok ? "PASS" : "FAIL"}] ${msg}`); };
try {
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  await p.goto("http://localhost:5174/register", { waitUntil: "networkidle0", timeout: 30000 });
  await p.waitForSelector("form", { timeout: 10000 });

  const data = await p.evaluate(() => {
    const subtitle = document.querySelector('[class*="formSubtitle"]');
    const formHeader = document.querySelector('[class*="formHeader"]');
    const headerKids = formHeader ? Array.from(formHeader.children).map((c) => c.tagName + (c.className ? "." + c.className.split(" ")[0] : "")) : [];
    const allHints = Array.from(document.querySelectorAll('[class*="hintText"]')).map((s) => s.textContent);
    const phoneInput = document.querySelector('input[name="phone"]');
    // Input.tsx render span[id$="-hint"] chỉ khi có hint prop. Đã bỏ hint → span không tồn tại.
    const phoneHintSpan = phoneInput?.closest("div")?.parentElement?.querySelector('[id$="-hint"]');
    const eyebrow = document.querySelector('[class*="eyebrow"]');
    const title = document.querySelector('[class*="formTitle"]');
    const allInputs = Array.from(document.querySelectorAll("input")).map((i) => i.getAttribute("name"));
    const submitBtn = document.querySelector('button[type="submit"]');
    const footerLink = document.querySelector('[class*="footerLink"]');
    return {
      subtitleExists: !!subtitle,
      headerKids,
      hintTexts: allHints,
      phoneInputExists: !!phoneInput,
      phoneHintSpanExists: !!phoneHintSpan,
      eyebrowText: eyebrow?.textContent ?? null,
      titleText: title?.textContent ?? null,
      allInputNames: allInputs,
      submitBtnText: submitBtn?.textContent ?? null,
      footerLinkText: footerLink?.textContent ?? null,
    };
  });

  console.log("\n=== /register sanity ===");
  log(!data.subtitleExists, "formSubtitle NODE GONE (no <p class*='formSubtitle'>)");
  log(data.headerKids.length === 2, `formHeader children = 2 (eyebrow + h2), got ${data.headerKids.length}: ${data.headerKids.join(", ")}`);
  log(data.hintTexts.length === 0, `phone hintText gone (got ${data.hintTexts.length} hintText spans): ${JSON.stringify(data.hintTexts)}`);
  log(!data.phoneHintSpanExists, `no <span id$='-hint'> adjacent to phone input`);
  log(data.eyebrowText === "Đăng ký", `eyebrow text = 'Đăng ký' (unchanged)`);
  log(data.titleText === "Mở tài khoản học viên mới", `h2 title unchanged`);
  log(JSON.stringify(data.allInputNames) === JSON.stringify(["fullName","email","phone","password","confirmPassword"]), `all 5 inputs still present: ${data.allInputNames.join(", ")}`);
  log(data.submitBtnText?.includes("Đăng ký") ?? false, `submit button unchanged`);
  log(data.footerLinkText?.includes("Đăng nhập") ?? false, `footer link 'Đăng nhập ngay' unchanged`);

  // Verify /login also unaffected (just had formSubtitle removed previously)
  await p.goto("http://localhost:5174/login", { waitUntil: "networkidle0" });
  const login = await p.evaluate(() => {
    const subtitle = document.querySelector('[class*="formSubtitle"]');
    const hintTexts = Array.from(document.querySelectorAll('[class*="hintText"]')).map((s) => s.textContent);
    return { subtitleExists: !!subtitle, hintCount: hintTexts.length };
  });
  console.log("\n=== /login sanity (should still be clean) ===");
  log(!login.subtitleExists, `/login: formSubtitle still gone (was removed in prev round)`);
  log(login.hintCount === 0, `/login: no hintText spans (LoginPage had no hints to begin with)`);
} finally {
  await b.close();
}
console.log(`\n=== FAILURES: ${failures} ===`);
process.exit(failures > 0 ? 1 : 0);