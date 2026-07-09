# 📊 BÁO CÁO TIẾN ĐỘ DỰ ÁN — Zhong Ruan LMS

> **Tên dự án**: Zhong Ruan LMS (中阮 — Hệ thống quản lý đào tạo)
> **Mục đích**: Nền tảng quản lý lớp học, học viên, lộ trình học tập cho Trung tâm Trung Quốc học
> **Repo**: `github.com/TrungHuy242/zhong-ruan-lms`
> **Stack**: React + Vite + TypeScript (frontend) · Node.js + Express + Prisma + PostgreSQL (backend)
> **Ngày bắt đầu**: 06/07/2026
> **Ngày cập nhật**: 10/07/2026
> **Tổng số commit**: 41 (toàn bộ do 1 tác giả — Huy Trung)

---

## 1. TỔNG QUAN

Dự án được phát triển trong **4 ngày liên tục**, theo phương pháp **vertical-slice** (làm backend → frontend cho từng module, sau đó tinh chỉnh UI). Đến thời điểm hiện tại:

| Hạng mục | Trạng thái | % |
|---|---|---|
| Backend API (8 module) | ✅ Hoàn thành | **100%** |
| Database schema + migrations | ✅ Hoàn thỉnh | **100%** |
| Frontend pages (10 màn hình) | ✅ Hoàn thành | **100%** |
| Auth + RBAC + Rate-limit | ✅ Hoàn thành | **100%** |
| Soft-delete + Thùng rác | ✅ Hoàn thành | **100%** |
| Tái cấu trúc feature-based | ✅ Hoàn thành | **100%** |
| **Tinh chỉnh UI/UX polish** | 🟡 Đang làm | **~70%** |
| Testing (unit/integration/E2E) | ❌ Chưa làm | **0%** |
| Deploy + CI/CD | ❌ Chưa làm | **0%** |

**Kết luận**: MVP về mặt chức năng đã chạy được end-to-end (đăng ký → đăng nhập → CRUD user → thông báo → upload → audit). Phần lớn thời gian tuần này tập trung tinh chỉnh UI cho đồng bộ, **đang ở giai đoạn polish**.

---

## 2. TIMELINE CHI TIẾT THEO NGÀY

### 📅 Ngày 1 — 06/07/2026 (Khởi tạo)
| Commit | Nội dung |
|---|---|
| `d5b48b0` | Initial project setup — Prisma 7, Express, JWT auth |

- Khởi tạo repo, cấu hình Prisma + Express + JWT
- Migration đầu tiên: `20260706154011_init_users` (bảng `User` với role enum)

### 📅 Ngày 2 — 07/07/2026 (Backend Auth + Users)
| Commit | Nội dung |
|---|---|
| `6ee3534` | Middleware JWT + phân quyền theo vai trò + API lấy info user |
| `7e7a56d` | API GET `/api/admin/users` (chỉ Admin) |
| `36aefc4` | API POST `/api/admin/users` (validate email, role, hash password) |
| `778dde1` | API GET/PUT `/api/admin/users/:id` |
| `5fc6fe9` | README.md hoàn chỉnh |
| `36c0efd` | API DELETE `/api/admin/users/:id` |
| `b29084c` | API POST `/api/auth/register` (tự đăng ký STUDENT/TEACHER) |
| `f44cf63` | API POST `/api/auth/forgot-password` |
| `59b8b97` | API PUT `/api/auth/change-password` |
| `907268f` | API PUT `/api/auth/me` (cập nhật hồ sơ) |
| `c9b8e1d` | Hoàn thiện module Auth, ổn định runtime backend |
| `8fbdbaf` | Improve auth & user: enum role, refresh token, rate limit, xử lý P2002 |
| `dfce554` | Thêm Prisma seed + `prisma.config.ts` |
| (migration) | `20260707181800_add_reset_token` |
| (migration) | `20260707195733_add_audit_logs` |

**Sản phẩm cuối ngày**: Toàn bộ CRUD users + 6 endpoint auth (login, register, refresh, logout, forgot/change-password, update-me).

### 📅 Ngày 3 — 08/07/2026 (Backend 6 module còn lại)
| Commit | Nội dung |
|---|---|
| `9ffca89` | Module Audit Log + ghi nhật ký hành động nhạy cảm |
| `c4787a0` | Module Notification (6 API CRUD) |
| `e22cca4` | Module Upload File (4 API: upload, list, detail, delete) |
| `3eff3bf` | Module Settings (5 API CRUD, chỉ Admin) |
| `d3b45ef` | Module Dashboard (thống kê tổng quan, chỉ Admin) |
| `89b6f02` | Module Global Search (1 API tổng hợp theo keyword) |
| `805521e` | Soft Delete cho Users/Notifications/Uploads + tinh chỉnh bảo mật auth |
| (migration) | `20260708090000_user_status_enum` (ACTIVE/INACTIVE/SUSPENDED) |
| (migration) | `20260708111535_add_notifications` |
| (migration) | `20260708130108_add_upload_files` |
| (migration) | `20260708151654_add_settings` |

**Sản phẩm cuối ngày**: 8 module backend hoàn chỉnh, 38 endpoint REST, soft-delete chuẩn hóa.

### 📅 Ngày 4 — 09/07/2026 (Frontend toàn bộ + Tái cấu trúc)
| Commit | Nội dung |
|---|---|
| `e12235c` | Màn hình Đăng nhập + Đăng ký |
| `ee408e4` | Shell Admin (Sidebar/Header/Footer/AdminLayout) + gắn logo thương hiệu |
| `5b5ef77` | Quản lý người dùng + UI components generic (Card/Button/Input/Modal/Table) |
| `0cf53f1` | Dashboard Admin (kết nối `GET /dashboard/overview`) |
| `60ebf27` | Quản lý thông báo + bell dropdown trên Header |
| `8da68c6` | Nhật ký hệ thống (chỉ đọc, lọc nâng cao) |
| `b76e05d` | Quản lý tệp (UploadZone + FileIcon generic) |
| `0b1cc97` | Cài đặt hệ thống (CRUD đầy đủ) |
| `a1e7336` | Hồ sơ cá nhân (mọi role) |
| `8b37180` | Tìm kiếm toàn hệ thống |
| `0173050` | Thùng rác (Trash Manager) cho Admin |
| `79526e5` → `1db78f4` | **Tái cấu trúc thư mục frontend theo Feature-Based Architecture** |
| `c6e9fd3` → `24bebb2` | Cleanup + `.gitignore` |
| `ae52002` | Docs: cập nhật README mục 3 (feature-based) |
| (migration) | `20260709003203_add_soft_delete` |

**Sản phẩm cuối ngày**: 10 trang frontend chạy được, kiến trúc feature-based chuẩn (mỗi feature là 1 folder độc lập với `pages/components/services/...`).

### 📅 Ngày 5 — 10/07/2026 (UI Polish — đang tiếp tục)
| Commit | Nội dung |
|---|---|
| `59b4c34` | Feat: thêm "Xem hồ sơ" vào dropdown user trên Header |
| `fae9a04` | Style: chuẩn hoá CSS cho `<select>` native (bỏ style "thơ mộc" của browser) |
| `3cb02c0` | Style: Login — banner thay gradient đỏ + overlay cho chữ nổi |
| `3164b97` | Style: Login banner — bỏ chữ/logo, hiển thị ảnh contain vừa vặn |

**Đang làm**: Polish giao diện các dropdown, banner trang login, đồng bộ design tokens.

---

## 3. KIẾN TRÚC HIỆN TẠI

### 🗄️ Database — 5 bảng, 3 enum

```
User (1) ──┬── (n) AuditLog
           ├── (n) Notification
           └── (n) UploadFile

Setting (độc lập, lưu JSON string linh hoạt)
```

**Bảng `User`** (soft-delete): id, fullName, email(unique), phone, passwordHash, role (ADMIN/TEACHER/STUDENT), status (ACTIVE/INACTIVE/SUSPENDED), resetToken, refreshTokenHash, createdAt, updatedAt, **deletedAt**

**Bảng `AuditLog`**: id, userId, action, target, meta(Json), ip, userAgent, createdAt — index theo userId/action/createdAt

**Bảng `Notification`** (soft-delete): id, userId, type (INFO/SUCCESS/WARNING/ERROR), title, message, isRead, createdAt, **deletedAt**

**Bảng `UploadFile`** (soft-delete): id, originalName, storedName(unique), mimeType, size, path, uploadedById, createdAt, **deletedAt**

**Bảng `Setting`**: id, key(unique), value(JSON string), description — lưu cấu hình hệ thống linh hoạt

**8 migration** đã chạy thành công (`init_users`, `add_reset_token`, `add_audit_logs`, `user_status_enum`, `add_notifications`, `add_upload_files`, `add_settings`, `add_soft_delete`).

### 🔧 Backend (Node.js + Express + Prisma)

**Cấu trúc** (45 file JS, theo pattern controller/service/repository):
```
backend/src/
├── app.js                    # Express app config
├── server.js / server.dev.js / server.prod.js
├── config/database.js        # Prisma client singleton
├── middlewares/
│   ├── auth.middleware.js    # JWT verify
│   ├── role.middleware.js    # RBAC
│   ├── rateLimit.middleware.js
│   ├── upload.middleware.js  # Multer
│   ├── error.middleware.js   # Centralized error
│   └── notFound.middleware.js
├── utils/
│   ├── jwt.js                # sign/verify access + refresh
│   ├── softDelete.js         # Prisma extension xóa mềm
│   ├── prismaSoftDelete.js
│   └── softQuery.js
└── modules/                  # 8 module, mỗi module có controller+service+routes
    ├── auth/         (9 endpoints)
    ├── users/        (7 endpoints)
    ├── notifications/(8 endpoints)
    ├── uploads/      (6 endpoints)
    ├── settings/     (5 endpoints)
    ├── dashboard/    (1 endpoint)
    ├── search/       (1 endpoint)
    └── audit/        (1 endpoint)
```

**Tổng: 38 REST endpoint** — xem chi tiết ở mục 4.

### 🎨 Frontend (React 18 + Vite + TypeScript + CSS Modules)

**Kiến trúc Feature-Based** — mỗi feature là 1 folder độc lập:
```
frontend/src/
├── main.tsx                  # Entry, import tokens.css + global.css
├── app/
│   ├── App.tsx               # Router + RoleGuard
│   ├── routes.tsx
│   ├── providers/            # AuthProvider, QueryProvider, ToastProvider
│   └── layouts/              # AdminLayout (Sidebar/Header/Footer), AuthLayout
├── shared/
│   ├── components/ui/        # 11 component generic (Alert/Button/Card/ConfirmDialog/FileIcon/Input/Modal/Pagination/StatCard/Table/UploadZone)
│   ├── hooks/                # useAuth, useDebounce, usePagination
│   ├── lib/                  # api client (axios), query keys
│   └── types/                # User, Role, ...
├── styles/
│   ├── tokens.css            # Design tokens (màu brand, spacing, radius, shadow)
│   └── global.css            # Reset + body styles
└── features/                 # 10 feature
    ├── auth/         (LoginPage + RegisterPage)
    ├── dashboard/    (DashboardPage — StatCard + chart)
    ├── users/        (UserManagementPage + UserFormModal)
    ├── notifications/(NotificationManagementPage + NotificationFormModal)
    ├── files/        (FileManagerPage + UploadZone)
    ├── settings/     (SystemSettingsPage + 2 modal)
    ├── profile/      (ProfilePage)
    ├── search/       (GlobalSearchPage)
    ├── audit-log/    (AuditLogPage)
    └── trash/        (TrashManagerPage — khôi phục bản xóa mềm)
```

**Design System** (`tokens.css`): brand đỏ Trung Hoa (`#C8102E`), brand accent vàng gold (`#D4AF37`), neutral 5 cấp, semantic success/warning/error, spacing scale 1-12, shadow focus ring đỏ. **Mới thêm**: global rule cho `<select>` native (chevron icon, padding, focus brand color).

---

## 4. BẢNG API ĐẦY ĐỦ (38 endpoint)

### 🔐 Auth — `/api/auth` (9 endpoint)
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/register` | Tự đăng ký STUDENT/TEACHER |
| POST | `/login` | Đăng nhập, cấp access + refresh token |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Thu hồi refresh token |
| POST | `/forgot-password` | Gửi token reset qua email |
| POST | `/reset-password` | Đặt lại MK bằng token |
| PUT | `/change-password` | Đổi MK khi đã đăng nhập |
| PUT | `/me` | Cập nhật hồ sơ cá nhân |
| GET | `/me` | Lấy thông tin user hiện tại |

### 👥 Users — `/api/admin/users` (7 endpoint, chỉ Admin)
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/` | Danh sách user (filter theo role/status/keyword) |
| GET | `/:id` | Chi tiết user |
| POST | `/` | Tạo user mới (validate email, role, hash MK) |
| PUT | `/:id` | Cập nhật user |
| DELETE | `/:id` | Soft-delete user |
| PATCH | `/:id/restore` | Khôi phục từ thùng rác |
| PATCH | `/:id/status` | Khoá/mở khoá user |

### 🔔 Notifications — `/api/notifications` (8 endpoint)
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/` | Danh sách (filter isRead, type) |
| GET | `/:id` | Chi tiết |
| POST | `/` | Tạo thông báo |
| PUT | `/:id` | Cập nhật |
| DELETE | `/:id` | Soft-delete |
| PATCH | `/:id/read` | Đánh dấu đã đọc |
| PATCH | `/read-all` | Đánh dấu tất cả đã đọc |
| GET | `/unread-count` | Số thông báo chưa đọc (cho bell badge) |

### 📁 Uploads — `/api/uploads` (6 endpoint)
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/` | Upload file (multipart, Multer) |
| GET | `/` | Danh sách file (filter mimeType, uploader) |
| GET | `/:id` | Chi tiết file |
| GET | `/:id/download` | Tải xuống |
| DELETE | `/:id` | Soft-delete file |
| PATCH | `/:id/restore` | Khôi phục |

### ⚙️ Settings — `/api/settings` (5 endpoint, chỉ Admin)
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/` | Danh sách setting |
| GET | `/:key` | Lấy 1 setting theo key |
| POST | `/` | Tạo setting mới |
| PUT | `/:key` | Cập nhật |
| DELETE | `/:key` | Xoá setting |

### 📊 Dashboard — `/api/dashboard` (1 endpoint, chỉ Admin)
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/overview` | Tổng quan: tổng user theo role, notification chưa đọc, file uploads, audit 24h |

### 🔍 Search — `/api/search` (1 endpoint)
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/?q=...` | Tìm kiếm tổng hợp user/notification/file theo keyword |

### 📝 Audit Log — `/api/audit-logs` (1 endpoint, chỉ Admin)
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/` | Danh sách log (filter userId/action/fromDate/toDate) — chỉ đọc |

---

## 5. TÍNH NĂNG THEO ROLE

| Tính năng | STUDENT | TEACHER | ADMIN |
|---|:---:|:---:|:---:|
| Đăng ký/Đăng nhập/Quên MK | ✅ | ✅ | ✅ |
| Xem/Sửa hồ sơ cá nhân | ✅ | ✅ | ✅ |
| Đổi mật khẩu | ✅ | ✅ | ✅ |
| Xem thông báo của mình | ✅ | ✅ | ✅ |
| Tìm kiếm toàn hệ thống | ✅ | ✅ | ✅ |
| Upload/Download file | ✅ | ✅ | ✅ |
| Xem nhật ký hệ thống | ❌ | ❌ | ✅ |
| Quản lý user (CRUD) | ❌ | ❌ | ✅ |
| Quản lý thông báo (broadcast) | ❌ | ❌ | ✅ |
| Cài đặt hệ thống | ❌ | ❌ | ✅ |
| Dashboard tổng quan | ❌ | ❌ | ✅ |
| Thùng rác (khôi phục) | ❌ | ❌ | ✅ |

---

## 6. ĐÃ HOÀN THÀNH ✅

### Backend
- ✅ 8 module, 38 REST endpoint
- ✅ JWT access + refresh token rotation
- ✅ RBAC theo 3 role (ADMIN/TEACHER/STUDENT)
- ✅ Rate-limit (chống brute-force login)
- ✅ Soft-delete 3 bảng (User, Notification, UploadFile) + utility tái sử dụng
- ✅ Prisma seed data
- ✅ Audit log tự động cho hành động nhạy cảm (login, CRUD user, settings, upload, notification)
- ✅ Error middleware chuẩn hoá response
- ✅ 8 Prisma migration đã chạy

### Frontend
- ✅ 10 trang đầy đủ CRUD + filter + pagination + search
- ✅ 11 component UI generic (Card/Button/Input/Modal/Table/Pagination/Alert/StatCard/ConfirmDialog/FileIcon/UploadZone)
- ✅ Layout Admin (Sidebar + Header có user dropdown + Footer)
- ✅ Auth guard theo role
- ✅ Token refresh tự động (axios interceptor)
- ✅ Bell notification realtime (polling)
- ✅ Kiến trúc feature-based sạch (10 feature độc lập)
- ✅ Design system tokens (màu brand đỏ Trung Hoa + accent vàng gold)
- ✅ Global rule cho `<select>` native (chevron icon, focus state)
- ✅ Trang Login có banner Trung Hoa cổ điển

---

## 7. ĐANG LÀM 🟡

### UI/UX Polish (giai đoạn hiện tại)
- 🟡 Đồng bộ style `<select>` native — commit `fae9a04`
- 🟡 Banner trang Login — commit `3cb02c0`, `3164b97`
- 🟡 Dropdown user trên Header — commit `59b4c34`
- ⏳ Kiểm tra responsive trên tablet/mobile
- ⏳ Loading skeleton cho table/card
- ⏳ Empty state đồng bộ các trang
- ⏳ Animation transition giữa các trang

---

## 8. CHƯA LÀM ❌ (backlog)

### Ưu tiên cao
- ❌ **Testing**: Unit test (Vitest), Integration test (Supertest), E2E test (Playwright)
- ❌ **Validation chặt hơn**: Zod schema cho input, rate-limit per endpoint
- ❌ **Error boundary** ở React
- ❌ **404 + 500 page** đẹp

### Ưu tiên trung bình
- ❌ **Pagination server-side** thực sự (hiện đang client-side filter)
- ❌ **Export CSV/Excel** cho user management, audit log
- ❌ **Notification realtime** (WebSocket/SSE) thay vì polling
- ❌ **Email service** thật (hiện forgot-password chỉ log token ra console)
- ❌ **Upload lên cloud** (S3/Cloudinary) thay vì local disk

### Ưu tiên thấp
- ❌ **i18n** (đa ngôn ngữ Việt/Anh)
- ❌ **Dark mode**
- ❌ **PWA** (offline support)
- ❌ **Deploy** (Vercel + Railway/Render)
- ❌ **CI/CD** (GitHub Actions)
- ❌ **Docker Compose** cho dev

---

## 9. ĐÁNH GIÁ & RỦI RO

### 💪 Điểm mạnh
- **Backend chuẩn chỉnh**: phân lớp controller/service/repository rõ ràng, dễ mở rộng
- **Soft-delete chuẩn hoá**: utility tái sử dụng, có Thùng rác UI để khôi phục
- **RBAC đầy đủ** ngay từ đầu, không phải refactor lại
- **Feature-based frontend** giúp scale tốt khi thêm module mới (Classes, Lessons, Attendance...)

### ⚠️ Rủi ro / Điểm yếu
- **Chưa có test** — refactor sau này sẽ rất rủi ro
- **Pagination client-side** — khi data lớn (>1000 records) sẽ chậm
- **Email chưa thật** — forgot-password chưa gửi được email
- **Upload local disk** — không scale, không backup
- **Không có CI** — phải build thủ công, dễ deploy thiếu

### 🎯 Đề xuất ưu tiên tuần tới
1. **Viết test cho backend services** (unit test với Vitest) — quan trọng nhất
2. **Pagination server-side** cho User/Notification/Audit
3. **Email service** thật (gmail SMTP hoặc SendGrid free tier)
4. **Loading skeleton + empty state** đồng bộ
5. **Responsive mobile** cho toàn bộ 10 trang

---

## 10. TÓM TẮT 1 DÒNG

> **MVP Zhong Ruan LMS đã chạy được end-to-end** (backend 38 API + frontend 10 trang + auth/RBAC/soft-delete đầy đủ) sau 4 ngày phát triển; hiện đang ở **giai đoạn 5 (UI polish)** và **chưa có test/deploy** — cần ưu tiên viết test + email thật + deploy production trước khi mở rộng tính năng mới.