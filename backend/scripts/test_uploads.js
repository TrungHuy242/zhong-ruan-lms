/**
 * Test tự động module Upload — 9 case.
 *
 * Yêu cầu:
 *  - Server đang chạy (npm run dev) trên port 5000
 *  - DB đã seed (admin@zhongruan.com / 123456, student@zhongruan.com / 123456, teacher@zhongruan.com / 123456)
 *  - Module form-data có thể bị thiếu → tự install nếu chưa có
 *
 * Chạy: node scripts/test_uploads.js
 */

const BASE = process.env.BASE_URL || "http://localhost:5000/api";
const fs = require("fs");
const path = require("path");

// Tự import form-data nếu thiếu
let FormData, Blob;
try {
  // Ưu tiên FormData có sẵn của Node 18+ (browser-compatible)
  FormData = globalThis.FormData;
  Blob = globalThis.Blob;
  if (!FormData) throw new Error("no global FormData");
  console.log("  ℹ️  Dùng built-in FormData (Node 18+)");
} catch (e) {
  console.error("❌ Node < 18, cần FormData global. Cài form-data...");
  require("form-data");
  FormData = require("form-data");
}

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
function assertEq(actual, expected, label) {
  if (actual === expected) ok(`${label} (${actual})`);
  else bad(`${label} expected ${expected} got ${actual}`);
}

async function httpJson(method, path, { token, body } = {}) {
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

// Upload dùng form-data (multipart/form-data) — multipart thủ công để tương thích multer 2.x
async function httpUpload(path, { token, fieldName, filePath, fileName, mimeType }) {
  const http = require("http");
  const fileBuffer = fs.readFileSync(filePath);
  const boundary = "----TestBoundary" + Date.now();
  const parts = [];
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  ));
  parts.push(fileBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  const body = Buffer.concat(parts);

  const url = new URL(BASE + path);
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function login(email, password) {
  const r = await httpJson("POST", "/auth/login", { body: { email, password } });
  if (r.status !== 200) throw new Error(`Login ${email} fail: ${r.status} - ${JSON.stringify(r.data)}`);
  return r.data.data.accessToken;
}

// Tạo file test JPG hợp lệ (header JPEG + ~1KB nội dung random)
function makeJpgFile(filePath) {
  const header = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
  const tail = Buffer.from([0xFF, 0xD9]);
  const filler = Buffer.alloc(1024);
  require("crypto").randomFillSync(filler);
  fs.writeFileSync(filePath, Buffer.concat([header, filler, tail]));
}

// Tạo file PDF hợp lệ (header %PDF- + tail %%EOF)
function makePdfFile(filePath) {
  const header = Buffer.from("%PDF-1.4\n%fake pdf for test\n");
  const filler = Buffer.alloc(2048);
  require("crypto").randomFillSync(filler);
  const tail = Buffer.from("\n%%EOF");
  fs.writeFileSync(filePath, Buffer.concat([header, filler, tail]));
}

// Tạo file EXE (header "MZ" — đuôi .exe)
function makeExeFile(filePath) {
  const header = Buffer.from("MZ");
  const filler = Buffer.alloc(512);
  require("crypto").randomFillSync(filler);
  fs.writeFileSync(filePath, Buffer.concat([header, filler]));
}

// Tạo file BIN > 10MB để test quá giới hạn
function makeBigFile(filePath, sizeMB) {
  const size = sizeMB * 1024 * 1024;
  const buf = Buffer.alloc(size, 0); // 11MB toàn zero
  fs.writeFileSync(filePath, buf);
}

(async () => {
  console.log(`\n=== TEST UPLOADS @ ${BASE} ===\n`);

  // Health check
  try {
    const hc = await httpJson("GET", "/health");
    if (hc.status !== 200) throw new Error("health không trả 200");
    console.log("  ✅ Server đang chạy (health OK)\n");
  } catch (e) {
    console.error(`  ❌ Không kết nối được ${BASE}`);
    console.error("     → Hãy chạy 'npm run dev' ở terminal khác trước.");
    process.exit(2);
  }

  // ---- 0. Login + chuẩn bị file ----
  const adminToken   = await login("admin@zhongruan.com",   "123456");
  const studentToken = await login("student@zhongruan.com", "123456");
  const teacherToken = await login("teacher@zhongruan.com", "123456");
  ok("Login admin/student/teacher");

  const tmpDir = path.join(__dirname, "..", "tmp_test_uploads");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const jpgPath   = path.join(tmpDir, "test.jpg");
  const pdfPath   = path.join(tmpDir, "test.pdf");
  const exePath   = path.join(tmpDir, "test.exe");
  const bigPath   = path.join(tmpDir, "big.bin");

  makeJpgFile(jpgPath);
  makePdfFile(pdfPath);
  makeExeFile(exePath);
  makeBigFile(bigPath, 11); // 11MB
  ok("Đã tạo 4 file test (jpg/pdf/exe/11MB)");

  // ---- 1. Upload .jpg thành công (Student) ----
  console.log("\n[1] POST /upload (.jpg) — Student");
  const u1 = await httpUpload("/upload", {
    token: studentToken,
    fieldName: "file",
    filePath: jpgPath,
    fileName: "test.jpg",
    mimeType: "image/jpeg",
  });
  assertEq(u1.status, 201, "  status 201");
  const file1 = u1.data.data && u1.data.data.file;
  const file1Id = file1 && file1.id;
  if (file1Id) ok(`  upload thành công id=${file1Id}, storedName=${file1.storedName}`);
  else bad("  không lấy được file.id", JSON.stringify(u1.data));

  // Kiểm tra file vật lý tồn tại
  const uploadsDir = path.join(__dirname, "..", "uploads");
  const file1OnDisk = file1 && fs.existsSync(path.join(uploadsDir, file1.storedName));
  if (file1OnDisk) ok("  file vật lý tồn tại trong uploads/");
  else bad("  file vật lý KHÔNG tồn tại");

  // ---- 2. Upload .pdf thành công (Teacher) ----
  console.log("\n[2] POST /upload (.pdf) — Teacher");
  const u2 = await httpUpload("/upload", {
    token: teacherToken,
    fieldName: "file",
    filePath: pdfPath,
    fileName: "test.pdf",
    mimeType: "application/pdf",
  });
  assertEq(u2.status, 201, "  status 201");
  const file2 = u2.data.data && u2.data.data.file;
  const file2Id = file2 && file2.id;
  if (file2Id) ok(`  upload thành công id=${file2Id}`);
  else bad("  không lấy được file2.id", JSON.stringify(u2.data));

  // ---- 3. Upload .exe → 400 INVALID_FILE_TYPE ----
  console.log("\n[3] POST /upload (.exe) — bị chặn bởi fileFilter");
  const u3 = await httpUpload("/upload", {
    token: studentToken,
    fieldName: "file",
    filePath: exePath,
    fileName: "test.exe",
    mimeType: "application/x-msdownload",
  });
  assertEq(u3.status, 400, "  status 400");
  if (u3.data && u3.data.error === "INVALID_FILE_TYPE") ok("  error code = INVALID_FILE_TYPE");
  else bad("  error code sai", JSON.stringify(u3.data));

  // ---- 4. Upload file 11MB → 400 FILE_TOO_LARGE ----
  console.log("\n[4] POST /upload (11MB) — bị chặn bởi multer limits");
  const u4 = await httpUpload("/upload", {
    token: studentToken,
    fieldName: "file",
    filePath: bigPath,
    fileName: "big.bin",
    mimeType: "application/octet-stream",
  });
  assertEq(u4.status, 400, "  status 400");
  if (u4.data && u4.data.error === "FILE_TOO_LARGE") ok("  error code = FILE_TOO_LARGE");
  else bad("  error code sai", JSON.stringify(u4.data));

  // ---- 5. Upload không có token → 401 ----
  console.log("\n[5] POST /upload (không có token) → 401");
  const u5 = await httpUpload("/upload", {
    token: null,
    fieldName: "file",
    filePath: jpgPath,
    fileName: "test.jpg",
    mimeType: "image/jpeg",
  });
  assertEq(u5.status, 401, "  status 401");

  // ---- 6. GET /files — Student chỉ thấy file của mình ----
  console.log("\n[6] GET /files (Student) — chỉ thấy của mình");
  const g1 = await httpJson("GET", "/files", { token: studentToken });
  assertEq(g1.status, 200, "  status 200");
  const items1 = g1.data.data || [];
  const allMine = items1.every((f) => f.uploadedById === file1.uploadedById);
  if (allMine) ok(`  tất cả ${items1.length} file đều của student`);
  else bad("  có file KHÔNG phải của student");

  // ---- 7. GET /files — Admin thấy TẤT CẢ ----
  console.log("\n[7] GET /files (Admin) — thấy tất cả");
  const g2 = await httpJson("GET", "/files", { token: adminToken });
  assertEq(g2.status, 200, "  status 200");
  const items2 = g2.data.data || [];
  const hasBoth = items2.some((f) => f.id === file1Id) && items2.some((f) => f.id === file2Id);
  if (hasBoth) ok(`  admin thấy cả 2 file (student + teacher), total = ${items2.length}`);
  else bad("  admin KHÔNG thấy đủ 2 file", `items2.length = ${items2.length}`);

  // ---- 8. GET /files/:id — xem của người khác → 403 ----
  console.log("\n[8] GET /files/:id (Student xem file của Teacher) → 403");
  const g3 = await httpJson("GET", `/files/${file2Id}`, { token: studentToken });
  assertEq(g3.status, 403, "  status 403");

  // ---- 9. DELETE — Student xóa file của Teacher → 403 ----
  console.log("\n[9] DELETE /files/:id (Student xóa file của Teacher) → 403");
  const d1 = await httpJson("DELETE", `/files/${file2Id}`, { token: studentToken });
  assertEq(d1.status, 403, "  status 403");

  // ---- 10. DELETE — Student xóa file của chính mình → 200 ----
  console.log("\n[10] DELETE /files/:id (Student xóa file của mình) → 200");
  const d2 = await httpJson("DELETE", `/files/${file1Id}`, { token: studentToken });
  assertEq(d2.status, 200, "  status 200");
  // File vật lý phải biến mất
  const stillThere = file1 && fs.existsSync(path.join(uploadsDir, file1.storedName));
  if (!stillThere) ok("  file vật lý đã bị xoá khỏi uploads/");
  else bad("  file vật lý VẪN CÒN");

  // ---- 11. DELETE — Admin xóa file của Teacher → 200 ----
  console.log("\n[11] DELETE /files/:id (Admin xóa file của Teacher) → 200");
  const d3 = await httpJson("DELETE", `/files/${file2Id}`, { token: adminToken });
  assertEq(d3.status, 200, "  status 200");
  const stillThere2 = file2 && fs.existsSync(path.join(uploadsDir, file2.storedName));
  if (!stillThere2) ok("  file vật lý của teacher đã bị admin xoá");
  else bad("  file vật lý VẪN CÒN");

  // ---- 12. GET file đã xoá → 404 ----
  console.log("\n[12] GET /files/:id (file đã xoá) → 404");
  const g4 = await httpJson("GET", `/files/${file1Id}`, { token: studentToken });
  assertEq(g4.status, 404, "  status 404");

  // ---- Dọn dẹp file test ----
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}

  // ---- Tổng kết ----
  console.log(`\n=== KẾT QUẢ: ${passed} passed / ${failed} failed ===`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("Lỗi test:", e);
  process.exit(1);
});
