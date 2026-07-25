// scripts/test-auth-flow.mjs
// Audit AuthMinimalHeader + Visual + Click flow cho Login & Register.
//
// Kiểm tra:
//  1. Trên cả /login và /register: render AuthMinimalHeader (logo + back link).
//  2. Click logo trên /login → URL phải là / (Trang chủ).
//  3. Click logo trên /register → URL phải là / (Trang chủ).
//  4. Sentinel scan cho FormCard (border-radius 0, box-shadow none, brand-red border-top).
//  5. Diacritic check trên form labels (Email, Mật khẩu, Họ và tên, Số điện thoại…).
import puppeteer from "puppeteer";

const PREVIEW = process.env.AUTH_TEST_URL ?? "http://localhost:5183";

const results = [];
const browser = await puppeteer.launch({ headless: true });

try {
  // ============================================================
  // 1. Render + Sentinel + diacritic scan trên /login và /register
  // ============================================================
  for (const path of ["/login", "/register"]) {
    const url = `${PREVIEW}${path}`;
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    let navOk = true;
    try {
      await page.goto(url, { waitUntil: "networkidle0", timeout: 20000 });
    } catch (e) {
      navOk = false;
    }

    const diag = await page.evaluate((pathname) => {
      const body = document.body;
      const html = body.innerHTML;
      const url = location.pathname + location.search;

      // AuthMinimalHeader sentinel
      const backLink = document.querySelector('a[aria-label*="Về trang chủ"]');
      const backLinkHref = backLink?.getAttribute("href") ?? null;
      const backLinkRuleExists = !!document.querySelector('[class*="backLinkRule"]');

      // Form sentinel
      const formCard = document.querySelector('[class*="formCard"]');
      const formCardCs = formCard ? getComputedStyle(formCard) : null;

      // Heading sentinel
      const formTitle = document.querySelector('[class*="formTitle"]') || document.querySelector("h2");
      const formTitleCs = formTitle ? getComputedStyle(formTitle) : null;

      // Diacritic check
      const labels = Array.from(document.querySelectorAll("label")).map((l) => l.textContent.trim());
      const hasMauKhau = html.includes("Mật khẩu") || html.includes("M?t kh?u");
      const hasEmail = html.includes("Email");
      const hasHoTen = html.includes("Họ và tên") || html.includes("H? v? tên");
      const hasPhone = html.includes("Số điện thoại") || html.includes("S? ?i?n tho?i");
      const hasDangNhap = html.includes("Đăng nhập") || html.includes("??ng nh?p");
      const hasDangKy = html.includes("Đăng ký") || html.includes("??ng ký");

      return {
        url,
        pathname: location.pathname,
        backLinkHref,
        backLinkRuleExists,
        formCard: formCardCs
          ? {
              borderRadius: formCardCs.borderRadius,
              boxShadow: formCardCs.boxShadow,
              borderTopWidth: formCardCs.borderTopWidth,
              borderTopColor: formCardCs.borderTopColor,
            }
          : null,
        formTitleStyle: formTitleCs
          ? {
              fontFamily: formTitleCs.fontFamily,
              fontStyle: formTitleCs.fontStyle,
              fontWeight: formTitleCs.fontWeight,
            }
          : null,
        labels,
        diacritics: { hasMauKhau, hasEmail, hasHoTen, hasPhone, hasDangNhap, hasDangKy },
        renderedOk: !!formCard && !!formTitle,
      };
    }, path);

    results.push({ phase: "render", path, navOk, ...diag });
    await page.close();
  }

  // ============================================================
  // 2. Click logo trên /login — phải về /
  // ============================================================
  for (const path of ["/login", "/register"]) {
    const url = `${PREVIEW}${path}`;
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 20000 });
    await page.waitForSelector('a[aria-label*="Về trang chủ"]', { timeout: 8000 });

    // Click the Logo (first `<a>` with the aria-label)
    await page.click('a[aria-label*="Về trang chủ"]');
    await new Promise((r) => setTimeout(r, 1200));

    const finalPath = await page.evaluate(() => location.pathname);
    const finalUrl = page.url();

    results.push({ phase: "click-logo", path, finalPath, finalUrl, ok: finalPath === "/" });
    await page.close();
  }
} finally {
  await browser.close().catch(() => {});
}

// ============================================================
// Output report
// ============================================================
let failed = 0;
for (const r of results) {
  if (r.phase === "render") {
    const sentOk =
      r.formCard?.borderRadius === "0px" &&
      /^(none|rgba\(0, 0, 0, 0\) 0px 0px 0px 0px|0px 0px 0px 0px )/.test(r.formCard?.boxShadow ?? "") &&
      r.formCard?.borderTopColor.includes("200, 16, 46"); // brand-red #C8102E = rgb(200,16,46)
    const fontOk =
      r.formTitleStyle?.fontStyle === "normal" &&
      (r.formTitleStyle?.fontFamily?.includes("Source Serif 4") ?? false);
    const diaOk =
      r.diacritics?.hasMauKhau && r.diacritics?.hasEmail && r.diacritics?.hasDangNhap;
    const headerOk = r.backLinkHref === "/" && r.backLinkRuleExists;
    const overall = r.navOk && sentOk && fontOk && diaOk && headerOk && r.renderedOk;
    if (!overall) failed++;
    console.log(
      `[render ${r.path}] nav=${r.navOk ? "✓" : "✗"} card=${sentOk ? "✓" : "✗"} title=${fontOk ? "✓" : "✗"} dia=${diaOk ? "✓" : "✗"} header=${headerOk ? "✓" : "✗"}`,
    );
    if (!overall) {
      console.log("  detail:", JSON.stringify(r, null, 2));
    }
  } else {
    if (!r.ok) failed++;
    console.log(`[click-logo from ${r.path}] → ${r.finalPath}  ${r.ok ? "✓" : "✗ expected /"}`);
  }
}

console.log(`\n=== FAIL: ${failed} ===`);
process.exit(failed > 0 ? 1 : 0);
