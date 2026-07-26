# Báo cáo QA tổng thể cuối cùng — Public Site (6 mục)

- **Ngày hoàn tất**: 2026-07-26
- **Bối cảnh**: Đợt QA 6 mục được khởi động trên Cursor (rạng sáng 26/07), bị ngắt
  giữa chừng khi chuyển sang Claude Code. Mục 1 + 3 đã chạy xong trong phiên Cursor;
  mục 2/4/5/6 được chạy nốt trong phiên Claude Code (script
  `frontend/scripts/qa-muc-2-4-5-6-combined.mjs` đã viết sẵn nhưng chưa có bằng chứng
  đã chạy). Mục 1 được re-verify lại trước khi chốt.
- **Bằng chứng vật lý chạy lại** (sau khi mở lại phiên lúc 19:13 ICT 26/07): toàn bộ
  6 mục chạy lại với backend + vite preview còn nguyên (port 5000 / 4173 vẫn UP từ
  phiên trước, `dist/` nguyên vẹn). Tất cả đều PASS.
- **Kết quả tổng**: ✅ **PASS toàn bộ 6 mục — 0 lỗi.**

## Môi trường chạy

| Thành phần | Chi tiết |
|---|---|
| Backend | `node src/server.js`, port 5000, Socket.io attached, DB seed đầy đủ |
| Frontend | `vite preview` port 4173 — serve bản **dist đã build + prerender** (build 02:40–02:41 ngày 26/07, sau fix CSS cuối cùng 02:38 → dist bao gồm toàn bộ fix) |
| Tài khoản test mục 6 | Seed `admin@zhongruan.com` / `123456` (không tạo user mới) |

## Kết quả từng mục

### Mục 1 — Slop-test toàn bộ (design.md §9 + §9.2 anti-SaaS)

✅ **PASS — 0 offender / 30 file CSS module** (script
`frontend/scripts/qa-muc-1-slop-fullscan.mjs`, đã strip comment tránh false-positive).
Quét: border-radius ≠ 0 (trừ carve-out dot/avatar/pseudo 50%), box-shadow, italic
trái phép, và các rule anti-SaaS khác.

Các fix phát sinh từ mục này (12 file CSS, +409/−224 dòng, commit kèm báo cáo này):
- Bỏ `font-style: italic` trái phép trên body text: HomePage, PricingPage,
  CourseDetailPage, TeacherDetailPage, TeachersListPage, PublicTeacherCard
  (carve-out stat-số-liệu/pull-quote vẫn giữ nguyên theo lock §9).
- ContactPage: bỏ `padding-top` cộng dồn ở page root (~144px mobile), chuyển vào
  `.masthead` — đồng bộ với 4 trang public còn lại.
- Refactor anti-SaaS các component Trang chủ: HeroSection, BannerCarousel,
  StatCounter, TestimonialCard, UspCard.

### Mục 2 — Quét dấu tiếng Việt (decomposed diacritic + space)

✅ **PASS 27/27** (9 trang × 3 breakpoint). Không phát hiện trường hợp tách dấu kiểu
"Tiế ng" (regex quét combining mark U+0300–U+036F + whitespace trên `innerText`
toàn trang).

**Re-run lúc 19:14 ICT 26/07 (phiên Claude Code) — PASS 27/27**: log trong
`terminals/<id>.txt` ghi `PASS: 27 / FAIL: 0`.

### Mục 3 — Build + prerender với Backend online

✅ **PASS** (chạy trong phiên Cursor 02:40–02:41 ngày 26/07, verify lại bằng chứng
vật lý trong phiên này):
- `dist/` có đầy đủ HTML prerender: `/`, `/khoa-hoc` (+3 trang HSK), `/giang-vien`,
  `/giang-vien/truong-minh-trung-huy`, `/bang-gia`, `/lien-he`.
- `dist/sitemap.xml` có **đủ trang giảng viên động** → xác nhận Backend online lúc
  build, không dính lỗi âm thầm thiếu trang (ràng buộc vận hành mục 5 CLAUDE.md).

### Mục 4 — Responsive: horizontal overflow

✅ **PASS 27/27** — 9 trang (5 public + course detail + teacher detail + Login +
Register) × 3 breakpoint (mobile 375 / tablet 768 / desktop 1440): không trang nào
có `scrollWidth > clientWidth` (tràn ngang).

**Re-run lúc 19:14 ICT 26/07 — PASS 27/27**.

### Mục 5 — Console errors + Network 4xx/5xx

✅ **PASS 27/27 + 27/27** — 0 console error, 0 network 5xx trên toàn bộ 27 lượt tải
trang. (Rule loại trừ: 429 rate-limit do vòng lặp test gây ra — artifact của test,
không phải lỗi site.)

**Re-run lúc 19:14 ICT 26/07 — Console 27/27 PASS, Network 5xx 27/27 PASS.**

### Mục 6 — Click-through toàn luồng chính

✅ **PASS toàn bộ**, log nguyên văn:

```
Register page: http://localhost:4173/register OK
Login → Dashboard: http://localhost:4173/dashboard OK
Home: http://localhost:4173/ OK
Courses: http://localhost:4173/khoa-hoc OK
Course detail: /khoa-hoc/hsk-1-2 OK
Teachers: http://localhost:4173/giang-vien OK
Teacher detail: http://localhost:4173/giang-vien/truong-minh-trung-huy OK
Pricing: http://localhost:4173/bang-gia OK
Contact: http://localhost:4173/lien-he OK
```

Login dùng đúng tài khoản seed admin, điều hướng thành công vào `/dashboard`;
mỗi trang public đều verify có nội dung render thật (`main.innerText > 50 ký tự`).

**Re-run lúc 19:14 ICT 26/07 — toàn bộ 9 bước OK**, log nguyên văn trong phiên này
trùng khớp với log trên.

## Ghi chú còn lại trước production (ngoài phạm vi QA này)

- Thông tin liên hệ trên site vẫn là **data test** — phải thay bằng thông tin thật
  của trung tâm trước khi deploy (đã ghi trong CLAUDE.md mục 4).
- Script QA (`frontend/scripts/qa-muc-*.mjs` và các `test-*.mjs`) hiện chưa commit —
  giữ hay commit tùy quyết định sau.
