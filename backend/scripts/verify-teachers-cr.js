const http = require("http");

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:5000${path}`);
    const opts = {
      hostname: url.hostname, port: url.port,
      path: url.pathname, method,
      headers: { "Content-Type": "application/json" },
    };
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;
    const req = http.request(opts, (res) => {
      let d = "";
      res.on("data", c => (d += c));
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function auditFor(moduleName, targetId, beforeList, actionPrefix) {
  const resp = await api("GET", "/api/admin/audit-logs?limit=80", null, global.token);
  const after = resp.body.data.filter(
    r => r.target === `${moduleName}:${targetId}` && r.action.startsWith(actionPrefix)
  );
  return { after, newCount: after.length - beforeList.length };
}

(async () => {
  // Login
  const login = await api("POST", "/api/auth/login",
    { email: "admin@zhongruan.com", password: "123456" });
  global.token = login.body.data?.accessToken;
  const token = global.token;

  // ===== TEACHERS =====
  console.log("\n=== TEACHERS ===");
  const tc = await api("POST", "/api/admin/teachers", {
    fullName: "[TEST] Teacher audit test",
    slug: `test-t-${Date.now()}`,
    title: "GV test",
    bio: "Bio",
    bioShort: "Bio short",
    isPublished: false,
  }, global.token);
  const teacherId = tc.body.data?.teacher?.id;
  console.log("Create teacher:", tc.status, teacherId);

  const beforeT = (await api("GET", "/api/admin/audit-logs?limit=80", null, global.token))
    .body.data.filter(r => r.target === `Teacher:${teacherId}` && r.action.startsWith("TEACHER_"));
  console.log("Audit before delete:", beforeT.length, "→", beforeT.map(r => r.action).join(", "));

  const delT = await api("DELETE", `/api/admin/teachers/${teacherId}`, null, global.token);
  console.log("Delete teacher:", delT.status, delT.body?.message || "ok");

  const { after: afterT, newCount: newT } = await auditFor("Teacher", teacherId, beforeT, "TEACHER_");
  console.log("Audit AFTER delete:", afterT.length, "record(s):", afterT.map(r => r.action).join(", "));
  console.log(`NEW: ${newT} | EXPECTED: 1 | ${newT === 1 ? "✅ PASS" : "❌ FAIL"}`);

  const rstT = await api("POST", `/api/admin/teachers/${teacherId}/restore`, null, global.token);
  console.log("Restore:", rstT.status);
  const { after: afterRstT, newCount: newRstT } = await auditFor("Teacher", teacherId, afterT, "TEACHER_");
  console.log(`Restore NEW: ${newRstT} | EXPECTED: 1 | ${newRstT === 1 ? "✅ PASS" : "❌ FAIL"}`);

  await api("DELETE", `/api/admin/teachers/${teacherId}/permanent`, null, global.token);
  console.log("Force-delete cleanup:", rstT.status);

  // ===== CONTACT REQUESTS =====
  console.log("\n=== CONTACT REQUESTS ===");
  const cr = await api("POST", "/api/public/contact-requests", {
    fullName: "[TEST] CR audit test",
    phone: "0900000000",
    email: `test-cr-${Date.now()}@test.com`,
    message: "Audit test",
  }, null);
  const crId = cr.body.data?.contact?.id;
  console.log("Create CR:", cr.status, crId);

  const beforeCR = (await api("GET", "/api/admin/audit-logs?limit=80", null, global.token))
    .body.data.filter(r => r.target === `ContactRequest:${crId}` && r.action.startsWith("CONTACT_REQUEST_"));
  console.log("Audit before delete:", beforeCR.length, "→", beforeCR.map(r => r.action).join(", "));

  // Admin token is REQUIRED for delete
  const delCR = await api("DELETE", `/api/admin/contact-requests/${crId}`, null, global.token);
  console.log("Delete CR:", delCR.status, delCR.body?.message || "ok");

  const { after: afterCR, newCount: newCR } = await auditFor("ContactRequest", crId, beforeCR, "CONTACT_REQUEST_");
  console.log("Audit AFTER delete:", afterCR.length, "record(s):", afterCR.map(r => r.action).join(", "));
  console.log(`NEW: ${newCR} | EXPECTED: 1 | ${newCR === 1 ? "✅ PASS" : "❌ FAIL"}`);

  const rstCR = await api("POST", `/api/admin/contact-requests/${crId}/restore`, null, global.token);
  console.log("Restore:", rstCR.status);
  const { after: afterRstCR, newCount: newRstCR } = await auditFor("ContactRequest", crId, afterCR, "CONTACT_REQUEST_");
  console.log(`Restore NEW: ${newRstCR} | EXPECTED: 1 | ${newRstCR === 1 ? "✅ PASS" : "❌ FAIL"}`);

  // ===== SUMMARY =====
  console.log("\n=== SUMMARY ===");
  console.log(`Teachers         soft-del: ${newT === 1 ? "✅" : "❌"} | restore: ${newRstT === 1 ? "✅" : "❌"}`);
  console.log(`ContactRequests  soft-del: ${newCR === 1 ? "✅" : "❌"} | restore: ${newRstCR === 1 ? "✅" : "❌"}`);
  const allPass = newT === 1 && newRstT === 1 && newCR === 1 && newRstCR === 1;
  console.log(allPass ? "\n✅ ALL PASS — no double-log in Teachers or ContactRequests" : "\n❌ FAIL");
})();
