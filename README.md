# Hệ thống quản lý và học trực tuyến — Trung tâm Tiếng Trung Zhong Ruan

> Đồ án tốt nghiệp — Xây dựng website quản lý và học trực tuyến cho Trung tâm Tiếng Trung Zhong Ruan.

[![Backend](https://img.shields.io/badge/backend-Node.js%20%2B%20Express%205-339933?logo=node.js)]()
[![Database](https://img.shields.io/badge/database-PostgreSQL-336791?logo=postgresql)]()
[![ORM](https://img.shields.io/badge/orm-Prisma%207-2D3748?logo=prisma)]()
[![License](https://img.shields.io/badge/license-ISC-blue.svg)]()

---

## 1. Giới thiệu dự án

Đây là đồ án tốt nghiệp **Xây dựng hệ thống quản lý và học trực tuyến cho Trung tâm Tiếng Trung Zhong Ruan** — phục vụ 4 nhóm người dùng chính: **khách vãng lai**, **học viên**, **giáo viên**, **quản trị viên**.

Phiên bản 1 chưa tích hợp AI, kiến trúc được thiết kế mở để bổ sung AI luyện phát âm, chatbot học tập và cá nhân hóa lộ trình trong phiên bản 2.

### Thông tin chung

| Mục | Nội dung |
|-----|----------|
| Sinh viên thực hiện | Trương Minh Trung Huy |
| Chuyên ngành | Công nghệ thông tin |
| Đơn vị khảo sát | Trung tâm Tiếng Trung Zhong Ruan |
| Công nghệ dự kiến | Node.js, ReactJS, PostgreSQL |
| Phạm vi | Website quản lý và học trực tuyến, chưa tích hợp AI ở phiên bản 1 |
| Thời gian thực hiện | 4 tháng |
| Mức độ hoàn thiện | Mức 2 — có thể bàn giao cho trung tâm sử dụng sau khi tinh chỉnh |

---

## 2. Công nghệ sử dụng

| Hạng mục | Quyết định |
|----------|------------|
| Backend | Node.js, ưu tiên Express.js hoặc NestJS (hiện dùng **Express 5**) |
| Frontend | ReactJS, website responsive, chưa làm mobile app riêng |
| Database | **PostgreSQL** thông qua Prisma ORM |
| Quy mô nhân sự | Một sinh viên thực hiện |
| Thời gian | 4 tháng |
| AI | Chưa đưa vào phiên bản 1; ghi vào hướng phát triển phiên bản 2 |

---

## 3. Cấu trúc thư mục

```
zhong-ruan-lms/
├── backend/                # Node.js + Express 5 + Prisma 7
│   ├── prisma/
│   │   ├── migrations/      # Lịch sử migration
│   │   ├── schema.prisma    # Khai báo model User, Role
│   │   └── seed.js          # Seed admin, teacher, student mẫu
│   ├── src/
│   │   ├── config/          # Cấu hình môi trường, JWT, Prisma client
│   │   ├── middlewares/     # authenticate, authorizeRoles, rateLimit
│   │   ├── modules/
│   │   │   ├── auth/        # Đăng nhập / JWT
│   │   │   └── users/       # CRUD user (Admin)
│   │   ├── utils/           # Hàm tiện ích chung
│   │   ├── app.js
│   │   └── server.js
│   ├── uploads/             # Tài liệu học tập (giai đoạn đồ án)
│   ├── .env.example
│   └── package.json
├── frontend/               # ReactJS + Vite + TypeScript
│   └── src/
│       ├── main.tsx          # Điểm vào React (BrowserRouter + StrictMode)
│       ├── App.tsx           # Khai báo route + lazy pages
│       ├── styles/           # reset.css, tokens.css (biến CSS dùng chung)
│       ├── shared/           # Tài nguyên dùng chung, KHÔNG phụ thuộc feature cụ thể
│       │   ├── components/
│       │   │   ├── ui/       # Design system: Button, Input, Table, Pagination, Modal,
│       │   │   │             #   Alert, Card, ConfirmDialog, StatCard, FileIcon, UploadZone
│       │   │   ├── layout/   # Header, Sidebar, Footer, AdminLayout
│       │   │   └── guards/   # ProtectedRoute (kiểm tra đăng nhập + role)
│       │   ├── lib/          # api.ts (apiFetch chung), authStorage, NotificationContext, fileValidation
│       │   ├── hooks/        # Custom hooks dùng chung (useDebounce, usePagination, ...)
│       │   ├── types/        # Kiểu dữ liệu dùng chung
│       │   └── utils/        # Hàm tiện ích: formatDate, formatFileSize, ...
│       ├── features/         # Mỗi feature tự bọc Page + API + Modal + types riêng
│       │   ├── auth/         # LoginPage, RegisterPage, authApi
│       │   ├── dashboard/    # DashboardPage, dashboardApi
│       │   ├── users/        # UserManagementPage, userApi, UserFormModal, UserDetailModal
│       │   ├── notifications/# NotificationManagementPage, notificationApi,
│       │   │                 #   NotificationFormModal, NotificationDetailModal
│       │   ├── files/        # FileManagerPage, fileApi, FileDetailModal
│       │   ├── audit-log/    # AuditLogPage, auditLogApi, AuditLogDetailModal
│       │   ├── settings/     # SystemSettingsPage, settingApi, SettingModal, SettingDetailModal
│       │   ├── profile/      # ProfilePage, profileApi, ChangePasswordModal
│       │   ├── search/       # GlobalSearchPage, searchApi
│       │   └── trash/        # TrashManagerPage, trashApi
│       └── app/              # Cross-cutting (sẽ mở rộng theo vai trò)
│           └── routes/       # Cấu hình route tập trung (nếu tách khỏi App.tsx)
└── README.md
```

---

## 4. Yêu cầu hệ thống

Trước khi cài đặt, hãy chuẩn bị:

- **Node.js** >= 18.x (khuyến nghị 20 LTS)
- **npm** >= 9.x
- **PostgreSQL** >= 14 (có thể dùng Supabase / Neon / Railway ở môi trường production)
- **Git** để clone source

---

## 5. Hướng dẫn cài đặt & chạy

### 5.1. Clone dự án

```bash
git clone https://github.com/TrungHuy242/zhong-ruan-lms.git
cd zhong-ruan-lms
```

### 5.2. Khởi tạo Backend

```bash
cd backend
cp .env.example .env       # Windows: copy .env.example .env
npm install
```

Mở file `.env` và chỉnh thông tin kết nối:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/zhong_ruan_lms?schema=public"
JWT_ACCESS_SECRET="your_access_secret_here"
JWT_REFRESH_SECRET="your_refresh_secret_here"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=5000
```

Chạy migration + seed dữ liệu mẫu:

```bash
npx prisma migrate dev
npx prisma db seed
```

Khởi động server phát triển:

```bash
npm run dev
# Server: http://localhost:5000
```

Các lệnh hữu ích:

```bash
npm run dev          # Chạy với nodemon (auto reload)
npm start            # Chạy production
npm run prisma:migrate
npm run prisma:studio   # Mở Prisma Studio xem DB
```

### 5.3. Khởi tạo Frontend (sẽ triển khai ở bước kế tiếp)

```bash
cd ../frontend
npm install
npm run dev
# Web: http://localhost:5173
```

---

## 6. Tài khoản mẫu (seed)

Sau khi chạy `npx prisma db seed`, hệ thống tạo sẵn:

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin | `admin@zhongruan.com` | `Admin@123` |
| Giáo viên | `teacher@zhongruan.com` | `Teacher@123` |
| Học viên | `student@zhongruan.com` | `Student@123` |

> Lưu ý: thay đổi mật khẩu ngay khi triển khai thật.

---

## 7. Phạm vi chức năng (phiên bản 1)

| Nhóm chức năng | Có trong v1 | Ghi chú |
|----------------|------------|---------|
| Website giới thiệu | Có | Dành cho khách vãng lai |
| Đăng ký tư vấn/học thử | Có | Đưa vào CRM |
| Quản lý học viên | Có | Hồ sơ, trình độ, lớp, trạng thái học |
| Quản lý giáo viên | Có | Chuyên môn, lớp phụ trách |
| Quản lý khóa học/lớp học | Có | HSK, giao tiếp, 1-1, lớp nhóm |
| Lịch học | Có | Có trạng thái buổi học |
| Điểm danh | Có | Theo buổi |
| Tài liệu học tập | Có | PDF, video, audio, link |
| Bài tập & bài kiểm tra | Có | Trắc nghiệm và tự luận cơ bản |
| Thanh toán | Cơ bản | Lưu lịch sử học phí, chưa tích hợp cổng thanh toán |
| Báo cáo thống kê | Có | Dashboard admin |
| AI luyện phát âm/chatbot | Không | Đưa vào hướng phát triển phiên bản 2 |

---

## 8. Nhóm người dùng & quyền hạn

| Vai trò | Mô tả | Quyền chính |
|---------|-------|-------------|
| **Guest** (Khách vãng lai) | Người chưa đăng nhập | Xem khóa học, tin tức, giáo viên, đăng ký tư vấn, làm test đầu vào |
| **Student** (Học viên) | Người đã đăng ký khóa học và có tài khoản | Học online, xem lịch, tài liệu, làm bài tập, xem điểm & tiến độ |
| **Teacher** (Giáo viên) | Người giảng dạy được phân công lớp | Quản lý lớp, điểm danh, giao bài, chấm bài, theo dõi tiến độ |
| **Admin** (Quản trị viên) | Người vận hành hệ thống | Quản lý dữ liệu, CRM, phân quyền, báo cáo, cấu hình hệ thống |

---

## 9. Use Case chính

| Mã | Tác nhân | Use Case |
|----|----------|----------|
| UC01 | Guest | Xem danh sách khóa học |
| UC02 | Guest | Đăng ký tư vấn |
| UC03 | Guest | Làm test đầu vào |
| UC04 | Student | Xem lịch học |
| UC05 | Student | Làm bài tập |
| UC06 | Student | Xem tiến độ |
| UC07 | Teacher | Điểm danh lớp |
| UC08 | Teacher | Tạo bài kiểm tra |
| UC09 | Teacher | Chấm bài |
| UC10 | Admin | Quản lý lớp học |
| UC11 | Admin | Quản lý CRM |
| UC12 | Admin | Xem báo cáo |

---

## 10. API đã triển khai (Backend)

### 10.1. Auth (`/api/auth`)

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| `POST` | `/api/auth/register` | Đăng ký tài khoản cơ bản | Public |
| `POST` | `/api/auth/login` | Đăng nhập, trả về accessToken + refreshToken | Public |
| `POST` | `/api/auth/refresh-token` | Làm mới access token | Public |
| `GET`  | `/api/auth/me` | Lấy thông tin người dùng hiện tại | Authenticated |

### 10.2. Admin — Quản lý User (`/api/admin/users`)

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| `GET`    | `/api/admin/users` | Lấy danh sách tất cả người dùng | Admin |
| `POST`   | `/api/admin/users` | Tạo người dùng mới (hash mật khẩu, validate email/role) | Admin |
| `GET`    | `/api/admin/users/:id` | Xem chi tiết một người dùng | Admin |
| `PUT`    | `/api/admin/users/:id` | Cập nhật họ tên, email, phone, role, status | Admin |

### 10.3. Module dự kiến triển khai tiếp

- `Public` — `/api/public/courses`, `/api/public/courses/:slug`, `/api/public/leads`, `/api/public/placement-tests`
- `Student` — `/api/student/dashboard`, `/api/student/classes`, `/api/student/schedule`, `/api/student/materials`, `/api/student/assignments/:id/submit`, `/api/student/quizzes/:id/start`, `/api/student/quizzes/:id/submit`, `/api/student/progress`
- `Teacher` — `/api/teacher/dashboard`, `/api/teacher/classes`, `/api/teacher/sessions/:id/attendance`, `/api/teacher/materials`, `/api/teacher/assignments`, `/api/teacher/submissions/:id/grade`, `/api/teacher/quizzes`
- `Admin` (mở rộng) — `/api/admin/courses`, `/api/admin/classes`, `/api/admin/classes/:id/students`, `/api/admin/leads`, `/api/admin/leads/:id/status`, `/api/admin/reports/overview`

### 10.4. Luồng API mẫu

```
POST /api/auth/login
Content-Type: application/json
{
  "email": "admin@zhongruan.com",
  "password": "Admin@123"
}
```

Response 200:

```json
{
  "message": "Đăng nhập thành công",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": { "id": 1, "fullName": "Admin Zhong Ruan", "email": "admin@zhongruan.com", "role": "ADMIN" }
  }
}
```

Các API yêu cầu xác thực sẽ cần header:

```
Authorization: Bearer <accessToken>
```

---

## 11. Thiết kế cơ sở dữ liệu

### 11.1. Danh sách bảng chính

| Bảng | Mục đích |
|------|----------|
| `users` | Tài khoản đăng nhập chung (admin, giáo viên, học viên) |
| `roles` | Danh sách vai trò: admin, teacher, student |
| `permissions` | Danh sách quyền hệ thống |
| `role_permissions` | Liên kết vai trò và quyền |
| `student_profiles` | Thông tin mở rộng của học viên |
| `teacher_profiles` | Thông tin mở rộng của giáo viên |
| `courses` | Khóa học: HSK, giao tiếp, 1-1, doanh nghiệp |
| `course_levels` | Cấp độ khóa học: HSK1, HSK2... |
| `lessons` | Bài học thuộc khóa học |
| `classes` | Lớp học cụ thể |
| `class_students` | Học viên trong lớp |
| `class_teachers` | Giáo viên phụ trách lớp |
| `class_sessions` | Buổi học / lịch học |
| `attendance` | Điểm danh theo buổi |
| `materials` | Tài liệu học tập |
| `assignments` / `assignment_submissions` | Bài tập + bài nộp |
| `quizzes` / `questions` / `question_options` | Bài kiểm tra + câu hỏi + đáp án |
| `quiz_attempts` / `quiz_answers` | Lượt làm bài + câu trả lời |
| `vocabulary_items` / `student_vocabulary` | Từ vựng + sổ tay cá nhân |
| `leads` / `lead_notes` | Lead tư vấn + ghi chú chăm sóc |
| `payments` | Lịch sử học phí |
| `notifications` | Thông báo |
| `posts` / `banners` | Bài viết + banner |
| `settings` | Cấu hình hệ thống |

### 11.2. Mối quan hệ cốt lõi

- `users 1--1 student_profiles`
- `users 1--1 teacher_profiles`
- `courses 1--n lessons`
- `courses 1--n classes`
- `classes n--n users(student)` thông qua `class_students`
- `classes n--n users(teacher)` thông qua `class_teachers`
- `classes 1--n class_sessions`
- `class_sessions 1--n attendance`
- `classes 1--n materials` / `assignments` / `quizzes`
- `assignments 1--n assignment_submissions`
- `quizzes 1--n questions 1--n question_options`
- `quizzes 1--n quiz_attempts 1--n quiz_answers`
- `leads 1--n lead_notes`
- `users(student) 1--n payments`

### 11.3. Trường dữ liệu gợi ý cho các bảng quan trọng

- **users**: `id, full_name, email, phone, password_hash, role, avatar_url, status, last_login_at, created_at, updated_at`
- **courses**: `id, title, slug, level_id, description, objectives, duration, price, thumbnail_url, status`
- **classes**: `id, course_id, name, start_date, end_date, max_students, status, meeting_url, note`
- **class_sessions**: `id, class_id, title, session_date, start_time, end_time, meeting_url, status, note`
- **attendance**: `id, session_id, student_id, status, note, marked_by, marked_at`
- **materials**: `id, class_id, lesson_id, title, type, file_url, external_url, visibility, uploaded_by`
- **assignments**: `id, class_id, lesson_id, title, description, due_date, max_score, status`
- **quizzes**: `id, class_id, title, description, duration_minutes, total_score, status, created_by`
- **leads**: `id, full_name, phone, email, source, target_course, learning_goal, status, assigned_to, created_at`
- **payments**: `id, student_id, class_id, amount, payment_date, method, status, note`

---

## 12. Sitemap Frontend (dự kiến)

### Public
- `/` Trang chủ
- `/gioi-thieu` Giới thiệu
- `/khoa-hoc` Danh sách khóa học
- `/khoa-hoc/:slug` Chi tiết khóa học
- `/giao-vien` Đội ngũ giáo viên
- `/tin-tuc` Tin tức
- `/lien-he` Liên hệ
- `/dang-ky-tu-van` Form đăng ký tư vấn

### Auth
- `/login`
- `/register`

### Student
- `/dashboard`, `/classes`, `/schedule`, `/materials`, `/assignments`, `/quizzes`, `/progress`, `/vocabulary`, `/payments`

### Teacher
- `/dashboard`, `/classes`, `/attendance`, `/materials`, `/assignments`, `/grading`, `/quizzes`

### Admin
- `/dashboard`, `/users`, `/students`, `/teachers`, `/courses`, `/classes`, `/schedules`, `/crm/leads`, `/materials`, `/quizzes`, `/reports`, `/settings`

---

## 13. Bảo mật

- Mật khẩu được mã hóa bằng **bcrypt** (cost 10), không lưu plain text.
- Xác thực bằng **JWT** access token + refresh token.
- Middleware phân quyền theo role (`authorizeRoles`).
- Validate input ở cả frontend và backend.
- Hạn chế rate-limit cho các API đăng nhập/đăng ký bằng `express-rate-limit`.
- Biến môi trường nhạy cảm lưu trong `.env` (không commit).
- Bật CORS theo domain frontend khi triển khai thật.

---

## 14. Môi trường triển khai đề xuất

| Thành phần | Gợi ý |
|------------|-------|
| Frontend | Vercel, Netlify hoặc VPS Nginx |
| Backend | Render, Railway, VPS Node.js hoặc Docker |
| Database | PostgreSQL trên Supabase, Neon, Railway hoặc VPS |
| Storage | Giai đoạn đồ án lưu local; triển khai thật chuyển sang S3 / Cloudinary / Supabase Storage |
| Domain | Trỏ subdomain như `lms.tiengtrungzhongruan.com` (nếu trung tâm cho phép) |

---

## 15. Kế hoạch triển khai 4 tháng

| Giai đoạn | Công việc | Kết quả cần đạt |
|-----------|-----------|-----------------|
| Tháng 1 — Tuần 1 | Khảo sát và chốt yêu cầu | Phỏng vấn trung tâm, xác định quy trình, vai trò, danh sách chức năng, dữ liệu mẫu |
| Tháng 1 — Tuần 2 | Thiết kế nghiệp vụ | Use case, luồng nghiệp vụ, sitemap, wireframe sơ bộ |
| Tháng 1 — Tuần 3 | Thiết kế CSDL | ERD, bảng dữ liệu, migration PostgreSQL |
| Tháng 1 — Tuần 4 | Khởi tạo dự án | Setup backend, frontend, database, auth, role middleware |
| Tháng 2 — Tuần 1 | Public website | Trang chủ, khóa học, bài viết, form tư vấn |
| Tháng 2 — Tuần 2 | Admin core | Quản lý users, học viên, giáo viên, khóa học |
| Tháng 2 — Tuần 3 | Class / Lesson / Schedule | Quản lý lớp, bài học, lịch học |
| Tháng 2 — Tuần 4 | Student dashboard | Dashboard, lịch học, tài liệu |
| Tháng 3 — Tuần 1 | Teacher dashboard | Lớp phụ trách, điểm danh, upload tài liệu |
| Tháng 3 — Tuần 2 | Assignment | Tạo bài tập, nộp bài, chấm bài |
| Tháng 3 — Tuần 3 | Quiz | Tạo đề, câu hỏi, làm bài, chấm trắc nghiệm |
| Tháng 3 — Tuần 4 | CRM | Lead, trạng thái tư vấn, ghi chú, chuyển thành học viên |
| Tháng 4 — Tuần 1 | Report | Báo cáo admin, tiến độ học viên |
| Tháng 4 — Tuần 2 | Hoàn thiện UI/UX | Responsive, validate form, thông báo lỗi |
| Tháng 4 — Tuần 3 | Testing | Test case, sửa lỗi, bảo mật cơ bản |
| Tháng 4 — Tuần 4 | Báo cáo & demo | Hoàn thiện báo cáo, slide, dữ liệu demo, kịch bản bảo vệ |

---

## 16. Kiểm thử (Test case chính)

| Mã | Tên test | Kết quả mong đợi |
|----|----------|------------------|
| TC01 | Đăng nhập đúng tài khoản | Đăng nhập thành công và chuyển đúng dashboard |
| TC02 | Đăng nhập sai mật khẩu | Hiển thị thông báo lỗi |
| TC03 | Guest đăng ký tư vấn | Lead mới xuất hiện trong CRM |
| TC04 | Admin tạo khóa học | Khóa học được lưu và hiển thị |
| TC05 | Admin tạo lớp | Lớp được tạo thành công |
| TC06 | Admin xếp học viên vào lớp | Học viên thấy lớp trong dashboard |
| TC07 | Giáo viên điểm danh | Dữ liệu điểm danh được lưu |
| TC08 | Học viên xem tài liệu | File / link hiển thị đúng |
| TC09 | Học viên nộp bài tập | Submission được ghi nhận |
| TC10 | Giáo viên chấm bài | Học viên xem được điểm |
| TC11 | Học viên làm quiz | Hệ thống chấm điểm tự động |
| TC12 | Phân quyền sai | Student truy cập admin URL → bị chặn |

---

## 17. Hướng phát triển phiên bản 2

- AI luyện phát âm tiếng Trung (chấm độ chính xác và thanh điệu).
- Chatbot học tập: giải thích từ vựng, ngữ pháp, tạo ví dụ theo trình độ.
- Tự động tạo bài kiểm tra từ vựng theo HSK / bài học / chủ đề.
- Cá nhân hóa lộ trình học dựa trên điểm số, điểm danh, bài học đã hoàn thành, từ vựng hay sai.
- Flashcard thông minh + lịch ôn tập spaced repetition.
- Cảnh báo sớm học viên có nguy cơ bỏ học / học yếu.

---

## 18. Tài liệu tham khảo

- Trang chủ Tiếng Trung Online Zhong Ruan: <https://tiengtrungzhongruan.com/>
- Trang Zhong Ruan `.edu.vn`: <https://tiengtrungzhongruan.edu.vn/>
- Tài liệu chính thức Node.js, ReactJS và PostgreSQL.

---

## 19. Phụ lục — Thông tin cần xin thêm từ Trung tâm Zhong Ruan

- Danh sách khóa học chính thức: tên khóa, cấp độ, thời lượng, học phí, mô tả, lộ trình.
- Quy trình tư vấn hiện tại: nguồn lead, các bước trạng thái, người phụ trách.
- Mẫu lịch học: số buổi/tuần, thời lượng mỗi buổi, học qua Zoom/Meet hay nền tảng khác.
- Quy trình điểm danh: Có mặt / Vắng / Muộn / Có phép hay có trạng thái khác.
- Quy trình bài tập & bài kiểm tra: có cần nghe / nói / viết hay chỉ trắc nghiệm trong v1.
- Mẫu báo cáo trung tâm muốn xem: doanh thu, số học viên, lớp đang học, tỷ lệ chuyên cần, tiến độ.
- Yêu cầu nhận diện thương hiệu: logo, màu chủ đạo, font, hình ảnh, nội dung giới thiệu.
- Dữ liệu demo được phép dùng: tên giáo viên, khóa học, review học viên, hình ảnh minh họa.

---

## 20. Tác giả

- **Trương Minh Trung Huy** — Sinh viên Công nghệ thông tin
- Email liên hệ: huytrung0102@gmail.com
- GitHub: <https://github.com/TrungHuy242>

---

> Tài liệu này vừa là báo cáo đồ án tốt nghiệp, vừa là tài liệu định hướng triển khai phần mềm. Khi đọc xong, có thể nắm được mục tiêu, phạm vi, nghiệp vụ, thiết kế hệ thống, cơ sở dữ liệu, API, giao diện, kế hoạch triển khai và kiểm thử để phát triển website từ đầu đến khi hoàn thành.
