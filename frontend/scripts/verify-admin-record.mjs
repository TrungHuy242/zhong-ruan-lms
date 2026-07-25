// scripts/verify-admin-record.mjs
// Verify E2E: contact-record exists in admin /api/admin/contact-requests via real backend.
import puppeteer from "puppeteer";

const DEV_URL = "http://127.0.0.1:5173/";
const ADMIN_EMAIL = "admin@zhongruan.com";
const ADMIN_PASS = "123456";

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.goto(DEV_URL, { waitUntil: "networkidle0", timeout: 30000 });

// 1. Login as admin
const loginResult = await page.evaluate(async (payload) => {
  try {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await r.json();
    return {
      status: r.status,
      token: body?.data?.accessToken || body?.accessToken || body?.token || null,
      body,
    };
  } catch (e) {
    return { error: String(e) };
  }
}, { email: ADMIN_EMAIL, password: ADMIN_PASS });

console.log("LOGIN RESULT:", JSON.stringify(loginResult, null, 2));

if (!loginResult.token) {
  // Try with different test admin credentials
  const tries = [
    { email: "admin@zhongruan-lms.local", password: "Admin@123456" },
    { email: "admin@zhongruan.vn", password: "Admin@123" },
    { email: "admin@zhongruan.vn", password: "admin123" },
    { email: "admin@zhongruan-lms.local", password: "admin123" },
  ];
  for (const t of tries) {
    if (t.email === ADMIN_EMAIL && t.password === ADMIN_PASS) continue;
    const r = await page.evaluate(async (p) => {
      try {
        const resp = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        });
        const body = await resp.json();
        return {
          status: resp.status,
          token: body?.data?.accessToken || body?.accessToken || body?.token || null,
        };
      } catch (e) { return { error: String(e) }; }
    }, t);
    if (r.token) {
      console.log("WORKING CRED:", JSON.stringify(t));
      loginResult.token = r.token;
      break;
    }
  }
}

if (!loginResult.token) {
  console.log("No working admin credentials found. Cannot verify record via admin API.");
  await browser.close();
  process.exit(1);
}

const token = loginResult.token;

// 2. List recent contact requests
const listResult = await page.evaluate(async (t) => {
  try {
    const r = await fetch("/api/admin/contact-requests?limit=20", {
      headers: { Authorization: `Bearer ${t}` },
    });
    return { status: r.status, body: await r.json() };
  } catch (e) {
    return { error: String(e) };
  }
}, token);

console.log("ADMIN LIST RESULT:");
console.log(JSON.stringify(listResult, null, 2));

// 3. Find our Puppeteer-submitted records
const contacts = listResult?.body?.data?.contacts || [];
const e2eRecords = contacts
  .filter((c) => c?.email?.includes("e2e_") || c?.email?.includes("verify_") || c?.email?.includes("db_verify_"))
  .slice(0, 10);

console.log(`\nTotal contacts in DB: ${listResult?.body?.data?.pagination?.total}`);
console.log(`\nE2E RECORDS FOUND (${e2eRecords.length}):`);
console.log(JSON.stringify(e2eRecords, null, 2));

await browser.close();
