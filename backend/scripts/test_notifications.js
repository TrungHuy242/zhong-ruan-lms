/**
 * Test thủ công 6 API của module Notification.
 *
 * Yêu cầu:
 *  - Server đang chạy (npm run dev)
 *  - DB đã seed (3 user: admin@, teacher@, student@zhongruan.com / mk: 123456)
 *
 * Chạy: node scripts/test_notifications.js
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
    console.log(`\n=== TEST NOTIFICATIONS @ ${BASE} ===\n`);
    // Health check trước — nếu server chưa chạy sẽ dừng ngay với thông báo rõ ràng
    try {
      const hc = await http("GET", "/health");
      if (hc.status !== 200) throw new Error("health không trả 200");
      console.log("  ✅ Server đang chạy (health OK)\n");
    } catch (e) {
      console.error(`  ❌ Không kết nối được ${BASE}`);
      console.error("     → Hãy chạy 'npm run dev' ở terminal khác trước.");
      console.error("     → Hoặc set BASE_URL nếu server chạy port khác:");
      console.error("        $env:BASE_URL='http://localhost:5000/api' ; node scripts/test_notifications.js");
      process.exit(2);
    }

  // ---- 0. Login 3 user ----
  const adminToken   = await login("admin@zhongruan.com",   "123456");
  const studentToken = await login("student@zhongruan.com", "123456");
  const teacherToken = await login("teacher@zhongruan.com", "123456");
  ok("Login admin/student/teacher");

  // Lấy id user student để test create
  const meStudent = await http("GET", "/auth/me", { token: studentToken });
  const studentId = meStudent.data.data.user.id;

  // ---- 1. POST /notifications (Admin) ----
  console.log("\n[1] POST /notifications (Admin)");
  const c1 = await http("POST", "/notifications", {
    token: adminToken,
    body: {
      userId: studentId,
      type: "INFO",
      title: "Chào mừng",
      message: "Bạn đã đăng ký khóa học thành công",
    },
  });
  assertEq(c1.status, 201, "  status 201");
  const notiId1 = c1.data.data && c1.data.data.notification && c1.data.data.notification.id;
  if (notiId1) ok(`  tạo được noti id=${notiId1}`); else bad("  không lấy được id");

  const c2 = await http("POST", "/notifications", {
    token: adminToken,
    body: { userId: studentId, type: "WARNING", title: "Cảnh báo", message: "Sắp hết hạn" },
  });
  const notiId2 = c2.data.data.notification.id;
  ok(`  tạo noti thứ 2 id=${notiId2}`);

  const c3 = await http("POST", "/notifications", {
    token: adminToken,
    body: { userId: studentId, type: "ERROR", title: "Lỗi", message: "Thanh toán thất bại" },
  });
  const notiId3 = c3.data.data.notification.id;
  ok(`  tạo noti thứ 3 id=${notiId3}`);

  // ---- 2. POST không phải Admin ----
  console.log("\n[2] POST /notifications (không phải Admin) → 403");
  const c4 = await http("POST", "/notifications", {
    token: studentToken,
    body: { userId: studentId, type: "INFO", title: "x", message: "y" },
  });
  assertEq(c4.status, 403, "  status 403");

  // ---- 3. GET /notifications ----
  console.log("\n[3] GET /notifications");
  const g1 = await http("GET", "/notifications", { token: studentToken });
  assertEq(g1.status, 200, "  status 200");
  const items = g1.data.data || [];
  ok(`  nhận ${items.length} noti (mong đợi >= 3)`);
  const total3 = g1.data.pagination && g1.data.pagination.total;
  if (total3 >= 3) ok(`  pagination.total = ${total3}`); else bad(`  pagination.total = ${total3}`);

  // ---- 4. GET /:id (của mình) ----
  console.log("\n[4] GET /notifications/:id (của mình)");
  const g2 = await http("GET", `/notifications/${notiId1}`, { token: studentToken });
  assertEq(g2.status, 200, "  status 200");

  // ---- 5. GET /:id (của người khác → 404) ----
  console.log("\n[5] GET /notifications/:id (không phải của mình) → 404");
  const g3 = await http("GET", `/notifications/${notiId1}`, { token: teacherToken });
  assertEq(g3.status, 404, "  status 404");

  // ---- 6. PUT /:id/read ----
  console.log("\n[6] PUT /notifications/:id/read");
  const p1 = await http("PUT", `/notifications/${notiId1}/read`, { token: studentToken });
  assertEq(p1.status, 200, "  status 200");
  const isRead = p1.data.data && p1.data.data.notification && p1.data.data.notification.isRead;
  if (isRead === true) ok("  isRead = true"); else bad(`  isRead = ${isRead}`);

  // PUT /:id/read của người khác → 404
  const p1b = await http("PUT", `/notifications/${notiId2}/read`, { token: teacherToken });
  assertEq(p1b.status, 404, "  PUT noti của người khác → 404");

  // ---- 7. PUT /read-all ----
  console.log("\n[7] PUT /notifications/read-all");
  const p2 = await http("PUT", `/notifications/read-all`, { token: studentToken });
  assertEq(p2.status, 200, "  status 200");
  const updated = p2.data.data && p2.data.data.updated;
  if (typeof updated === "number" && updated >= 1) ok(`  updated = ${updated}`); else bad(`  updated = ${updated}`);

  // verify sau khi read-all
  const g4 = await http("GET", "/notifications?isRead=false", { token: studentToken });
  const unread = g4.data.data || [];
  if (unread.length === 0) ok("  không còn noti chưa đọc"); else bad(`  còn ${unread.length} chưa đọc`);

  // ---- 8. Validate ----
  console.log("\n[8] Validate đầu vào");
  const v1 = await http("POST", "/notifications", {
    token: adminToken,
    body: { userId: studentId, type: "WRONG_TYPE", title: "x", message: "y" },
  });
  assertEq(v1.status, 400, "  type sai → 400");

  const v2 = await http("POST", "/notifications", {
    token: adminToken,
    body: { userId: studentId, type: "INFO", title: "", message: "y" },
  });
  assertEq(v2.status, 400, "  title rỗng → 400");

  const v3 = await http("POST", "/notifications", {
    token: adminToken,
    body: { userId: 999999, type: "INFO", title: "x", message: "y" },
  });
  assertEq(v3.status, 400, "  userId không tồn tại → 400");

  // ---- 9. DELETE /:id ----
  console.log("\n[9] DELETE /notifications/:id");
  // student xoá noti của mình
  const d1 = await http("DELETE", `/notifications/${notiId3}`, { token: studentToken });
  assertEq(d1.status, 200, "  status 200");

  // noti đã xoá → GET lại phải 404
  const d2 = await http("GET", `/notifications/${notiId3}`, { token: studentToken });
  assertEq(d2.status, 404, "  noti đã xoá → GET 404");

  // student xoá noti của người khác → 403
  const d3 = await http("DELETE", `/notifications/${notiId2}`, { token: teacherToken });
  assertEq(d3.status, 403, "  xoá noti của người khác → 403");

  // admin xoá noti bất kỳ → 200
  const d4 = await http("DELETE", `/notifications/${notiId2}`, { token: adminToken });
  assertEq(d4.status, 200, "  admin xoá noti của user khác → 200");

  // ---- Tổng kết ----
  console.log(`\n=== KẾT QUẢ: ${passed} passed / ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("Lỗi test:", e);
  process.exit(1);
});