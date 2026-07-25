// scripts/screenshot-teachers.cjs
// Take screenshots of redesigned TeachersListPage + TeacherDetailPage.
import puppeteer from "puppeteer";
import fs from "node:fs/promises";
import path from "node:path";

const PREVIEW_PORT = 4173;
const SERVER_URL = `http://localhost:${PREVIEW_PORT}`;
const OUT = "frontend/screenshots/teachers-redesign";

const ROUTES = [
  { name: "list-desktop", url: "/giang-vien", width: 1280, height: 900 },
  { name: "list-tablet", url: "/giang-vien", width: 768, height: 900 },
  { name: "list-mobile", url: "/giang-vien", width: 375, height: 900 },
  { name: "detail-desktop", url: "/giang-vien/truong-minh-trung-huy", width: 1280, height: 900 },
  { name: "detail-mobile", url: "/giang-vien/truong-minh-trung-huy", width: 375, height: 900 },
  { name: "detail-404", url: "/giang-vien/khong-ton-tai", width: 1280, height: 900 },
];

await fs.mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

for (const r of ROUTES) {
  await page.setViewport({ width: r.width, height: r.height });
  const url = `${SERVER_URL}${r.url}`;
  console.log(`[shot] ${url} @ ${r.width}x${r.height}`);
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((res) => setTimeout(res, 500));
  const file = path.join(OUT, `${r.name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  -> ${file}`);
}

await browser.close();
console.log("DONE");
