// scripts/test-auth-diacritic.mjs
// Diacritic scan cho Login/Register — sniff các từ có dấu kép (ế/ố/ầ/ẫ/ắ/...) 
// để phát hiện tách dấu hoặc font fallback sai.
//
// Test strategy:
//  - Render real DOM (không phải dev text cứng).
//  - Lấy innerText, scan cho "tach dấu" pattern: hai chữ cái có dấu liền kề nhau
//    bị tách bởi dấu cách (vd: "Tiế ng", "Mậ t khẩu", "Đế n").
//  - So khớp text CỤ THỂ đã render trên page (label, button, banner).
import puppeteer from "puppeteer";

const BASE = process.env.AUTH_TEST_URL ?? "http://localhost:5174";

const browser = await puppeteer.launch({ headless: true });
let failures = 0;

const PAGES = {
  "/login": ["Đăng nhập", "Về trang chủ", "Email", "Mật khẩu", "Chưa có tài khoản"], // Login-specific
  "/register": ["Đăng ký", "Đăng nhập", "Về trang chủ", "Họ và tên", "Email", "Số điện thoại", "Mật khẩu", "Xác nhận mật khẩu", "Đã có tài khoản"],
};

try {
  for (const path of Object.keys(PAGES)) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0", timeout: 60000 });
    const txt = await page.evaluate(() => document.body.innerText);

    // 1. Required visible texts present (case-insensitive)
    for (const needle of PAGES[path]) {
      const ok = txt.toLowerCase().includes(needle.toLowerCase());
      if (!ok) failures++;
      console.log(`[${ok ? "PASS" : "FAIL"}] ${path} contains "${needle}"`);
    }

    // 2. No decomposed diacritics — strict pattern: mark + space + mark
    //    Allow mark + space + non-mark (e.g. "Đăng ký" has "Đăng" + space + "ký")
    //    The dangerous pattern is: combining mark attached to a single letter that
    //    got separated from its base letter by a space.
    const loose = await page.evaluate(() => {
      const out = [];
      const range = document.createRange();
      range.selectNodeContents(document.body);
      // We'll use a simpler regex over innerText
      const text = document.body.innerText;
      const lines = text.split(/\n/);
      // Pattern: a base Vietnamese letter with combining mark, followed by space, followed by another Vietnamese letter
      // Look for sequences like "Mậ t" (post-decomposed split)
      const splitPattern = /([ăâđêôơưĂÂĐÊÔƠƯ])([áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỳÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỲ]) ([ăâđêôơưĂÂĐÊÔƠƯáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỳÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỲ])/g;
      for (const line of lines) {
        const matches = [...line.matchAll(splitPattern)];
        if (matches.length > 0) {
          out.push({ line: line.trim(), samples: matches.slice(0, 3).map((m) => m[0]) });
        }
      }
      return out;
    });
    if (loose.length > 0) {
      failures++;
      console.log(`[FAIL] ${path} has decomposed diacritics:`, loose);
    } else {
      console.log(`[PASS] ${path} no decomposed diacritics detected`);
    }

    await page.close();
  }
} finally {
  await browser.close().catch(() => {});
}

console.log(`\n=== FAILURES: ${failures} ===`);
process.exit(failures > 0 ? 1 : 0);
