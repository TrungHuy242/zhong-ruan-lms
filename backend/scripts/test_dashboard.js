/**
 * Test tự động cho GET /api/dashboard/overview
 *
 * Yêu cầu:
 *  - Server đang chạy (npm run dev) ở port 5000
 *  - DB đã seed 3 user (admin@, teacher@, student@zhongruan.com / 123456)
 *
 * Chạy: node scripts/test_dashboard.js
 *
 * Test 4 ca:
 *   1) Không có token                 -> 401
 *   2) Role STUDENT/TEACHER           -> 403
 *   3) Role ADMIN                    -> 200 + đúng cấu trúc
 *   4) So sánh dữ liệu với Prisma    -> tổng khớp DB
 */

const BASE = process.env.BASE_URL || "http://localhost:5000/api";

// Tải .env để Prisma lấy được DATABASE_URL khi script chạy độc lập.
require("dotenv").config();

let passed = 0;
let failed = 0;

function ok(name) {
  passed++;
  console.log(`  ✅ ${name}`);
}
function bad(name, detail) {
  failed++;
  console.log(`  ❌ ${name}`);
  if (detail) console.log("     ", detail);
}

async function http(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function login(email, password) {
  const r = await http("POST", "/auth/login", { body: { email, password } });
  if (r.status !== 200) {
    throw new Error(`Login ${email} fail: ${r.status} — ${JSON.stringify(r.data)}`);
  }
  return r.data.data.accessToken;
}

function assertEq(actual, expected, label) {
  if (actual === expected) ok(`${label} (${actual})`);
  else bad(`${label} expected ${expected} got ${actual}`);
}

(async () => {
  console.log(`\n=== TEST DASHBOARD @ ${BASE} ===\n`);

  // ---- Health check trước ----
  try {
    const hc = await http("GET", "/health");
    if (hc.status !== 200) throw new Error("health không trả 200");
    console.log("  ✅ Server đang chạy (health OK)\n");
  } catch (e) {
    console.error(`  ❌ Không kết nối được ${BASE}`);
    console.error("     → Hãy chạy 'npm run dev' ở terminal khác trước.");
    process.exit(2);
  }

  // ---- 0. Login 3 user ----
  const adminToken = await login("admin@zhongruan.com", "123456");
  const studentToken = await login("student@zhongruan.com", "123456");
  const teacherToken = await login("teacher@zhongruan.com", "123456");
  ok("Login admin/student/teacher");

  // ---- 1. Phân quyền ----
  console.log("\n[1] Phân quyền");

  const t1 = await http("GET", "/dashboard/overview");
  assertEq(t1.status, 401, "không có token → 401");

  const t2 = await http("GET", "/dashboard/overview", { token: studentToken });
  assertEq(t2.status, 403, "student → 403");

  const t3 = await http("GET", "/dashboard/overview", { token: teacherToken });
  assertEq(t3.status, 403, "teacher → 403");

  // ---- 2. Admin: status + message + generatedAt ----
  console.log("\n[2] Admin: status + shape");
  const r = await http("GET", "/dashboard/overview", { token: adminToken });
  assertEq(r.status, 200, "admin → 200");

  if (r.data && r.data.message === "Lấy thống kê dashboard thành công") {
    ok("message đúng");
  } else {
    bad("message đúng", `got: ${r.data && r.data.message}`);
  }

  if (
    r.data &&
    typeof r.data.generatedAt === "string" &&
    !isNaN(Date.parse(r.data.generatedAt))
  ) {
    ok("generatedAt là ISO 8601");
  } else {
    bad("generatedAt là ISO 8601", `got: ${r.data && r.data.generatedAt}`);
  }

  // ---- 3. Cấu trúc data ----
  console.log("\n[3] Cấu trúc data");
  const d = (r.data && r.data.data) || {};
  const blocks = ["users", "notifications", "files", "auditLogs"];
  for (const b of blocks) {
    if (d[b] && typeof d[b].total === "number") {
      ok(`data.${b}.total là number (${d[b].total})`);
    } else {
      bad(`data.${b}.total là number`, `got: ${JSON.stringify(d[b])}`);
    }
  }

  // ---- 4. users.byRole ----
  console.log("\n[4] users.byRole");
  const br = d.users && d.users.byRole;
  if (
    br &&
    typeof br.STUDENT === "number" &&
    typeof br.TEACHER === "number" &&
    typeof br.ADMIN === "number"
  ) {
    ok("byRole có STUDENT/TEACHER/ADMIN đều là number");
  } else {
    bad("byRole có 3 role đều là number", `got: ${JSON.stringify(br)}`);
  }

  const sumRoles = br ? br.STUDENT + br.TEACHER + br.ADMIN : -1;
  if (d.users && sumRoles === d.users.total) {
    ok(`users.total = STUDENT + TEACHER + ADMIN (${d.users.total})`);
  } else {
    bad(
      "users.total = STUDENT + TEACHER + ADMIN",
      `total=${d.users && d.users.total}, sum=${sumRoles}`
    );
  }

  // ---- 5. So sánh với DB ----
  console.log("\n[5] So sánh với DB (Prisma)");
  try {
    const prisma = require("../src/config/database");
    const [dbUsers, dbNotif, dbFiles, dbAudit] = await Promise.all([
      prisma.user.count(),
      prisma.notification.count(),
      prisma.uploadFile.count(),
      prisma.auditLog.count(),
    ]);

    assertEq(d.users.total, dbUsers, "users.total khớp DB");
    assertEq(d.notifications.total, dbNotif, "notifications.total khớp DB");
    assertEq(d.files.total, dbFiles, "files.total khớp DB");
    assertEq(d.auditLogs.total, dbAudit, "auditLogs.total khớp DB");

    await prisma.$disconnect();
  } catch (e) {
    bad("so sánh DB", e.message);
  }

  // ---- Tổng kết ----
  console.log(`\n=== KẾT QUẢ: ${passed} passed / ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("Lỗi test:", e);
  process.exit(1);
});
