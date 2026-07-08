/**
 * Test thủ công API Module 05 — Global Search.
 *
 * Yêu cầu:
 *  - Server đang chạy (npm run dev)
 *  - DB đã seed (3 user: admin@, teacher@, student@zhongruan.com / mk: 123456)
 *  - Có sẵn ít nhất 1 file đã upload (để test search files)
 *
 * Chạy: node scripts/test_search.js
 */

const BASE = process.env.BASE_URL || "http://localhost:5000/api";

let passed = 0;
let failed = 0;

function ok(name) { passed++; console.log(`  ✅ ${name}`); }
function bad(name, detail) { failed++; console.log(`  ❌ ${name}`); if (detail) console.log("     ", detail); }

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
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function login(email, password) {
  const r = await http("POST", "/auth/login", { body: { email, password } });
  if (r.status !== 200) throw new Error(`Login ${email} fail: ${r.status}`);
  return r.data.data.accessToken;
}

function assertEq(actual, expected, label) {
  if (actual === expected) ok(`${label} (${actual})`);
  else bad(`${label} expected ${expected} got ${actual}`);
}

(async () => {
  console.log(`\n=== TEST SEARCH @ ${BASE} ===\n`);

  // Health check trước
  try {
    const hc = await http("GET", "/health");
    if (hc.status !== 200) throw new Error("health không trả 200");
    console.log("  ✅ Server đang chạy (health OK)\n");
  } catch (e) {
    console.error(`  ❌ Không kết nối được ${BASE}`);
    console.error("     → Hãy chạy 'npm run dev' ở terminal khác trước.");
    process.exit(2);
  }

  // ---- 0. Login ----
  const adminToken   = await login("admin@zhongruan.com",   "123456");
  const studentToken = await login("student@zhongruan.com", "123456");
  const teacherToken = await login("teacher@zhongruan.com", "123456");
  ok("Login admin/student/teacher");

  // Lấy id để dùng
  const meStudent = await http("GET", "/auth/me", { token: studentToken });
  const studentId = meStudent.data.data.user.id;

  // ---- 0.5. Tạo 1 notification có keyword đặc biệt để search cho chắc ----
  const kw = "kwTestXYZ" + Date.now();
  const created = await http("POST", "/notifications", {
    token: adminToken,
    body: { userId: studentId, type: "INFO", title: kw, message: `Mô tả ${kw} cho test search` },
  });
  if (created.status === 201) ok(`  tạo notification có keyword '${kw}'`);
  else bad(`  không tạo được notification: ${created.status}`);

  // ---- 1. Không có token → 401 ----
  console.log("\n[1] GET /search không có token → 401");
  const t1 = await http("GET", `/search?keyword=test`);
  assertEq(t1.status, 401, "  status 401");

  // ---- 2. Thiếu keyword → 400 ----
  console.log("\n[2] GET /search thiếu keyword → 400");
  const t2 = await http("GET", "/search", { token: studentToken });
  assertEq(t2.status, 400, "  status 400");

  // ---- 3. type không hợp lệ → 400 ----
  console.log("\n[3] GET /search type=banana → 400");
  const t3 = await http("GET", "/search?keyword=test&type=banana", { token: studentToken });
  assertEq(t3.status, 400, "  status 400");

  // ---- 4. page không hợp lệ → 400 ----
  console.log("\n[4] GET /search page=0 → 400");
  const t4 = await http("GET", "/search?keyword=test&page=0", { token: studentToken });
  assertEq(t4.status, 400, "  status 400");

  // ---- 5. limit quá lớn → 400 ----
  console.log("\n[5] GET /search limit=999 → 400");
  const t5 = await http("GET", "/search?keyword=test&limit=999", { token: studentToken });
  assertEq(t5.status, 400, "  status 400");

  // ---- 6. type=all (Student) — tìm thấy notification của mình ----
  console.log("\n[6] GET /search?keyword=<kw>&type=all (Student)");
  const t6 = await http("GET", `/search?keyword=${encodeURIComponent(kw)}&type=all`, { token: studentToken });
  assertEq(t6.status, 200, "  status 200");
  if (t6.data && t6.data.data) {
    const notis = t6.data.data.notifications || {};
    if ((notis.total || 0) >= 1) ok(`  notifications.total = ${notis.total}`);
    else bad(`  notifications.total = ${notis.total} (mong >= 1)`);
    // Student KHÔNG được tìm thấy user (chỉ Admin)
    const users = t6.data.data.users || {};
    if ((users.total || 0) === 0) ok(`  users.total = 0 (Student không search được user)`);
    else bad(`  users.total = ${users.total} (Student không được search user)`);
  } else bad("  response thiếu data");

  // ---- 7. type=all (Admin) — Admin search được user ----
  console.log("\n[7] GET /search?keyword=admin&type=users (Admin)");
  const t7 = await http("GET", "/search?keyword=admin&type=users", { token: adminToken });
  assertEq(t7.status, 200, "  status 200");
  const usersA = t7.data.data && t7.data.data.users;
  if (usersA && usersA.items && usersA.items.length > 0) ok(`  Admin tìm thấy ${usersA.items.length} user`);
  else bad(`  Admin không tìm thấy user: ${JSON.stringify(usersA)}`);

  // ---- 8. type=notifications (Student) — tìm thấy của mình ----
  console.log("\n[8] GET /search?keyword=<kw>&type=notifications (Student)");
  const t8 = await http("GET", `/search?keyword=${encodeURIComponent(kw)}&type=notifications`, { token: studentToken });
  assertEq(t8.status, 200, "  status 200");
  const noti = t8.data.data && t8.data.data.notifications;
  if (noti && noti.items && noti.items.length >= 1) {
    ok(`  Student tìm thấy ${noti.items.length} noti của mình`);
    if (noti.items[0].title === kw) ok("  khớp title");
    else bad(`  title không khớp: ${noti.items[0].title}`);
  } else bad(`  không tìm thấy noti: ${JSON.stringify(noti)}`);

  // ---- 9. Student search user → users.total = 0 (không leak) ----
  console.log("\n[9] GET /search?keyword=admin&type=users (Student) → users.total = 0");
  const t9 = await http("GET", "/search?keyword=admin&type=users", { token: studentToken });
  assertEq(t9.status, 200, "  status 200");
  const usersS = t9.data.data && t9.data.data.users;
  if (usersS && (usersS.total || 0) === 0 && (!usersS.items || usersS.items.length === 0)) {
    ok("  Student thấy users rỗng (không leak)");
  } else bad(`  Student bị leak user: ${JSON.stringify(usersS)}`);

  // ---- 10. Không phân biệt hoa/thường ----
  console.log("\n[10] Tìm với keyword viết thường, dữ liệu viết hoa");
  const kwLower = kw.toLowerCase();
  const t10 = await http("GET", `/search?keyword=${encodeURIComponent(kwLower)}&type=notifications`, { token: studentToken });
  const n10 = t10.data.data && t10.data.data.notifications;
  if (n10 && n10.items && n10.items.length >= 1) ok("  tìm thấy (case-insensitive)");
  else bad(`  không tìm thấy: ${JSON.stringify(n10)}`);

  // ---- 11. Phân trang: limit=1 ----
  console.log("\n[11] Phân trang: limit=1");
  // Tạo thêm 1 noti nữa
  await http("POST", "/notifications", {
    token: adminToken,
    body: { userId: studentId, type: "INFO", title: kw, message: `noti thứ 2 cho ${kw}` },
  });
  const t11a = await http("GET", `/search?keyword=${encodeURIComponent(kw)}&type=notifications&limit=1&page=1`, { token: studentToken });
  const n11a = t11a.data.data && t11a.data.data.notifications;
  if (n11a && n11a.items && n11a.items.length === 1 && n11a.total >= 2) {
    ok(`  page=1: items=${n11a.items.length}, total=${n11a.total}`);
  } else bad(`  page=1 sai: ${JSON.stringify(n11a)}`);

  const t11b = await http("GET", `/search?keyword=${encodeURIComponent(kw)}&type=notifications&limit=1&page=2`, { token: studentToken });
  const n11b = t11b.data.data && t11b.data.data.notifications;
  if (n11b && n11b.items && n11b.items.length === 1) ok("  page=2: items=1");
  else bad(`  page=2 sai: ${JSON.stringify(n11b)}`);

  // ---- 12. type=files (Student) — không lỗi dù không có file khớp ----
  console.log("\n[12] GET /search?keyword=xyzxyz&type=files (Student)");
  const t12 = await http("GET", "/search?keyword=xyzxyznomatch&type=files", { token: studentToken });
  assertEq(t12.status, 200, "  status 200");
  const f12 = t12.data.data && t12.data.data.files;
  if (f12 && Array.isArray(f12.items) && f12.total >= 0) ok(`  files trả về cấu trúc đúng (total=${f12.total})`);
  else bad(`  files sai cấu trúc: ${JSON.stringify(f12)}`);

  // ---- 13. type=files (Admin) — nếu có file sẽ trả về ----
  console.log("\n[13] GET /search?keyword=&type=files (Admin, keyword trống) → 400");
  const t13 = await http("GET", "/search?type=files", { token: adminToken });
  assertEq(t13.status, 400, "  status 400 (keyword trống)");

  // ---- 14. Verify response chỉ chứa field an toàn (không có passwordHash) ----
  console.log("\n[14] Response user KHÔNG chứa passwordHash");
  const t14 = await http("GET", "/search?keyword=admin&type=users", { token: adminToken });
  const u14 = t14.data.data && t14.data.data.users && t14.data.data.users.items && t14.data.data.users.items[0];
  if (u14 && !("passwordHash" in u14) && !("refreshToken" in u14)) ok("  không có field nhạy cảm");
  else bad(`  leak field nhạy cảm: ${JSON.stringify(u14)}`);

  // ---- 15. Keyword quá dài ----
  console.log("\n[15] keyword > 200 ký tự → 400");
  const t15 = await http("GET", `/search?keyword=${"a".repeat(201)}`, { token: studentToken });
  assertEq(t15.status, 400, "  status 400");

  // ---- 16. Cleanup: xoá notification test ----
  console.log("\n[16] Cleanup");
  // Tìm id của các noti có keyword để xoá
  const clean = await http("GET", `/search?keyword=${encodeURIComponent(kw)}&type=notifications&limit=100`, { token: adminToken });
  const ids = (clean.data.data && clean.data.data.notifications && clean.data.data.notifications.items || []).map(n => n.id);
  let deleted = 0;
  for (const id of ids) {
    const d = await http("DELETE", `/notifications/${id}`, { token: adminToken });
    if (d.status === 200) deleted++;
  }
  ok(`  đã xoá ${deleted}/${ids.length} noti test`);

  // ---- Tổng kết ----
  console.log(`\n=== KẾT QUẢ: ${passed} passed / ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("Lỗi test:", e);
  process.exit(1);
});
