// scripts/test-auth-editorial-override.mjs
// Audit override Input + Button + bỏ Login.png trên Login + Register.
// Kiểm tra:
//  1. BrandPanel KHÔNG còn chứa <img src="/Banner/Login.png">.
//  2. BrandPanel chứa logo + title + tagline + bullets (giống Register).
//  3. Input: border-radius:0, box-shadow:none, border-bottom hairline.
//  4. Input label: uppercase eyebrow với letter-spacing 0.18em.
//  5. Button submit: border-radius:0, box-shadow:none, font uppercase.
//  6. Button primary bg = brand-red #C8102E = rgb(200,16,46).
//  7. Button submit có arrow → (::after content).
//  8. Focus state brand-red border-bottom.
import puppeteer from "puppeteer";

const BASE = process.env.AUTH_TEST_URL ?? "http://localhost:5174";
const browser = await puppeteer.launch({ headless: true });
let failures = 0;
const log = (ok, msg) => { if (!ok) failures++; console.log(`[${ok ? "PASS" : "FAIL"}] ${msg}`); };

try {
  for (const path of ["/login", "/register"]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0", timeout: 30000 });
    await page.waitForSelector("form", { timeout: 10000 });

    const diag = await page.evaluate((p) => {
      // 1. Không còn Login.png trên /login
      const loginImg = document.querySelector('img[src*="Banner/Login.png"]');
      const allImgs = Array.from(document.querySelectorAll('img')).map((i) => i.getAttribute("src"));

      // 2. Brand panel có logo + title + bullets
      const brandTitle = document.querySelector('[class*="brandTitle"]');
      const brandBullets = document.querySelector('[class*="bullets"]');
      const bulletsCount = brandBullets ? brandBullets.querySelectorAll("li").length : 0;
      const logoImg = document.querySelector('[class*="logoImg"]');

      // 3. Input fieldWrapper
      const fieldWrapper = document.querySelector('[class*="fieldWrapper"]');
      const fwCs = fieldWrapper ? getComputedStyle(fieldWrapper) : null;

      // 4. Input label
      const label = document.querySelector('[class*="label"]');
      const labelCs = label ? getComputedStyle(label) : null;

      // 5. Input input
      const input = document.querySelector('[class*="input"]');
      const inputCs = input ? getComputedStyle(input) : null;

      // 6. Button submit
      const submitBtn = document.querySelector('button[type="submit"]');
      const btnCs = submitBtn ? getComputedStyle(submitBtn) : null;

      // 7. Button arrow ::after content
      const btnAfterContent = submitBtn ? getComputedStyle(submitBtn, "::after").content : null;

      return {
        hasLoginImg: !!loginImg,
        allImgs,
        brandTitleText: brandTitle?.textContent?.trim() ?? null,
        brandTitleFont: brandTitle ? getComputedStyle(brandTitle).fontFamily : null,
        bulletsCount,
        hasLogoImg: !!logoImg,
        logoImgSrc: logoImg?.getAttribute("src") ?? null,
        fieldWrapper: fwCs ? {
          borderRadius: fwCs.borderRadius,
          boxShadow: fwCs.boxShadow,
          borderBottomWidth: fwCs.borderBottomWidth,
          borderBottomColor: fwCs.borderBottomColor,
          height: fwCs.height,
        } : null,
        label: labelCs ? {
          fontSize: labelCs.fontSize,
          fontWeight: labelCs.fontWeight,
          textTransform: labelCs.textTransform,
          letterSpacing: labelCs.letterSpacing,
        } : null,
        input: inputCs ? {
          fontSize: inputCs.fontSize,
          fontFamily: inputCs.fontFamily,
          fontStyle: inputCs.fontStyle,
          letterSpacing: inputCs.letterSpacing,
          borderRadius: inputCs.borderRadius,
        } : null,
        submitBtn: btnCs ? {
          borderRadius: btnCs.borderRadius,
          boxShadow: btnCs.boxShadow,
          backgroundColor: btnCs.backgroundColor,
          color: btnCs.color,
          fontSize: btnCs.fontSize,
          textTransform: btnCs.textTransform,
          letterSpacing: btnCs.letterSpacing,
          height: btnCs.height,
        } : null,
        btnAfterContent,
      };
    }, path);

    console.log(`\n=== ${path} ===`);

    // 1. No Login.png
    if (path === "/login") {
      log(!diag.hasLoginImg, "Login: brandPanel does NOT contain Login.png image");
      log(diag.allImgs.every((s) => !s?.includes("Banner/Login.png")), "Login: no <img> with /Banner/Login.png src anywhere");
    }

    // 2. Brand panel structure (logo + title + 3 bullets)
    log(diag.hasLogoImg && diag.logoImgSrc === "/logo/logo-full.png", `${path}: brandPanel has logo (logo-full.png)`);
    log(diag.brandTitleText !== null, `${path}: brandPanel has brandTitle ("${diag.brandTitleText}")`);
    log(diag.brandTitleFont?.includes("Source Serif 4") ?? false, `${path}: brandTitle uses Source Serif 4`);
    log(diag.bulletsCount >= 3, `${path}: brandPanel has ≥3 bullets (got ${diag.bulletsCount})`);

    // 3. Input fieldWrapper
    log(diag.fieldWrapper?.borderRadius === "0px", `${path}: fieldWrapper border-radius = 0px`);
    log(/^(none|rgba\(0, 0, 0, 0\) 0px 0px 0px 0px)/.test(diag.fieldWrapper?.boxShadow ?? ""), `${path}: fieldWrapper box-shadow = none`);
    log(diag.fieldWrapper?.height === "48px", `${path}: fieldWrapper height = 48px`);

    // 4. Label uppercase eyebrow
    log(diag.label?.textTransform === "uppercase", `${path}: label text-transform: uppercase`);
    log(
      diag.label?.letterSpacing === "0.18em" || diag.label?.letterSpacing === "1.98px",
      `${path}: label letter-spacing 0.18em (got "${diag.label?.letterSpacing}")`,
    );
    log(diag.label?.fontWeight === "600", `${path}: label font-weight 600`);

    // 5. Input body — no italic, no rounded
    log(diag.input?.fontStyle === "normal", `${path}: input body font-style normal`);
    log(diag.input?.borderRadius === "0px", `${path}: input border-radius 0`);

    // 6. Button submit — editorial
    log(diag.submitBtn?.borderRadius === "0px", `${path}: submitBtn border-radius 0`);
    log(/^(none|rgba\(0, 0, 0, 0\) 0px 0px 0px 0px)/.test(diag.submitBtn?.boxShadow ?? ""), `${path}: submitBtn box-shadow none`);
    log(diag.submitBtn?.backgroundColor === "rgb(200, 16, 46)", `${path}: submitBtn bg = brand-red #C8102E (got ${diag.submitBtn?.backgroundColor})`);
    log(diag.submitBtn?.textTransform === "uppercase", `${path}: submitBtn uppercase`);
    log(diag.submitBtn?.height === "52px", `${path}: submitBtn height 52px`);

    // 7. Arrow ::after
    log(
      diag.btnAfterContent && /→|arrow/i.test(diag.btnAfterContent),
      `${path}: submitBtn has arrow ::after (got "${diag.btnAfterContent}")`,
    );

    // 8. Focus state — click input to trigger :focus-within
    await page.click('input[type="email"]');
    await new Promise((r) => setTimeout(r, 500));
    const focused = await page.evaluate(() => {
      // Lấy fieldWrapper là ancestor thực sự của input email
      const input = document.querySelector('input[type="email"]');
      if (!input) return null;
      let parent = input.parentElement;
      while (parent) {
        if (parent.className && parent.className.includes("fieldWrapper")) {
          break;
        }
        parent = parent.parentElement;
      }
      if (!parent) return null;
      const cs = getComputedStyle(parent);
      return {
        isFocused: document.activeElement === input,
        fwClass: parent.className,
        borderBottomColor: cs.borderBottomColor,
      };
    });
    if (focused) {
      const isBrandRed = focused.borderBottomColor === "rgb(200, 16, 46)";
      log(isBrandRed, `${path}: focused input border-bottom = brand-red (got ${focused.borderBottomColor})`);
    } else {
      log(false, `${path}: could not find ancestor fieldWrapper of input[type="email"]`);
    }

    await page.close();
  }
} finally {
  await browser.close().catch(() => {});
}

console.log(`\n=== FAILURES: ${failures} ===`);
process.exit(failures > 0 ? 1 : 0);
