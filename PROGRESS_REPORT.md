# 📊 BÁO CÁO TIẾN ĐỘ DỰ ÁN — Zhong Ruan LMS

> **Tên dự án**: Zhong Ruan LMS (中阮 — Hệ thống quản lý đào tạo Trung Quốc học)
> **Mục đích**: Nền tảng quản lý lớp học, học viên, lộ trình học tập + **website marketing công khai** cho Trung tâm tiếng Trung Zhong Ruan
> **Repo**: `github.com/TrungHuy242/zhong-ruan-lms`
> **Stack**: React + Vite + TypeScript (frontend) · Node.js + Express + Prisma + PostgreSQL (backend) · Puppeteer (prerender & QA)
> **Ngày bắt đầu**: 06/07/2026
> **Ngày cập nhật**: **23/07/2026**
> **Tổng số commit**: **79 commits** (toàn bộ do 1 tác giả — TrungHuy · ~18 ngày làm việc)
> **Mã mới nhất**: `aa6c625` (QA cuối cùng)

---

## 1. TỔNG QUAN — 1 PHÚT ĐỌC

Dự án đã **hoàn thành 2 sản phẩm chính**:

| Sản phẩm | Mô tả | Trạng thái |
|---|---|---|
| 🅰️ **Admin Site** (`/dashboard`, `/users`, ... `/contact-requests`) | Trang quản trị cho Admin/Teacher/Student, đầy đủ CRUD + filter + bulk + audit | ✅ **Hoàn thành** |
| 🅱️ **Public Site** (`/`, `/khoa-hoc`, `/giang-vien`, `/bang-gia`, `/lien-he`) | Website marketing công khai có **SEO + Prerender + Sitemap** | ✅ **Hoàn thành** |

**Tổng số module backend**: **14 module** (tăng từ 8 module trong báo cáo cũ)
**Tổng số endpoint REST công khai**: **~85 endpoint**
**Tổng số trang frontend**: **17 trang** (10 admin cũ + 5 public + 2 auth)

| Hạng mục | Trạng thái | % |
|---|---|---|
| Backend API (14 module) | ✅ Hoàn thành | **100%** |
| Database schema + 18 migrations | ✅ Hoàn thỉnh | **100%** |
| Admin Site (10 trang + Trash + Audit Center) | ✅ Hoàn thành | **100%** |
| Public Site (5 trang + prerender + SEO) | ✅ Hoàn thành | **100%** |
| Auth + RBAC + JWT rotation + Rate-limit | ✅ Hoàn thành | **100%** |
| Soft-delete infrastructure (7 model) | ✅ Hoàn thành | **100%** |
| Email service (SMTP via nodemailer) | ✅ Hoàn thành | **100%** |
| Realtime notification (Socket.io) | ✅ Hoàn thành | **100%** |
| **Production Readiness (security headers, helmet, compression, ...)** | 🔴 **Cần sửa 4 P0** | ~30% |
| **Testing (unit/integration/E2E)** | ❌ Chưa làm | **0%** |
| **Deploy + CI/CD** | ❌ Chưa làm | **0%** |

**Kết luận 1 dòng**: Đã có sản phẩm chạy được end-to-end (Public + Admin), đã qua 2 đợt QA chuyên sâu, **đang ở giai đoạn tiền Production** — cần sửa 4 lỗi P0 về bảo mật/hạ tầng trong 1-2 ngày thì có thể deploy cho 2.000-3.000 người dùng.

---

## 2. TIMELINE THEO GIAI ĐOẠN

### 📅 Giai đoạn 1 (06-10/07/2026) — MVP Admin Site hoàn chỉnh
**31 commits đầu tiên**: Khởi tạo project → Backend 8 module (Auth/Users/Notifications/Uploads/Settings/Dashboard/Search/Audit) → Frontend 10 trang → Tái cấu trúc Feature-based.
*(Chi tiết trong báo cáo cũ 10/07/2026 — mục này đã ổn định, không thay đổi)*

### 📅 Giai đoạn 2 (11-17/07/2026) — Nâng cấp lên chuẩn SaaS
| Commit chính | Nội dung |
|---|---|
| `13a5f18`, `ceccbcc`, `0f3bcc9` | Nâng cấp Dashboard (recharts + bộ lọc), Users (server-side pagination + 2 bulk endpoint) |
| `fc01701`, `b109c4b` | Module Profile thành trang quản lý tài khoản SaaS |
| `634cf01` | Fix bug upload avatar trả 401 + cải thiện Vite proxy multipart |
| `3c0e109`, `effacec` | Settings: sidebar nhóm + quick-edit inline + import/export JSON |
| `8da68c6`, `dd94a7b`, `25a56cc`, `2ba8021` | Audit Center chuyên nghiệp (search, module filter, redact meta, detail) |
| `6e8f748`, `b7e778e` | FileManagerPage SaaS (sort/filter, storage-stats, bulk delete, bulk download zip) |
| `ceccbcc`, `bb00c0a`, `3a09ca` | Realtime notification — Socket.io theo target (user/role/all) + UI Panel |
| `841ad5b` → `19bbfd5e` | TrashManagerPage chuyên nghiệp — bulk, filter nâng cao, audit log |
| `a1cd66d`, `05e7b8a`, `d5c0cf0` | GlobalSearchPage chuẩn SaaS + Command Palette `Ctrl+K` |

**Sản phẩm cuối giai đoạn 2**: Toàn bộ Admin site ở chuẩn SaaS, có realtime Socket.io, Bulk action, Audit Center, Command Palette.

### 📅 Giai đoạn 3 (18-23/07/2026) — Xây dựng Public Site hoàn chỉnh ✅
| Commit | Nội dung |
|---|---|
| `20260718011000` → `8d80f12` | Module Teachers (backend CRUD + public API + soft delete + audit + slug tự sinh) |
| `afcabfb`, `3e69428` | UI Admin + liên kết User role=teacher |
| `f358bbb` | Trang public `/giang-vien` + SEO động |
| `518f065` | Trang Khóa học + 3 trang chi tiết HSK 1-2/3-4/5-6 |
| `11516fb` | Trang chủ public có nội dung thật |
| `1a13de1` | Hạ tầng public site (layout, header, footer, SEO component) |
| `e9cc4af`, `c583e0a`, `9fd70ce` | QA + Performance dashboard, fix Recent Activities, fix auth brute-force |
| `a72e287` → `aa6c625` | **Module PricingPlans + ContactRequests** (full backend + frontend), mở rộng soft-delete infrastructure, **2 đợt QA chuyên sâu** |

**Sản phẩm cuối giai đoạn 3** (hiện tại): 5 trang public hoàn chỉnh (Trang chủ / Khóa học / Giảng viên / Bảng giá / Liên hệ) có SEO + Prerender + Sitemap + Robots.

---

## 3. KIẾN TRÚC HIỆN TẠI

### 🗄️ Database — 10 bảng, 3 enum, 18 migrations

```
                    ┌─ AuditLog
                    ├─ Notification
                    ├─ UploadFile
                    ├─ AuditLog (recent endpoint)
User ───────────────┼─ SearchHistory
                    ├─ Teacher (linkedUser)
                    └─ soft-delete actor của 7 model

Setting (độc lập, lưu JSON)
Teacher (UUID, slug, bio, specialties[], isFeatured, isPublished, ...)
PricingPlan (UUID, name, classType, price, priceUnit, features[], ...)
ContactRequest (UUID, fullName, phone, email, message, status, ...)
```

**10 bảng**, **3 enum** (`Role`, `UserStatus`, `NotificationType`), **18 migrations** đã chạy ổn định.

### 🔧 Backend — 14 module, ~85 endpoint REST

```
backend/src/
├── app.js (CORS, body parser, static /uploads, 21 routes mount)
├── server.js / server.dev.js / server.prod.js
├── middlewares/
│   ├── auth.middleware.js     # JWT verify + check status
│   ├── role.middleware.js     # RBAC
│   ├── rateLimit.middleware.js # login/refresh/public teachers/pricing/contact
│   ├── upload.middleware.js   # Multer + whitelist MIME/ext
│   ├── error.middleware.js    # Centralized (status mapping, multer, JWT, Prisma)
│   └── notFound.middleware.js
├── utils/
│   ├── jwt.js, softDelete.js, prismaSoftDelete.js, softQuery.js
│   ├── prismaHelpers.js, bannerMessages.js
└── modules/                   # 14 module
    ├── auth/         (8 endpoint)          # register/login/refresh/forgot/reset/...
    ├── profile/      (4 endpoint)
    ├── users/        (9 endpoint)
    ├── notifications/(8 endpoint)
    ├── uploads/      (1 endpoint POST)
    ├── files/        (8 endpoint)          # module con của uploads, mới tách
    ├── settings/     (7 endpoint)
    ├── dashboard/    (2 endpoint)          # overview + monthly
    ├── search/       (4 endpoint)          # search + history
    ├── audit/        (3 endpoint)
    ├── trash/        (7 endpoint)          # quản lý soft-delete chung
    ├── teachers/     (admin 8 + public 3)  # ⭐ MỚI
    ├── pricing-plans/(admin 7 + public 1)  # ⭐ MỚI
    ├── contact-requests/(admin 6 + public 1) # ⭐ MỚI
    ├── email/        (smtp service)        # ⭐ MỚI
    └── sockets/      # Socket.io + JWT auth + room theo user/role
```

**Cải tiến quan trọng đã có**:
- ✅ JWT có rotation + atomic refresh (chống race-condition)
- ✅ Rate-limit per endpoint (login, refresh, contact, teachers, pricing)
- ✅ Audit log tự động cho mọi thao tác nhạy cảm
- ✅ Soft-delete unified: 7 model dùng cùng 1 helper, 1 whitelist cho Trash
- ✅ Socket.io auth + room per user/role

### 🎨 Frontend — 17 trang, Feature-based architecture

```
frontend/src/
├── app/
│   ├── App.tsx, routes/AppRoutes.tsx (19 route)
│   └── layouts/AdminLayout, PublicLayout, layouts/Sidebar (admin) + Header (admin)
├── shared/
│   ├── components/
│   │   ├── ui/ (Alert, Button, Card, ConfirmDialog, FileIcon, Input, Modal, 
│   │   │       Pagination, Skeleton, StatCard, Table, Toast, UploadZone)
│   │   ├── layout/ (AdminLayout, BulkActionBar, Header, Sidebar, UserDropdown)
│   │   ├── PublicHeader.tsx, PublicFooter.tsx, PublicLayout
│   │   ├── SEO.tsx (react-helmet-async wrapper)
│   │   └── Loader/Spinner
│   ├── contexts/ (NotificationContext, AuthContext, ToastContext)
│   ├── hooks/ (useAuth, useDebounce, usePagination, useNotificationSocket, useTableColumns)
│   ├── lib/ (api client axios, query keys)
│   ├── services/ (api helpers cho 4 module admin cốt lõi)
│   ├── storage/ (authStorage)
│   └── utils/ (auth.ts — normalizeRole, hasRole, isAdmin) ⭐ MỚI
├── pages/
│   ├── public/  (5 trang: HomePage, CoursesPage, CourseDetailPage,
│   │             TeachersListPage, TeacherDetailPage, PricingPage, ContactPage) ⭐ MỚI
│   ├── auth/    (LoginPage, RegisterPage, ForgotPassword, ResetPassword)
│   └── admin/   (qua AdminLayout)
└── features/   (15 feature folder độc lập)
    ├── auth, dashboard, users, notifications, files, settings,
    ├── profile, search, audit-log, trash
    ├── teachers (Admin UI)           ⭐ MỚI
    ├── pricing (Admin UI)             ⭐ MỚI
    ├── contact-requests (Admin UI)    ⭐ MỚI
    └── public (components shared: Hero, Breadcrumb, CTABanner, FAQAccordion,
                PricingCard, PolicyCard, ContactForm, ContactInfo, ImagePlaceholder) ⭐ MỚI
```

**Build output**:
- TypeScript strict mode, không có lỗi compile
- Vite prerender qua Puppeteer → tạo **9 file HTML tĩnh** (8 public route + 1 giáo viên featured động)
- Bundle 1.23 MB JS (chưa code-split) — cải thiện ở P1
- Sitemap tự sinh + robots.txt đầy đủ

---

## 4. PUBLIC SITE — SẢN PHẨM MỚI CỦA GIAI ĐOẠN 3

### 4.1 Danh sách 5 trang public

| # | Route | Trang | Module backend phụ thuộc | Tính năng |
|---|---|---|---|---|
| 1 | `/` | **Trang chủ** | Teachers (featured) + Pricing + Courses (tĩnh) | Hero + khóa học + giảng viên nổi bật + CTA |
| 2 | `/khoa-hoc` | **Khóa học** | (tĩnh) | Grid 3 khóa HSK + breadcrumbs |
| 3 | `/khoa-hoc/{hsk-1-2,hsk-3-4,hsk-5-6}` | **3 trang chi tiết** | (tĩnh) | Hero + roadmap + outcomes + FAQ + cross-link |
| 4 | `/giang-vien` | **Giảng viên** | Teachers (public API) | Grid filter theo chuyên môn + search keyword |
| 5 | `/giang-vien/:slug` | **Chi tiết GV** | Teachers (public by-slug) | 404 state nếu không tồn tại |
| 6 | `/bang-gia` | **Bảng giá** | PricingPlans (public API) | Grid PricingCard + Policy + FAQ + CTA |
| 7 | `/lien-he` | **Liên hệ** | ContactRequests (public POST) | Form + thông tin liên hệ + rate-limit 3/IP/giờ |

### 4.2 Tính năng SEO + Prerender

- ✅ **9 file HTML prerender** qua Puppeteer (mỗi file có `<title>` + `<meta description>` + 1 `<h1>` riêng)
- ✅ **Sitemap.xml tự sinh** (8 route tĩnh + N giáo viên featured động)
- ✅ **robots.txt** chuẩn — đầy đủ Disallow cho admin routes + Sitemap pointer
- ✅ **SEO component** (react-helmet-async) — title/description động theo từng trang
- ✅ **Open Graph + Twitter Card meta tags**

### 4.3 Loading / Empty / Error state đầy đủ (sau 2 đợt QA)
- ✅ Loading skeleton cho Grid giảng viên + PricingCard
- ✅ Empty state có message rõ ràng + CTA "Liên hệ tư vấn"
- ✅ Error state có Alert + **nút "Thử lại"** cho cả `/giang-vien` và `/bang-gia`
- ✅ 404 state đẹp cho teacher slug không tồn tại

---

## 5. MODULE MỚI HOÀN TOÀN (giai đoạn 3)

### 5.1 Teachers (Giáo viên)
- **Backend**: 8 admin endpoint + 3 public endpoint, soft-delete, audit, slug tự sinh
- **Frontend Admin**: `/teachers` — CRUD với form modal, filter isFeatured/isPublished
- **Frontend Public**: `/giang-vien` + `/giang-vien/:slug` — có SEO riêng cho từng giáo viên featured
- **Tính năng đặc biệt**: Admin có thể **liên kết giáo viên với User role=TEACHER** (field `linkedUserId`)

### 5.2 PricingPlans (Bảng giá)
- **Backend**: 7 admin endpoint + 1 public endpoint, soft-delete, audit
- **Frontend Admin**: `/pricing-plans` — CRUD với form đầy đủ (features, originalPrice, displayOrder)
- **Frontend Public**: `/bang-gia` — grid đẹp với "Phổ biến nhất" highlight

### 5.3 ContactRequests (Liên hệ)
- **Backend**: 6 admin endpoint + 1 public endpoint, soft-delete, audit, **gửi email notification qua SMTP** (nodemailer)
- **Frontend Admin**: `/contact-requests` — quản lý lead, đổi status (NEW → CONTACTED → CLOSED)
- **Frontend Public**: `/lien-he` — form gửi yêu cầu, rate-limit 3/IP/giờ, validate đầy đủ

### 5.4 Email Service ⭐
- Module mới dùng **nodemailer + SMTP** (Gmail App Password compatible)
- Có **dry-run mode** khi chưa config SMTP — chỉ log ra console
- ENV config: `SMTP_HOST/PORT/USER/PASSWORD`, `CONTACT_NOTIFICATION_EMAIL`

### 5.5 Soft-delete infrastructure mở rộng
- 7 model hỗ trợ soft-delete: User, Notification, UploadFile, Setting, Teacher, PricingPlan, ContactRequest
- Trash whitelist cập nhật (`MODULE_TO_LABEL`, `MODULE_TO_PRISMA`, `buildModuleWhere`)
- TrashManagerPage hoạt động đồng bộ cho cả 7 model

---

## 6. ĐÃ QUA 2 ĐỢT QA CHUYÊN SÂU

### 6.1 Đợt QA lần 1 — Cross-module consistency (ưu tiên cao)
Phát hiện & đã sửa:
- 🔴 Robots.txt thiếu 3 route admin mới (`/teachers`, `/pricing-plans`, `/contact-requests`)
- 🔴 TeacherDetailPage description SEO quá ngắn khi bioShort ngắn (7 ký tự "Tuyệt vời") → fix fallback dùng `title + yearsOfExperience + specialties`
- 🔴 **PricingPage và TeachersListPage thiếu nút "Thử lại"** khi loadError → fix với `reloadToken` pattern + CSS `.errorState`
- ✅ Build prerender 9 routes thành công
- ✅ Tất cả HTML đúng 1 `<h1>`
- ✅ 0 console error (ngoại trừ probe 404 cố ý)
- ✅ 0 trang nào tràn ngang ở 3 breakpoint

### 6.2 Đợt QA lần 2 — Production Readiness Review (cuối cùng)
Vai trò: Senior Software Architect · Senior QA Engineer · Senior Security Engineer · Senior Performance Engineer

**Tổng điểm: 6.5 / 10** — **Có thể Production sau khi sửa 4 P0**

| Hạng mục | Điểm /10 |
|---|---|
| Functional | 9.0 |
| Security | 6.5 (cần fix 4 P0) |
| Performance | 7.5 (bundle + COUNT chưa cache) |
| Scalability | 6.0 (single instance, chưa Redis adapter) |
| Maintainability | 8.0 |
| **Production Readiness** | **6.5** |

**Top 4 lỗi P0 (Critical — phải sửa trước khi deploy)**:
1. **`app.js`** thiếu `helmet()` + `compression()` + rate-limit global
2. **`app.js`** `cors()` mở hoàn toàn — không whitelist origin
3. **`server.js`** thiếu handler cho `uncaughtException` / `unhandledRejection`
4. **`server.js`** thiếu graceful shutdown khi nhận SIGTERM

**Top 6 lỗi P1 (High — làm theo đợt)**:
5. Static `/uploads` không có auth — file nhạy cảm bị enumerate
6. `vite.config.ts` `sourcemap: true` → lộ code FE
7. Dashboard chạy 7 COUNT query không cache
8. Bundle 1.2 MB không code-split
9. Prisma connection pool chưa config rõ ràng
10. Socket.io không có Redis adapter → không scale horizontal

---

## 7. TỔNG KẾT TÍNH NĂNG THEO ROLE

| Tính năng | STUDENT | TEACHER | ADMIN | Public |
|---|:---:|:---:|:---:|:---:|
| Đăng ký / Đăng nhập / Quên MK | ✅ | ✅ | ✅ | – |
| Xem/Sửa hồ sơ cá nhân, đổi MK | ✅ | ✅ | ✅ | – |
| Xem thông báo của mình (realtime) | ✅ | ✅ | ✅ | – |
| Tìm kiếm toàn hệ thống (Ctrl+K) | ✅ | ✅ | ✅ | – |
| Upload / Download file | ✅ | ✅ | ✅ | – |
| Xem nhật ký hệ thống (Audit Center) | ❌ | ❌ | ✅ | – |
| Quản lý user + bulk action | ❌ | ❌ | ✅ | – |
| Broadcast notification | ❌ | ❌ | ✅ | – |
| Cài đặt hệ thống | ❌ | ❌ | ✅ | – |
| Dashboard tổng quan + chart | ❌ | ❌ | ✅ | – |
| Thùng rác (khôi phục 7 model) | ❌ | ❌ | ✅ | – |
| Quản lý giảng viên (Teachers) | ❌ | ❌ | ✅ | – |
| Quản lý bảng giá (PricingPlans) | ❌ | ❌ | ✅ | – |
| Quản lý yêu cầu tư vấn (Contact) | ❌ | ❌ | ✅ | – |
| Gửi form liên hệ | – | – | – | ✅ |
| Xem bảng giá | – | – | – | ✅ |
| Xem danh sách + chi tiết giảng viên | – | – | – | ✅ |
| Xem khóa học + chi tiết HSK | – | – | – | ✅ |

---

## 8. ĐÃ HOÀN THÀNH ✅

### Backend
- ✅ **14 module, ~85 endpoint REST** (tăng từ 8/38)
- ✅ JWT access + refresh rotation với atomic updateMany
- ✅ RBAC theo 3 role + soft-delete chuẩn
- ✅ Rate-limit per endpoint (login, refresh, public teachers, pricing, contact)
- ✅ Audit log tự động cho mọi thao tác nhạy cảm
- ✅ Email service (nodemailer) + dry-run fallback
- ✅ Socket.io auth + room per user/role
- ✅ Trash Manager xử lý 7 model
- ✅ 18 Prisma migration đã chạy ổn định

### Frontend
- ✅ **17 trang** (10 admin + 5 public + 2 auth) đều có Loading/Empty/Error state
- ✅ **15 feature folder** độc lập
- ✅ Feature-based architecture sạch + shared UI components
- ✅ Real-time notification (Socket.io) với fallback polling
- ✅ Command Palette Ctrl+K
- ✅ Bulk actions (user, file, trash)
- ✅ Public Site có SEO + Prerender + Sitemap đầy đủ
- ✅ Retry button cho mọi trang có gọi API

### Quality
- ✅ TypeScript strict mode, không lỗi compile
- ✅ Build pass (TypeScript + Vite + Puppeteer prerender)
- ✅ Puppeteer QA script (`scripts/qa-public-site.js`) tự động hoá click-through + console/network + overflow check

---

## 9. ĐANG LÀM 🟡
Không có — 100% tính năng core đã xong, đang chờ sửa 4 P0 security để deploy.

---

## 10. CHƯA LÀM ❌ (backlog ưu tiên)

### 🔴 P0 — Phải sửa trước Production (1-2 ngày)
1. Thêm `helmet()` + `compression()` + rate-limit global vào `app.js`
2. Whitelist origin trong `cors()`
3. Handler `uncaughtException` + `unhandledRejection` trong `server.js`
4. Graceful shutdown cho SIGTERM

### 🟠 P1 — Làm ngay sau deploy (1 tuần)
5. Code-splitting bundle (tách React-vendor, charts, icons)
6. Cache dashboard COUNT query (Redis/in-memory)
7. Config Prisma connection pool rõ ràng
8. Redis adapter cho Socket.io (scale horizontal)
9. Auth cho static `/uploads` (signed URL)
10. Tắt source map trong production build

### 🟡 P2 — Maintenance sau này
- Viết test (Vitest unit + Supertest integration + Playwright E2E)
- Upload lên S3/Cloudinary thay vì local disk
- Export CSV/Excel cho user management, audit log
- i18n (Việt/Anh)
- Dark mode
- PWA
- CI/CD (GitHub Actions)
- Docker Compose cho dev
- Deploy lên Vercel (FE) + Railway/Render (BE) + Supabase (DB)

---

## 11. ĐÁNH GIÁ & RỦI RO

### 💪 Điểm mạnh (đã có)
- **Codebase sạch, có kiến trúc rõ ràng** — controller/service/repository pattern, Feature-based frontend
- **Soft-delete infrastructure tốt** — 7 model cùng dùng 1 helper, 1 whitelist
- **RBAC đầy đủ** ngay từ đầu + audit log mọi hành động nhạy cảm
- **Public site có SEO chuẩn** + Prerender + Sitemap
- **Đã qua 2 đợt QA chuyên sâu** tìm được lỗi đồng bộ giữa các module
- **Email service & Socket.io** đã có sẵn

### ⚠️ Rủi ro / Điểm yếu còn lại
- **Chưa có test** — refactor sau này sẽ rất rủi ro (P1)
- **4 P0 security** chưa sửa — không thể deploy public ngay (P0)
- **Bundle 1.2 MB chưa code-split** — mobile 3G chậm (P1)
- **Single Prisma pool + single Socket.io instance** — chưa scale horizontal (P1)
- **Upload local disk** — không scale, không backup (P2)
- **Không có CI/CD** — phải build thủ công (P2)

### 🎯 Đề xuất ưu tiên tuần tới
1. **Sửa 4 P0** (helmet, cors, uncaught handler, graceful shutdown) — **1-2 ngày**
2. **Viết test cho backend services** (Vitest) — quan trọng nhất sau khi deploy
3. **Code-splitting bundle** — cải thiện LCP mobile
4. **Cache dashboard COUNT** — giảm tải DB
5. **Setup CI cơ bản** (build + lint + typecheck tự động)
6. **Deploy staging lên Render/Railway** — test với traffic thật trước khi go-live

---

## 12. TÓM TẮT 1 DÒNG

> **Zhong Ruan LMS** — Hệ thống gồm **Admin Site** (10 trang CRUD + audit + realtime) và **Public Site** (5 trang marketing có SEO + Prerender) — đã chạy end-to-end sau **18 ngày phát triển (79 commits)**, với **14 module backend, 17 trang frontend, ~85 REST endpoint, 7 model soft-delete**. Đã qua 2 đợt QA chuyên sâu. Đang ở giai đoạn **tiền Production** — cần sửa **4 lỗi P0 về bảo mật/hạ tầng trong 1-2 ngày** là có thể deploy phục vụ 2.000-3.000 người dùng.
