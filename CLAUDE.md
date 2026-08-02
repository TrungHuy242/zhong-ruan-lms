# Zhong Ruan LMS — Project Context (đọc trước khi làm bất kỳ việc gì)

> File này là bản bàn giao context cho Claude Code, viết sau khi dự án được
> phát triển qua nhiều phiên làm việc với Cursor. Đọc kỹ trước khi code —
> đặc biệt mục "Lỗi đã lặp lại nhiều lần" ở cuối, vì đây là các bẫy đã gây
> mất thời gian debug nhiều lần trong quá khứ.

## 1. Dự án là gì

**Zhong Ruan** — trung tâm dạy tiếng Trung online tại Việt Nam (Đà Nẵng).
Dự án gồm 2 phần trong cùng 1 monorepo:

1. **Admin Panel (LMS)** — hệ thống quản trị nội bộ cho trung tâm.
2. **Public Marketing Site** — trang web công khai để giới thiệu/thu hút
   học viên, tối ưu SEO, đã được công ty duyệt qua nhiều vòng review.

Repo gốc: `d:\TrungHuy\ZhoungRuan\zhong-ruan-lms\` — gồm `backend/` và
`frontend/`.

## 2. Tech stack

- **Backend**: Node.js + Express, Prisma ORM + PostgreSQL, JWT auth
  (access + refresh token), nodemailer (Gmail SMTP) cho email.
- **Frontend**: Vite + React 18 + TypeScript + React Router v6 + Plain CSS
  (CSS Modules + CSS Variables, KHÔNG dùng Tailwind/component library nào
  ngoài `lucide-react` cho icon).
- Không dùng Next.js — Public site làm SEO bằng **prerender thủ công**
  (Puppeteer script chạy sau `vite build`, xem mục 5).

## 3. Admin Panel — đã có gì

8 màn hình gốc + các module nâng cấp "Level 2":
Login, Register, Admin Layout (Sidebar/Header/Footer + role-based menu),
User Management (search/filter/bulk action/sort/column visibility),
Dashboard (KPI cards + biểu đồ tháng + realtime), Notification Management
(bell dropdown + realtime Socket.io), Audit Log, File Manager (upload
queue/preview/bulk download zip), System Settings.

Các module bổ sung sau này (đều theo pattern CRUD chuẩn: Backend Prisma
model + Admin CRUD frontend + tích hợp Audit Log/Trash):
- **Teacher** — hồ sơ giảng viên công khai (tách biệt với User role=teacher,
  xem mục 6).
- **PricingPlan** — gói học phí hiển thị ở trang Bảng giá.
- **ContactRequest** — lưu form Liên hệ từ Public site + gửi email thông báo.
- **EnrollmentSchedule** — block "Lịch khai giảng" trên Trang chủ (singleton
  style: nhiều bản dự phòng, public chỉ lấy 1 bản published có displayOrder
  thấp nhất).

Tài khoản test (seed): `admin@zhongruan.com` / `teacher@zhongruan.com` /
`student@zhongruan.com`, password `123456`.

## 4. Public Site — 5 trang

Trang chủ (`/`), Khóa học (`/khoa-hoc` + `/khoa-hoc/:slug` — 3 cấp HSK),
Giảng viên (`/giang-vien` + `/giang-vien/:slug`), Bảng giá (`/bang-gia`),
Liên hệ (`/lien-he`). Cộng thêm Login/Register dùng chung route nhưng có
header riêng tối giản (không phải PublicHeader đầy đủ).

**Thông tin liên hệ hiện tại là DATA TEST** (địa chỉ/SĐT/email cá nhân của
dev) — PHẢI thay bằng thông tin thật của trung tâm trước khi lên production
thật.

## 5. Kiến trúc SEO (quan trọng — dễ hiểu lầm)

- KHÔNG dùng SSR/Next.js. Dùng **prerender sau build**:
  `frontend/scripts/prerender.js` (Puppeteer) chạy `vite preview`, duyệt
  qua từng route public, lưu đè HTML tĩnh vào `dist/<route>/index.html`.
- `frontend/scripts/generate-sitemap.js` sinh `sitemap.xml` **động** — gọi
  API lấy danh sách giảng viên (vì Teacher là data động qua Admin CRUD).
- **RÀNG BUỘC VẬN HÀNH**: `npm run build` phải chạy khi **Backend đang
  online**, vì prerender + sitemap cần gọi API thật (`/api/public/teachers/
  featured`). Nếu Backend tắt lúc build, build không fail nhưng sitemap/
  prerender sẽ THIẾU trang giảng viên — lỗi âm thầm, dễ bị bỏ qua.
- `react-helmet-async` quản lý `<title>`/`<meta description>` động mỗi
  trang (component `SEO.tsx` dùng chung).
- Fonts dùng **`@fontsource` (bundle local)**, KHÔNG dùng Google Fonts CDN
  `<link>` trực tiếp — xem lỗi #4 ở mục 7.

## 6. Quyết định kiến trúc quan trọng cần nhớ

- **Teacher (hồ sơ công khai) ≠ User role=teacher (tài khoản đăng nhập)**.
  2 bảng tách biệt có chủ đích — không phải ai có tài khoản cũng cần/muốn
  hồ sơ công khai. Có field `linkedUserId` optional để đối chiếu, không
  đồng bộ 2 chiều.
- Mọi module CRUD mới (Teacher/PricingPlan/ContactRequest/EnrollmentSchedule)
  đều PHẢI đăng ký vào: (a) Audit Log, (b) Trash/soft-delete resource types
  (`TRASH_RESOURCE_TYPES` — mảng cấu hình chung), (c) Sidebar menu với
  role-check đã chuẩn hóa. Đây là checklist bắt buộc mỗi khi thêm resource
  type mới, xem lỗi #1 và #2 ở mục 7 — đã bị bỏ sót nhiều lần.

## 7. Design System — 2 "thời kỳ"

`DESIGN.md` ở root `frontend/` là nguồn chân lý:
- **§1–8**: hệ thống gốc cho Admin Panel (SaaS token: border-radius,
  box-shadow, màu sắc chuẩn "Admin/Dashboard hiện đại"). VẪN áp dụng cho
  toàn bộ Admin Panel — không đổi.
- **§9 (mới hơn, đã LOCK)**: hệ thống "editorial" cho Public Site + Auth
  (Login/Register), tạo ra bằng skill **Hallmark**
  (`nutlope/hallmark`, cài ở `.cursor/rules/hallmark.mdc` cho Cursor —
  **cần kiểm tra/cài lại đúng vị trí cho Claude Code**, có thể khác path).
  Đặc điểm hệ §9: `border-radius: 0`, `box-shadow: none`, hairline border
  (1-3px) thay shadow/pill, không dùng pill badge (bg-fill + border-radius
  999px), CTA button `text-transform: uppercase` + `letter-spacing: 0.08em`
  (không `translateY` khi hover), font `Source Serif 4` (heading) +
  `Be Vietnam Pro` (body) qua `@fontsource`, palette anchor cố định:
  `--brand-primary #C8102E` (đỏ) + `--brand-accent #D4AF37` (vàng gold) +
  ivory `#FAF7F2` + ink `#1A1A1E`. **Italic bị cấm trên heading/display
  text ≥16px** — NGOẠI TRỪ carve-out đã lock: số liệu lớn (stat counter,
  giá tiền, ordinal number) và pull-quote/testimonial — 2 trường hợp này
  ĐƯỢC PHÉP italic, không phải lỗi.
- Cả 5 trang Public + Header/Footer + Login/Register đã redesign xong theo
  §9, qua nhiều vòng "REDESIGN" + "audit" bằng Hallmark, đã fix xong toàn
  bộ drift phát hiện được (xem mục 8).
- Mỗi trang có macrostructure/theme khác nhau (để tránh nhìn "khuôn AI"),
  nhưng dùng chung đúng 1 bộ token màu/font/spacing đã lock — **không tự ý
  đổi màu/font khi làm thêm trang mới**, chỉ đổi cách trình bày.

## 8. Trạng thái hiện tại (tại thời điểm bàn giao)

Hoàn thành đầy đủ QA tổng thể (6 mục, 2026-07-26), tất cả PASS:
- Mục 1: slop-test 30 CSS module, 0 offender
- Mục 2: Vietnamese diacritic scan, 27/27 PASS
- Mục 3: build + prerender với Backend online, sitemap 9 URL đầy đủ
- Mục 4: responsive overflow, 27/27 PASS (7 trang × 3 breakpoint)
- Mục 5: console + network errors, 27/27 PASS
- Mục 6: click-through toàn luồng chính, 9/9 bước OK
- Bằng chứng: `qa-final-report.md` + 2 script QA chạy trong repo

Báo cáo đầy đủ: `qa-final-report.md` ở root repo.

## 9. Lỗi đã lặp lại nhiều lần trong dự án (đọc kỹ — tránh lặp lại)

1. **File "song song" (dead code)**: từng có 2 bản `Sidebar.tsx` cùng lúc
   (1 dead code ở `shared/components/layout/`, 1 file thật ở
   `app/layouts/`) — sửa nhầm bản không được import khiến thay đổi "biến
   mất". LUÔN xác minh import chain thật (từ `App.tsx`/`AppRoutes.tsx` lần
   theo) TRƯỚC khi sửa bất kỳ file UI dùng chung nào, đừng tin tên file.

2. **Quên đăng ký module mới vào hệ thống dùng chung**: nhiều lần thêm
   CRUD mới (Teacher, PricingPlan) xong nhưng quên thêm vào Audit Log/Trash
   resource types/Sidebar — phải rà lại thủ công nhiều lần. Checklist bắt
   buộc mỗi khi thêm CRUD module mới: audit log ghi nhận action, đăng ký
   vào TRASH_RESOURCE_TYPES, thêm Sidebar menu + role check.

3. **Role so sánh strict-equals**: code cũ so `role === "ADMIN"` không
   chuẩn hóa hoa/thường, khiến menu Admin-only bị ẩn sai nếu data lưu khác
   format. Đã sửa dùng hàm chuẩn hóa dùng chung (`hasRole()`/`isAdmin()`
   trong `shared/utils/auth.ts`) — LUÔN dùng hàm này, không tự so sánh
   string trực tiếp ở chỗ mới.

4. **Google Fonts CDN thiếu Vietnamese subset**: gây lỗi hiển thị tách dấu
   kỳ lạ (VD "Tiế ng" thay vì "Tiếng") — do font thiếu glyph dấu kép, phải
   fallback font khác giữa chừng, cộng thêm `letter-spacing` âm lớn trên
   heading làm lộ rõ khoảng cách bất thường. Đã chuyển toàn bộ sang
   `@fontsource` (bundle local, tự kiểm soát subset) — KHÔNG bao giờ dùng
   `<link>` Google Fonts trực tiếp nữa cho dự án này.

5. **Express route mount order**: `app.use("/api", uploadRoutes)` có
   `router.use(authenticate)` ở đầu + path tổng quát `/api` sẽ match VÀ
   CHẶN (401) bất kỳ route public nào mount SAU nó dù path cụ thể hơn.
   Route public MỚI luôn phải mount TRƯỚC dòng
   `app.use("/api", uploadRoutes)` trong `app.js` — có comment cảnh báo
   ngay phía trên dòng đó, ĐỌC COMMENT trước khi thêm route mới.

6. **Prisma migration**: KHÔNG BAO GIỜ chọn "Reset database" khi gặp lệch
   migration — DB có nhiều data test/seed giá trị. Luôn dùng
   `--create-only`, hiện SQL cho người dùng xem trước khi apply, xác nhận
   chỉ có `CREATE TABLE`/thêm cột mới, không có `DROP`/`ALTER` động vào
   bảng khác.

7. **Timezone banner scheduling**: đã verify KHÔNG có bug (dùng UTC nhất
   quán cả lưu và query), nhưng đây là điểm dễ sai nếu code thêm tính năng
   tương tự (lịch hiệu lực theo ngày) — luôn kiểm tra kỹ so sánh
   `startDate <= now <= endDate` có nhất quán timezone không.

## 10. Việc cần làm tiếp (gợi ý, xác nhận lại với người dùng)

- Thay data test (thông tin liên hệ, có thể cả banner/testimonial) bằng
  data thật của trung tâm trước khi deploy.
- Cân nhắc: viết test cho backend services (đã note trong báo cáo tiến độ
  cũ là ưu tiên còn thiếu), chuẩn bị deploy lên domain thật.
- Nếu cài Hallmark skill cho Claude Code, dùng
  `npx skills add nutlope/hallmark` — xác nhận vị trí cài đúng theo cách
  Claude Code đọc skill (khác Cursor).
