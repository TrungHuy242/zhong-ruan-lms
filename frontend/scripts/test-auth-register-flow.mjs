// scripts/test-auth-register-flow.mjs
// Full E2E flow:
//   1. Mở /register → điền form → submit → redirect về /login
//   2. Trên /login: kiểm tra banner success + email prefilled
//   3. Submit /login → redirect /dashboard
//   4. Verify AuthMinimalHeader đã render ở /login + /register
import puppeteer from "puppeteer";

const BASE = process.env.AUTH_TEST_URL ?? "http://localhost:5174";

const ts = Date.now();
const email = `e2e.login.${ts}@example.com`;
const fullName = `Nguyễn Văn A Test ${ts}`;
const phone = `0912345678`;
const password = "password123";

const browser = await puppeteer.launch({ headless: true });
let phaseFailures = 0;
const log = (ok, msg, extra) => {
  if (!ok) phaseFailures++;
  console.log(`[${ok ? "PASS" : "FAIL"}] ${msg}${extra ? " " + JSON.stringify(extra) : ""}`);
};

try {
  // ============================================================
  // Phase 1: Register
  // ============================================================
  console.log("\n=== Phase 1: /register submit ===");
  const regPage = await browser.newPage();
  await regPage.setViewport({ width: 1280, height: 900 });
  await regPage.goto(`${BASE}/register`, { waitUntil: "networkidle0", timeout: 30000 });

  // Verify AuthMinimalHeader đã render
  const headerBackHref = await regPage.evaluate(() => {
    const a = document.querySelector('a[aria-label*="Về trang chủ"]');
    return a?.getAttribute("href") ?? null;
  });
  log(headerBackHref === "/", "Register: AuthMinimalHeader logo back-link → /");

  // Fill the form
  await regPage.waitForSelector('input[name="fullName"]', { timeout: 10000 });
  await regPage.type('input[name="fullName"]', fullName);
  await regPage.type('input[name="email"]', email);
  await regPage.type('input[name="phone"]', phone);
  await regPage.type('input[name="password"]', password);
  await regPage.type('input[name="confirmPassword"]', password);

  // Capture network response of POST /api/auth/register
  const regResponsePromise = regPage.waitForResponse(
    (res) => res.url().includes("/api/auth/register") && res.request().method() === "POST",
    { timeout: 20000 },
  );

  await Promise.all([
    regResponsePromise,
    regPage.click('button[type="submit"]'),
  ]);
  const regResponse = await regResponsePromise;
  const regBody = await regResponse.json();
  log(regResponse.status() === 200 || regResponse.status() === 201, `Register API status ${regResponse.status()}`, regBody);

  // Đợi redirect về /login
  await regPage.waitForFunction(() => location.pathname === "/login", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 800)); // settle state

  const regFinalUrl = regPage.url();
  log(regFinalUrl.includes("/login"), `After register, redirected to /login (was: ${regFinalUrl})`);

  // Verify banner Alert success
  const bannerText = await regPage.evaluate(() => {
    const alert = document.querySelector('[role="status"]') || document.querySelector('[role="alert"]');
    return alert?.textContent ?? null;
  });
  log(
    bannerText !== null && /đăng ký|thành công/i.test(bannerText ?? ""),
    "Banner Alert success visible after register",
    { bannerText },
  );

  // Verify email pre-filled
  const emailValue = await regPage.evaluate(() => document.querySelector('input[name="email"]')?.value);
  log(emailValue === email, `Email prefilled (expected ${email})`, { emailValue });

  // ============================================================
  // Phase 2: Login
  // ============================================================
  console.log("\n=== Phase 2: /login submit (với email vừa tạo) ===");
  // Sử dụng regPage (đã ở /login) — nhập password và submit
  await regPage.type('input[name="password"]', password);

  // Verify AuthMinimalHeader đã render trên /login
  const headerBackHref2 = await regPage.evaluate(() => {
    const a = document.querySelector('a[aria-label*="Về trang chủ"]');
    return a?.getAttribute("href") ?? null;
  });
  log(headerBackHref2 === "/", "Login: AuthMinimalHeader logo back-link → /");

  // Capture network response of POST /api/auth/login
  const loginResponsePromise = regPage.waitForResponse(
    (res) => res.url().includes("/api/auth/login") && res.request().method() === "POST",
    { timeout: 20000 },
  );
  await Promise.all([
    loginResponsePromise,
    regPage.click('button[type="submit"]'),
  ]);
  const loginResponse = await loginResponsePromise;
  const loginBody = await loginResponse.json();
  log(loginResponse.status() === 200, `Login API status ${loginResponse.status()}`, { user: loginBody?.data?.user?.email ?? loginBody?.user?.email ?? loginBody?.email });

  // Đợi redirect về /dashboard
  await regPage.waitForFunction(() => location.pathname === "/dashboard", { timeout: 15000 });
  const finalUrl = regPage.url();
  log(finalUrl.includes("/dashboard"), `After login → /dashboard (got: ${finalUrl})`);

  await regPage.close();

  // ============================================================
  // Phase 3: Click logo từ /dashboard AuthMinimalHeader
  // (authed dashboard KHÔNG có AuthMinimalHeader — dùng /login để retest)
  // ============================================================
  console.log("\n=== Phase 3: Click logo on /login + /register → / ===");
  for (const path of ["/login", "/register"]) {
    const p = await browser.newPage();
    await p.setViewport({ width: 1280, height: 900 });
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle0", timeout: 15000 });
    await p.waitForSelector('a[aria-label*="Về trang chủ"]', { timeout: 8000 });
    await p.click('a[aria-label*="Về trang chủ"]');
    await new Promise((r) => setTimeout(r, 1500));
    const fp = await p.evaluate(() => location.pathname);
    log(fp === "/", `From ${path}, logo click → / (got: ${fp})`);
    await p.close();
  }
} catch (err) {
  console.error("[ERR] E2E flow failed:", err.message);
  phaseFailures++;
} finally {
  await browser.close().catch(() => {});
}

console.log(`\n=== FAILURES: ${phaseFailures} ===`);
process.exit(phaseFailures > 0 ? 1 : 0);
