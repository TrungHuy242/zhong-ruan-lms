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
      res.on("data", c => d += c);
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  // Login
  const login = await api("POST", "/api/auth/login",
    { email: "admin@zhongruan.com", password: "123456" });
  const token = login.body.data?.accessToken;
  console.log("Login:", login.status);

  // Debug: check teachers create response shape
  const tc = await api("POST", "/api/admin/teachers", {
    fullName: "[TEST] Teacher audit test",
    slug: `test-teacher-audit-${Date.now()}`,
    title: "GV test",
    bio: "Test bio",
    bioShort: "Test",
    isPublished: false,
  }, token);
  console.log("\n=== Teacher create response ===");
  console.log("Status:", tc.status);
  console.log("Body keys:", Object.keys(tc.body));
  console.log("Body:", JSON.stringify(tc.body).slice(0, 500));

  // Debug: check contact-request create response shape
  const cr = await api("POST", "/api/public/contact-requests", {
    fullName: "[TEST] Audit test contact",
    phone: "0900000000",
    email: `test-audit-${Date.now()}@test.com`,
    message: "Audit test message",
  }, null);
  console.log("\n=== Contact-request create response ===");
  console.log("Status:", cr.status);
  console.log("Body keys:", Object.keys(cr.body));
  console.log("Body:", JSON.stringify(cr.body).slice(0, 300));
})();
