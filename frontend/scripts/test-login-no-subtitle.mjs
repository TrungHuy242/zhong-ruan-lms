// scripts/test-login-no-subtitle.mjs
import puppeteer from "puppeteer";
const b = await puppeteer.launch({ headless: true });
let failures = 0;
const log = (ok, msg) => { if (!ok) failures++; console.log(`[${ok ? "PASS" : "FAIL"}] ${msg}`); };
try {
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  await p.goto("http://localhost:5174/login", { waitUntil: "networkidle0", timeout: 30000 });
  await p.waitForSelector("form", { timeout: 10000 });

  const data = await p.evaluate(() => {
    const subtitle = document.querySelector('[class*="formSubtitle"]');
    const formHeader = document.querySelector('[class*="formHeader"]');
    const children = formHeader ? Array.from(formHeader.children).map((c) => c.tagName + (c.className ? "." + c.className.split(" ")[0] : "")) : [];
    const eyebrow = document.querySelector('[class*="eyebrow"]');
    const title = document.querySelector('[class*="formTitle"]');
    const input = document.querySelector('input[type="email"]');
    const submitBtn = document.querySelector('button[type="submit"]');
    const footerLink = document.querySelector('[class*="footerLink"]');
    return {
      subtitleExists: !!subtitle,
      subtitleText: subtitle?.textContent ?? null,
      formHeaderChildren: children,
      eyebrowText: eyebrow?.textContent ?? null,
      titleText: title?.textContent ?? null,
      inputExists: !!input,
      submitBtnText: submitBtn?.textContent ?? null,
      footerLinkText: footerLink?.textContent ?? null,
    };
  });

  console.log("\n=== /login sanity ===");
  log(!data.subtitleExists, "formSubtitle NODE GONE (no <p class*='formSubtitle'>)");
  log(data.formHeaderChildren.length === 2, `formHeader children = 2 (eyebrow + h2), got ${data.formHeaderChildren.length}: ${data.formHeaderChildren.join(", ")}`);
  log(data.eyebrowText === "Đăng nhập", "eyebrow text = 'Đăng nhập' (other elements unchanged)");
  log(data.titleText === "Tiếp tục hành trình học", "h2 title unchanged");
  log(data.inputExists, "email input still present");
  log(data.submitBtnText?.includes("Đăng nhập") ?? false, "submit button unchanged");
  log(data.footerLinkText?.includes("Đăng ký") ?? false, "footer link 'Đăng ký ngay' unchanged");

  // Verify /register also unaffected
  await p.goto("http://localhost:5174/register", { waitUntil: "networkidle0" });
  const reg = await p.evaluate(() => {
    const subtitle = document.querySelector('[class*="formSubtitle"]');
    return { subtitleExists: !!subtitle, subtitleText: subtitle?.textContent ?? null };
  });
  console.log("\n=== /register sanity ===");
  log(reg.subtitleText !== null, `/register: formSubtitle STILL present (unchanged) — text="${reg.subtitleText}"`);
} finally {
  await b.close();
}

console.log(`\n=== FAILURES: ${failures} ===`);
process.exit(failures > 0 ? 1 : 0);
