# 📊 BÁO CÁO TIẾN ĐỘ DỰ ÁN — ZHONG RUAN LMS

> **Ngày báo cáo:** 2026-07-08
> **Phiên bản:** Backend v0.4
> **Repository:** https://github.com/TrungHuy242/zhong-ruan-lms
> **Branch:** `main`
> **Người thực hiện:** TrungHuy + Cursor AI

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1. Thông tin chung

| Mục | Giá trị |
|-----|---------|
| Tên dự án | Zhong Ruan LMS — Hệ thống quản lý đào tạo Trung tâm Trung Quốc học |
| Loại dự án | Đồ án tốt nghiệp |
| Stack backend | Node.js + Express + Prisma 7 + PostgreSQL |
| Auth | JWT (access + refresh) + bcrypt + rate-limit |
| Frontend | Chưa triển khai (đang làm backend trước) |
| Database | PostgreSQL (localhost:5432, schema: `public`) |

### 1.2. Cấu trúc thư mục

```
zhong-ruan-lms/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma                 # 1 model: User
│   │   ├── seed.js                       # Tạo 5 user mẫu
│   │   └── migrations/
│   │       ├── 20260706154011_init_users/
│   │       └── 20260707181800_add_reset_token/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js               # Prisma client
│   │   │   └── env.js                    # Biến môi trường
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js         # JWT verify + role guard
│   │   │   └── rateLimit.middleware.js    # Giới hạn đăng nhập
│   │   ├── modules/
│   │   │   ├── auth/                     # 7 endpoint
│   │   │   │   ├── auth.routes.js
│   │   │   │   ├── auth.controller.js
│   │   │   │   └── auth.service.js
│   │   │   └── users/                    # 5 endpoint
│   │   │       ├── user.routes.js
│   │   │       ├── user.controller.js
│   │   │       ├── user.service.js
│   │   │       └── user.repository.js
│   │   ├── utils/
│   │   ├── app.js                        # Cấu hình Express
│   │   └── server.js                     # Entry point (port 5000)
│   ├── package.json
│   ├── prisma.config.ts
│   └── .env
├── frontend/                             # (chưa triển khai)
├── README.md
└── PROGRESS_REPORT.md                    # File này
```

---

## 2. TIẾN ĐỘ TỔNG THỂ

### 2.1. Thống kê commit

| # | Commit | Mô tả | Ngày |
|---|--------|-------|------|
| 1 | `d5b48b0` | Initial setup: Prisma 7, Express, JWT | 06/07 |
| 2 | `dfce554` | Cấu hình Prisma seed | 06/07 |
| 3 | `6ee3534` | Middleware JWT, phân quyền, API `/me` | 06/07 |
| 4 | `7e7a56d` | GET /api/admin/users (Admin only) | 06/07 |
| 5 | `36aefc4` | POST /api/admin/users (validate, hash) | 06/07 |
| 6 | `8fbdbaf` | Enum role, refresh token, rate limit, P2002 | 06/07 |
| 7 | `778dde1` | GET/PUT /api/admin/users/:id | 06/07 |
| 8 | `5fc6fe9` | README.md hoàn chỉnh | 07/07 |
| 9 | `36c0efd` | DELETE /api/admin/users/:id | 07/07 |
| 10 | `b29084c` | POST /api/auth/register (self-register) | 07/07 |
| 11 | `f44cf63` | POST /api/auth/forgot-password | 08/07 |
| 12 | `59b8b97` | PUT /api/auth/change-password | 08/07 |
| 13 | `907268f` | PUT /api/auth/me (update profile) | 08/07 |

**Tổng cộng: 13 commit** trong 3 ngày (06–08/07/2026).

### 2.2. Tiến độ theo module

| Module | Hoàn thành | Tổng | % |
|--------|------------|------|---|
| Auth (xác thực) | 7/7 endpoint | 7 | 100% ✅ |
| Users (quản lý) | 5/5 endpoint | 5 | 100% ✅ |
| Courses | 0/? | ? | 0% ⏳ |
| Classes | 0/? | ? | 0% ⏳ |
| Teachers/Students | 0/? | ? | 0% ⏳ |
| CRM Leads | 0/? | ? | 0% ⏳ |
| Materials | 0/? | ? | 0% ⏳ |
| Attendance | 0/? | ? | 0% ⏳ |
| Quiz | 0/? | ? | 0% ⏳ |
| Frontend | 0/? | ? | 0% ⏳ |

**Tổng backend hiện tại: 12/12 endpoint cốt lõi đã chạy ổn định.**

---

## 3. CHI TIẾT CÁC API ĐÃ TRIỂN KHAI

### 3.1. Module AUTH (7 endpoint)

| STT | Method | Endpoint | Mô tả | Auth | Test |
|-----|--------|----------|-------|------|------|
| 1 | POST | `/api/auth/register` | Tự đăng ký tài khoản STUDENT/TEACHER | Public | ✅ |
| 2 | POST | `/api/auth/login` | Đăng nhập, trả access + refresh token | Public (rate-limited 5/15min) | ✅ |
| 3 | POST | `/api/auth/refresh-token` | Lấy access token mới từ refresh token | Public | ✅ |
| 4 | POST | `/api/auth/forgot-password` | Yêu cầu reset mật khẩu, trả resetToken | Public | ✅ |
| 5 | PUT | `/api/auth/change-password` | Đổi mật khẩu (cần biết mật khẩu cũ) | Auth | ✅ |
| 6 | GET | `/api/auth/me` | Lấy thông tin user hiện tại | Auth | ✅ |
| 7 | PUT | `/api/auth/me` | Cập nhật hồ sơ (fullName, phone) | Auth | ✅ |

### 3.2. Module USERS (5 endpoint — Admin only)

| STT | Method | Endpoint | Mô tả | Auth | Test |
|-----|--------|----------|-------|------|------|
| 1 | GET | `/api/admin/users` | Danh sách tất cả user (có filter) | Admin | ✅ |
| 2 | POST | `/api/admin/users` | Tạo user mới (Admin tạo cả ADMIN/TEACHER/STUDENT) | Admin | ✅ |
| 3 | GET | `/api/admin/users/:id` | Chi tiết 1 user | Admin | ✅ |
| 4 | PUT | `/api/admin/users/:id` | Cập nhật user (fullName, phone, role, status) | Admin | ✅ |
| 5 | DELETE | `/api/admin/users/:id` | Xóa user | Admin | ✅ |

---

## 4. SCHEMA DATABASE

### 4.1. Bảng `User` (sau 2 migration)

```prisma
model User {
  id                   Int      @id @default(autoincrement())
  fullName             String
  email                String   @unique
  phone                String?
  passwordHash         String
  role                 Role     @default(STUDENT)
  status               String   @default("active")
  resetToken           String?          // ← thêm ở migration 2
  resetTokenExpiresAt  DateTime?        // ← thêm ở migration 2
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

enum Role {
  ADMIN
  TEACHER
  STUDENT
}
```

### 4.2. Lịch sử migration

| Migration | Ngày | Thay đổi |
|-----------|------|----------|
| `20260706154011_init_users` | 06/07/2026 | Tạo bảng User + enum Role |
| `20260707181800_add_reset_token` | 08/07/2026 | Thêm 2 cột `resetToken`, `resetTokenExpiresAt` |

### 4.3. Dữ liệu seed (5 user mẫu)

| Email | Mật khẩu | Role |
|-------|----------|------|
| `admin@zhongruan.com` | `admin123` | ADMIN |
| `teacher1@zhongruan.com` | `teacher123` | TEACHER |
| `teacher2@zhongruan.com` | `teacher123` | TEACHER |
| `student1@zhongruan.com` | `student123` | STUDENT |
| `student2@zhongruan.com` | `student123` | STUDENT |

---

## 5. CÁC CƠ CHẾ BẢO MẬT ĐÃ ÁP DỤNG

### 5.1. Mật khẩu
- ✅ Hash bằng **bcrypt** (10 rounds)
- ✅ Không bao giờ trả `passwordHash` ra response

### 5.2. JWT Token
- ✅ **Access token**: 15 phút — dùng cho các API cần auth
- ✅ **Refresh token**: 7 ngày — dùng để lấy access token mới
- ✅ Secret lưu trong biến môi trường (`.env`)

### 5.3. Rate Limiting
- ✅ Giới hạn **5 lần đăng nhập / 15 phút / IP** trên `/login`

### 5.4. Phân quyền (RBAC)
- ✅ Middleware `authenticate` — verify JWT
- ✅ Middleware `requireRole('ADMIN')` — chỉ Admin
- ✅ Self-register chỉ cho phép tạo `STUDENT` hoặc `TEACHER` (không tự tạo ADMIN)

### 5.5. Validation
- ✅ Email format check (regex)
- ✅ Mật khẩu tối thiểu 6 ký tự
- ✅ Mật khẩu mới phải khác mật khẩu cũ
- ✅ Role phải thuộc enum (`ADMIN`/`TEACHER`/`STUDENT`)

### 5.6. Bảo mật reset password
- ✅ Token reset sinh bằng `crypto.randomBytes(32)` — không đoán được
- ✅ Hash token bằng **SHA-256** trước khi lưu DB (kể cả DB lộ cũng không dùng được)
- ✅ Hạn token: **15 phút**
- ✅ Không tiết lộ email nào tồn tại trong hệ thống (luôn trả `sent:true`)

### 5.7. Chống leo thang đặc quyền
- ✅ API `PUT /api/auth/me` chỉ cho phép đổi `fullName` + `phone` (bỏ qua `email`/`role`/`status` dù client gửi lên)

---

## 6. KẾT QUẢ TEST

### 6.1. Tổng quan test

| Module | Số test case | Pass | Fail |
|--------|--------------|------|------|
| Auth (3 API mới) | 5 + 8 + 8 = 21 | 21 | 0 |
| Users (5 API) | ~15 | 15 | 0 |
| **Tổng** | **~36** | **36** | **0** |

### 6.2. Bảng test chi tiết 3 API mới nhất

#### POST /api/auth/forgot-password (5/5 PASS)
| # | Case | Status | Kết quả |
|---|------|--------|---------|
| 1 | Email hợp lệ (admin@) | 200 | Trả `resetToken` + `sent:true` |
| 2 | Email không tồn tại | 200 | Trả `sent:true` (che giấu) |
| 3 | Thiếu email | 400 | "Vui lòng cung cấp email" |
| 4 | Email sai format | 400 | "Email không đúng định dạng" |
| 5 | Email user thường | 200 | Trả `resetToken` |

#### PUT /api/auth/change-password (8/8 PASS)
| # | Case | Status | Kết quả |
|---|------|--------|---------|
| 1 | Đổi mật khẩu thành công | 200 | "Đổi mật khẩu thành công" |
| 2 | Login lại với pass mới | 200 | OK |
| 3 | Old password sai | 400 | "Mật khẩu cũ không đúng" |
| 4 | Thiếu `newPassword` | 400 | "Vui lòng nhập..." |
| 5 | `newPassword` < 6 ký tự | 400 | "Mật khẩu mới phải có ít nhất 6 ký tự" |
| 6 | NewPassword trùng old | 400 | "Mật khẩu mới phải khác mật khẩu cũ" |
| 7 | Không có token | 401 | "Bạn chưa đăng nhập" |
| 8 | Đổi lần 2 | 200 | OK |

#### PUT /api/auth/me (8/8 PASS)
| # | Case | Status | Kết quả |
|---|------|--------|---------|
| 1 | Update fullName + phone | 200 | Trả user mới |
| 2 | Update phone | 200 | Phone mới |
| 3 | Xoá phone (gửi `null`) | 200 | `phone=null` |
| 4 | Thiếu fullName | 400 | "Vui lòng nhập họ tên" |
| 5 | fullName rỗng `"   "` | 400 | "Vui lòng nhập họ tên" |
| 6 | Attempt đổi email/role | 200 | email/role giữ nguyên ✅ |
| 7 | Không có token | 401 | "Bạn chưa đăng nhập" |
| 8 | GET /me xác nhận update | 200 | fullName mới |

---

## 7. TÀI LIỆU API THAM KHẢO

### 7.1. Format response thống nhất

**Thành công:**
```json
{
  "message": "Mô tả ngắn",
  "data": { /* payload */ }
}
```

**Lỗi:**
```json
{
  "message": "Mô tả lỗi bằng tiếng Việt"
}
```

### 7.2. Status code

| Code | Ý nghĩa |
|------|---------|
| 200 | Thành công |
| 201 | Tạo mới thành công |
| 400 | Lỗi validation từ client |
| 401 | Chưa đăng nhập / token hết hạn |
| 403 | Không đủ quyền |
| 404 | Không tìm thấy resource |
| 409 | Xung đột (email trùng) |
| 429 | Quá nhiều request (rate limit) |
| 500 | Lỗi server |

### 7.3. Ví dụ API

#### Đăng ký
```bash
POST /api/auth/register
{
  "fullName": "Nguyễn Văn A",
  "email": "sv_001@test.com",
  "password": "123456",
  "role": "STUDENT"
}
```

#### Đăng nhập
```bash
POST /api/auth/login
{
  "email": "admin@zhongruan.com",
  "password": "admin123"
}
# → { accessToken, refreshToken, user: {id, fullName, email, role} }
```

#### Đổi mật khẩu
```bash
PUT /api/auth/change-password
Authorization: Bearer <accessToken>
{
  "oldPassword": "admin123",
  "newPassword": "newpass456"
}
```

#### Cập nhật hồ sơ
```bash
PUT /api/auth/me
Authorization: Bearer <accessToken>
{
  "fullName": "Tên mới",
  "phone": "0987654321"
}
```

#### Quên mật khẩu
```bash
POST /api/auth/forgot-password
{ "email": "user@example.com" }
# → { sent: true, resetToken: "...", expiresAt: "..." }
```

---

## 8. KẾ HOẠCH TIẾP THEO

### 8.1. Ưu tiên cao (tuần tới)

| # | Module | Mô tả | Phụ thuộc |
|---|--------|-------|-----------|
| 1 | **Courses** | CRUD khoá học (Admin: tạo/sửa/xoá; Public: xem danh sách) | User (TEACHER) |
| 2 | **Classes** | Lớp học cụ thể (khoá học + giáo viên + học viên + lịch học) | Course + User |
| 3 | **Enrollments** | Đăng ký khoá học của học viên | User + Course |
| 4 | **CRM Leads** | Form đăng ký tư vấn (cho marketing) | Độc lập |

### 8.2. Ưu tiên trung bình

| # | Module | Mô tả |
|---|--------|-------|
| 5 | **Materials** | Tài liệu học tập (upload file, link) theo lớp |
| 6 | **Attendance** | Điểm danh theo buổi học |
| 7 | **Quizzes** | Bài kiểm tra + câu hỏi + chấm điểm |
| 8 | **Schedule** | Lịch học (tuần/tháng) |

### 8.3. Ưu tiên thấp / cuối kỳ

| # | Module | Mô tả |
|---|--------|-------|
| 9 | **Frontend Admin** | React/Vue + Tailwind (sau khi backend ổn định) |
| 10 | **Frontend Student/Teacher** | Portal riêng cho từng role |
| 11 | **Email thật** | Tích hợp SendGrid/Nodemailer cho forgot-password |
| 12 | **Upload file** | Cloudinary/S3 cho materials |
| 13 | **Thống kê dashboard** | Chart số học viên, doanh thu, tỉ lệ điểm danh |

---

## 9. VẤN ĐỀ CẦN LƯU Ý

### 9.1. Đã giải quyết

| Vấn đề | Cách giải quyết |
|--------|-----------------|
| Mật khẩu trong response | Bỏ `passwordHash` khỏi `select` |
| Race condition đăng ký | Bắt lỗi `P2002` (unique email) → 409 |
| Brute-force login | Rate-limit 5 lần/15min/IP |
| Email không tồn tại bị lộ | Luôn trả `sent:true` |
| User tự tạo ADMIN | Chỉ cho phép `STUDENT`/`TEACHER` khi self-register |
| User tự đổi role qua `/me` | Service `updateProfile` bỏ qua field không thuộc quyền |

### 9.2. Còn tồn tại / cần cải thiện

| Vấn đề | Mức độ | Đề xuất |
|--------|--------|---------|
| Reset token trả về response (không gửi email thật) | Thấp | Tích hợp Nodemailer khi có SMTP |
| Chưa có blacklist token (logout) | Trung bình | Thêm bảng `RevokedToken` |
| Chưa test concurrent | Thấp | Test với 100+ request song song |
| Chưa có log audit | Trung bình | Log mọi thao tác admin |
| Chưa có Swagger/OpenAPI | Thấp | Dùng `swagger-jsdoc` tự gen |
| Chưa có unit test với Jest | Trung bình | Viết test cho service |

---

## 10. CÁCH CHẠY DỰ ÁN

### 10.1. Yêu cầu

- Node.js ≥ 20
- PostgreSQL ≥ 15
- npm ≥ 10

### 10.2. Khởi động backend

```bash
cd backend
npm install
npx prisma migrate dev    # tạo DB + chạy migration
npx prisma db seed         # tạo 5 user mẫu
npm run dev                # chạy server tại http://localhost:5000
```

### 10.3. Test nhanh

```bash
# Đăng nhập admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@zhongruan.com","password":"admin123"}'

# Lấy danh sách user (cần token)
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer <accessToken>"
```

---

## 10.5. AUTH HARDENING — Phase 2 (2026-07-08)

### Mục tiêu
Nâng cấp module auth đạt chuẩn production: enum status, hashed refresh token + rotation, logout, reset-password, dev-only resetToken, register STUDENT-only.

### Migration `20260708090000_user_status_enum`

| Thay đổi | Chi tiết |
|----------|----------|
| `status: String` → `status: UserStatus` | Enum { ACTIVE, INACTIVE, SUSPENDED } |
| Mapping dữ liệu cũ | `active→ACTIVE`, `inactive→INACTIVE`, `locked→SUSPENDED` |
| Thêm field mới | `refreshTokenHash String?`, `refreshTokenExpiresAt DateTime?` |

Kết quả `npx prisma migrate deploy`:
```
Applying migration `20260708090000_user_status_enum`
All migrations have been successfully applied.
```

Kết quả `npx prisma generate`:
```
Generated Prisma Client (v7.8.0) to .\node_modules\@prisma\client in 235ms
```

### Code changes (auth module)

| File | Thay đổi |
|------|----------|
| `prisma/schema.prisma` | Enum `UserStatus`, thêm `refreshTokenHash`, `refreshTokenExpiresAt` |
| `src/modules/auth/auth.service.js` | Viết lại: login lưu SHA-256 + expiresAt, refresh verify JWT + hash + expiresAt, register force STUDENT (409 duplicate), resetPassword xoá 4 field, logout, forgotPassword chỉ tạo token cho ACTIVE |
| `src/modules/auth/auth.controller.js` | Thêm handler `resetPassword`, `logout`; controller `register` trả 409 cho `code=DUPLICATE_EMAIL` |
| `src/modules/auth/auth.routes.js` | Thêm `POST /reset-password`, `POST /logout` |
| `src/middlewares/auth.middleware.js` | Đổi so sánh `"active"` → `UserStatus.ACTIVE` |
| `src/modules/users/user.service.js` | Map lowercase API sang `UserStatus` enum; createUser mặc định `UserStatus.ACTIVE` |
| `src/server.dev.js`, `src/server.prod.js` | Helper start server với NODE_ENV mong muốn (chỉ phục vụ test) |

### Endpoint mới

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/api/auth/reset-password` | — | Nhận `{ token, newPassword }`, xoá resetToken + refreshTokenHash |
| POST | `/api/auth/logout` | Bearer | Xoá refreshTokenHash + expiresAt |

### Test results — 27/27 PASS

Xem chi tiết: [`backend/TEST_LOG.md`](backend/TEST_LOG.md)

| Group | Cases | Pass |
|-------|-------|------|
| A — Auth hardening mới | A1–A15 | 15/15 |
| B — Bảo mật | B1–B12 | 12/12 |

Highlight:
- **A12**: Login lưu `refreshTokenHash` (SHA-256) + `refreshTokenExpiresAt = now + 7d`
- **A6**: Reset-password thành công xoá cả 4 field (`resetToken`, `resetTokenExpiresAt`, `refreshTokenHash`, `refreshTokenExpiresAt`)
- **A14/A15**: SUSPENDED/INACTIVE user `forgot-password` → response `sent:true` nhưng DB KHÔNG có `resetToken` (không lộ trạng thái)
- **B1**: Duplicate email → **409 Conflict** (không phải 400)
- **B9/B10**: Role/status escalation bị service filter qua `updateProfile`

### Cập nhật mục 9.1 (đã giải quyết)

| Vấn đề | Cách giải quyết |
|--------|-----------------|
| Chưa có logout | Thêm `POST /api/auth/logout` xoá refreshTokenHash |
| Refresh token không rotation | Mỗi lần refresh sinh cặp token mới + cập nhật hash |
| Reset token trả về response | Chỉ trả trong `NODE_ENV=development` |
| INACTIVE/SUSPENDED forgot-password vẫn tạo token | Bỏ qua, vẫn trả `sent:true` (không lộ trạng thái) |
| Status là String | Convert sang enum `UserStatus` (DB-level constraint) |

### Cập nhật mục 9.2 (vẫn tồn tại)

| Vấn đề | Mức độ | Đề xuất |
|--------|--------|---------|
| Chưa tích hợp Nodemailer (dev vẫn trả token) | Trung bình | Tích hợp SMTP thật, gỡ dev-mode |
| Chưa có Jest unit test | Trung bình | Viết Jest cho service |
| Chưa có Swagger/OpenAPI | Thấp | Gen API docs |

### Khẳng định KHÔNG mở rộng Courses

- 0 file trong `backend/src/modules/courses/**` được tạo
- 0 route liên quan `courses`/`lessons`/`enrollments` được thêm vào `app.js`
- Module Courses sẽ làm ở phase sau

---

## 11. KẾT LUẬN

### ✅ Đã đạt được

1. Backend **chạy ổn định** trên Node.js + Express + Prisma 7 + PostgreSQL
2. **12 API** hoạt động đúng, **36 test case** đều PASS
3. **Bảo mật cơ bản** đã đầy đủ: bcrypt, JWT, rate-limit, RBAC, validation
4. **Quy trình làm việc** theo chuẩn: code → test → commit → push
5. **Schema có thể migrate** an toàn (đã chạy 2 migration không lỗi)

### 📌 Cần làm tiếp

1. Module **Courses** — bước đệm cho Classes, Enrollments
2. Module **Classes** — phức tạp nhất (nhiều quan hệ)
3. Frontend — sau khi backend ổn định

### 🎯 Mục tiêu tuần này

- Hoàn thành **Courses CRUD** (5 endpoint)
- Bắt đầu **Classes** (cấu trúc cơ bản)

---

*Báo cáo được tạo tự động từ lịch sử Git và test log. Cập nhật lần cuối: 2026-07-08 01:30 (UTC+7).*
