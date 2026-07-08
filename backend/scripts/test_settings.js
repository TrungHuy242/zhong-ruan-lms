/**
 * Test thủ công 5 API của module Settings.
 *
 * Yêu cầu:
 *  - Server đang chạy (npm run dev)
 *  - DB đã seed (3 user: admin@, teacher@, student@zhongruan.com / mk: 123456)
 *
 * Chạy: node scripts/test_settings.js
 *
 * Tất cả 5 endpoint đều yêu cầu quyền ADMIN.
 */

const BASE = process.env.BASE_URL || "http://localhost:5000/api";

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
  console.log(`\n=== TEST SETTINGS @ ${BASE} ===\n`);

  // ---- Health check trước ----
  try {
    const hc = await http("GET", "/health");
    if (hc.status !== 200) throw new Error("health không trả 200");
    console.log("  ✅ Server đang chạy (health OK)\n");
  } catch (e) {
    console.error(`  ❌ Không kết nối được ${BASE}`);
    console.error("     → Hãy chạy 'npm run dev' ở terminal khác trước.");
    console.error("     → Hoặc set BASE_URL nếu server chạy port khác:");
    console.error("        $env:BASE_URL='http://localhost:5000/api' ; node scripts/test_settings.js");
    process.exit(2);
  }

  // ---- 0. Login 3 user ----
  const adminToken = await login("admin@zhongruan.com", "123456");
  const studentToken = await login("student@zhongruan.com", "123456");
  const teacherToken = await login("teacher@zhongruan.com", "123456");
  ok("Login admin/student/teacher");

  // ---- 1. Phân quyền: không phải Admin → 403 ----
  console.log("\n[1] Phân quyền: student/teacher truy cập /api/settings → 403");
  const s1 = await http("GET", "/settings", { token: studentToken });
  assertEq(s1.status, 403, "  GET /settings với student → 403");

  const s2 = await http("GET", "/settings", { token: teacherToken });
  assertEq(s2.status, 403, "  GET /settings với teacher → 403");

  // Chưa login → 401
  const s3 = await http("GET", "/settings");
  assertEq(s3.status, 401, "  GET /settings không có token → 401");

  // ---- 2. POST /settings (Admin) → 201 ----
  console.log("\n[2] POST /settings (Admin) — tạo mới");
  const unique = Date.now();
  const k1 = `site_name_${unique}`;
  const c1 = await http("POST", "/settings", {
    token: adminToken,
    body: { key: k1, value: "Zhong Ruan LMS", description: "Tên trang" },
  });
  assertEq(c1.status, 201, "  status 201");
  const id1 = c1.data.data && c1.data.data.setting && c1.data.data.setting.id;
  if (id1) ok(`  tạo được setting id=${id1}, key=${k1}`);
  else bad("  không lấy được id");

  // ---- 3. POST trùng key → 409 CONFLICT ----
  console.log("\n[3] POST trùng key → 409");
  const c2 = await http("POST", "/settings", {
    token: adminToken,
    body: { key: k1, value: "Trùng" },
  });
  assertEq(c2.status, 409, "  status 409");

  // ---- 4. Validate: key sai format → 400 ----
  console.log("\n[4] Validate: key sai format");
  const v1 = await http("POST", "/settings", {
    token: adminToken,
    body: { key: "Sai format HOA", value: "x" },
  });
  assertEq(v1.status, 400, "  key có chữ HOA → 400");

  const v2 = await http("POST", "/settings", {
    token: adminToken,
    body: { key: "", value: "x" },
  });
  assertEq(v2.status, 400, "  key rỗng → 400");

  const v3 = await http("POST", "/settings", {
    token: adminToken,
    body: { key: "ok_key" },
  });
  assertEq(v3.status, 400, "  thiếu value → 400");

  // ---- 5. GET /settings/:key → 200 ----
  console.log("\n[5] GET /settings/:key");
  const g1 = await http("GET", `/settings/${k1}`, { token: adminToken });
  assertEq(g1.status, 200, "  status 200");
  const gotValue = g1.data.data && g1.data.data.setting && g1.data.data.setting.value;
  if (gotValue === "Zhong Ruan LMS") ok(`  value đúng: "${gotValue}"`);
  else bad(`  value sai: "${gotValue}"`);

  // ---- 6. GET /settings/:key không tồn tại → 404 ----
  console.log("\n[6] GET /settings/:key không tồn tại → 404");
  const g2 = await http("GET", "/settings/key_khong_co_that_999", { token: adminToken });
  assertEq(g2.status, 404, "  status 404");

  // ---- 7. GET /settings (list) → 200, có setting vừa tạo ----
  console.log("\n[7] GET /settings (list)");
  const g3 = await http("GET", "/settings", { token: adminToken });
  assertEq(g3.status, 200, "  status 200");
  const items = g3.data.data || [];
  const total = g3.data.total;
  ok(`  nhận ${items.length} setting (total=${total})`);
  const found = items.find((s) => s.key === k1);
  if (found) ok(`  list có chứa key="${k1}"`);
  else bad(`  list KHÔNG có key="${k1}"`);

  // ---- 8. PUT /settings/:key (cập nhật) → 200 ----
  console.log("\n[8] PUT /settings/:key — cập nhật value");
  const u1 = await http("PUT", `/settings/${k1}`, {
    token: adminToken,
    body: { value: "Zhong Ruan LMS v2" },
  });
  assertEq(u1.status, 200, "  status 200");
  const updatedValue = u1.data.data && u1.data.data.setting && u1.data.data.setting.value;
  if (updatedValue === "Zhong Ruan LMS v2") ok(`  value đã cập nhật: "${updatedValue}"`);
  else bad(`  value sai: "${updatedValue}"`);

  // PUT cập nhật cả description
  const u2 = await http("PUT", `/settings/${k1}`, {
    token: adminToken,
    body: { value: "Zhong Ruan LMS v3", description: "Tên trang (đã cập nhật)" },
  });
  assertEq(u2.status, 200, "  status 200 (cập nhật cả description)");

  // ---- 9. PUT key không tồn tại → 404 ----
  console.log("\n[9] PUT /settings/:key không tồn tại → 404");
  const u3 = await http("PUT", "/settings/key_khong_co_999", {
    token: adminToken,
    body: { value: "x" },
  });
  assertEq(u3.status, 404, "  status 404");

  // ---- 10. PUT mà body rỗng → 200, trả về bản ghi không đổi ----
  console.log("\n[10] PUT body rỗng → 200 (idempotent)");
  const u4 = await http("PUT", `/settings/${k1}`, {
    token: adminToken,
    body: {},
  });
  assertEq(u4.status, 200, "  status 200");

  // ---- 11. DELETE /settings/:key → 200 ----
  console.log("\n[11] DELETE /settings/:key");
  const d1 = await http("DELETE", `/settings/${k1}`, { token: adminToken });
  assertEq(d1.status, 200, "  status 200");

  // Sau khi xoá GET lại → 404
  const d2 = await http("GET", `/settings/${k1}`, { token: adminToken });
  assertEq(d2.status, 404, "  GET sau khi xoá → 404");

  // ---- 12. DELETE không tồn tại → 404 ----
  console.log("\n[12] DELETE /settings/:key không tồn tại → 404");
  const d3 = await http("DELETE", "/settings/key_khong_co_999", { token: adminToken });
  assertEq(d3.status, 404, "  status 404");

  // ---- Tổng kết ----
  console.log(`\n=== KẾT QUẢ: ${passed} passed / ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("Lỗi test:", e);
  process.exit(1);
});
