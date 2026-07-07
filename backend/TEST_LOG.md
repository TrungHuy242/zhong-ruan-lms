# TEST LOG — Auth Hardening (27 cases)

**Ngày chạy:** 2026-07-08
**Branch / scope:** Auth module hardening (no Courses)
**Server:** Node 22 + Express 5, Prisma 7, Postgres `zhong_ruan_lms`
**Base URL:** `http://localhost:5000`

## Tóm tắt kết quả

| Group | Pass | Fail | Tổng |
|---|---|---|---|
| A — Hardening | 15/15 | 0 | 15 |
| B — Bảo mật | 12/12 | 0 | 12 |
| **Tổng** | **27/27** | **0** | **27** |

---

## Group A — Auth Hardening mới

| # | Case | Endpoint | Expect | Result | Note |
|---|------|----------|--------|--------|------|
| A1 | Register không gửi role | POST /api/auth/register | 201, role=STUDENT | PASS | Response: `role:"STUDENT"`, `status:"ACTIVE"` (id=13) |
| A2 | Register cố gửi role=ADMIN | POST /api/auth/register | 201, role=STUDENT | PASS | Server force `Role.STUDENT` (id=14) |
| A3 | Register cố gửi role=TEACHER | POST /api/auth/register | 201, role=STUDENT | PASS | Server force `Role.STUDENT` (id=15) |
| A4 | Forgot-password dev mode | POST /api/auth/forgot-password | 200 có `resetToken` | PASS | Trả `resetToken="25c22deff..."`, `expiresAt` |
| A5 | Forgot-password prod (NODE_ENV=production) | POST /api/auth/forgot-password | 200 chỉ `sent:true` | PASS | Response chỉ `{sent:true}`, không lộ token |
| A6 | Reset-password hợp lệ | POST /api/auth/reset-password | 200, login lại OK | PASS | DB verify: `resetToken=null`, `refreshTokenHash=null` |
| A7 | Reset-password token sai | POST /api/auth/reset-password | 400/401 | PASS | 400 "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" |
| A8 | Reset-password token hết hạn | POST /api/auth/reset-password | 400/401 | PASS | Seed token với `expiresAt` quá khứ → 400 |
| A9 | Reset-password newPassword < 6 ký tự | POST /api/auth/reset-password | 400 | PASS | 400 "Mật khẩu mới phải có ít nhất 6 ký tự" |
| A10 | Logout | POST /api/auth/logout | 200, DB xoá 2 field | PASS | Sau logout: `refreshTokenHash=null`, `refreshTokenExpiresAt=null` |
| A11 | Refresh sau logout | POST /api/auth/refresh-token | 401 | PASS | 401 "Refresh token không hợp lệ" |
| A12 | Login lưu `refreshTokenHash` + `refreshTokenExpiresAt` (+7 ngày) | POST /api/auth/login | DB có 2 field mới | PASS | `refreshTokenHash="18e87185..."` (SHA-256), `refreshTokenExpiresAt=2026-07-14` (login lúc 2026-07-07) |
| A13 | Refresh sau khi `refreshTokenExpiresAt` < now | POST /api/auth/refresh-token | 401 | PASS | Seed expiresAt quá khứ → 401 |
| A14 | Forgot-password cho user SUSPENDED | POST /api/auth/forgot-password | 200 `sent:true`, DB KHÔNG có resetToken | PASS | Response `sent:true`; DB `resetToken=null` |
| A15 | Forgot-password cho user INACTIVE | POST /api/auth/forgot-password | 200 `sent:true`, DB KHÔNG có resetToken | PASS | Response `sent:true`; DB `resetToken=null` |

### Chi tiết A12 — verify DB sau login

```json
{
  "refreshTokenHash": "18e871854524a0a5e36df905214bbdaab99ddcc0fc27b202b7632c2a018d35b0",
  "refreshTokenExpiresAt": "2026-07-14T18:54:57.969Z",
  "resetToken": null,
  "resetTokenExpiresAt": null
}
```

### Chi tiết A14/A15 — verify DB

```json
{"email":"suspended_user@x.com","status":"SUSPENDED","resetToken":null,"resetTokenExpiresAt":null}
{"email":"inactive_user@x.com","status":"INACTIVE","resetToken":null,"resetTokenExpiresAt":null}
```

---

## Group B — Test cases bảo mật

| # | Case | Endpoint | Expect | Result | Note |
|---|------|----------|--------|--------|------|
| B1 | Register email đã tồn tại | POST /api/auth/register | **409** "Email đã tồn tại" | PASS | Status code = 409 Conflict |
| B2 | Access token không hợp lệ | GET /api/auth/me | 401 | PASS | 401 |
| B3 | Access token hết hạn | GET /api/auth/me | 401 | PASS | Tạo JWT với `expiresIn:-1s` → 401 |
| B4 | Refresh token sai format | POST /api/auth/refresh-token | 401 | PASS | Token `not.a.valid.jwt` → 401 |
| B5 | Refresh token của user không tồn tại | POST /api/auth/refresh-token | 401 | PASS | JWT valid, user.id=99999 → 401 |
| B6 | STUDENT gọi GET /api/admin/users | GET /api/admin/users | 403 | PASS | 403 "Bạn không có quyền truy cập chức năng này" |
| B7 | STUDENT gọi DELETE /api/admin/users/:id | DELETE /api/admin/users/3 | 403 | PASS | 403 |
| B8 | TEACHER gọi POST /api/admin/users | POST /api/admin/users | 403 | PASS | 403 |
| B9 | Role escalation: PUT /api/auth/me gửi role=ADMIN | PUT /api/auth/me | 200, role giữ nguyên | PASS | Response `role:"STUDENT"` (bị ignore) |
| B10 | Status escalation: PUT /api/auth/me gửi status=inactive | PUT /api/auth/me | 200, status giữ nguyên | PASS | Response `status:"ACTIVE"` (bị ignore) |
| B11 | Forgot-password email không tồn tại | POST /api/auth/forgot-password | 200 `sent:true` | PASS | Không lộ email có tồn tại |
| B12 | Forgot-password user SUSPENDED | POST /api/auth/forgot-password | 200 `sent:true` | PASS | DB không tạo resetToken (xác nhận ở A14) |

---

## Migration log

```
npx prisma migrate deploy
> Loaded Prisma config from prisma.config.ts.
> Prisma schema loaded from prisma\schema.prisma.
> Datasource "db": PostgreSQL database "zhong_ruan_lms", schema "public" at "localhost:5432"
> 3 migrations found in prisma/migrations
> Applying migration `20260708090000_user_status_enum`
> migrations/ └─ 20260708090000_user_status_enum/     └─ migration.sql
> All migrations have been successfully applied.

npx prisma generate
> Generated Prisma Client (v7.8.0) to .\node_modules\@prisma\client in 235ms
```

Migration file: [`backend/prisma/migrations/20260708090000_user_status_enum/migration.sql`](prisma/migrations/20260708090000_user_status_enum/migration.sql)

---

## Phụ trợ scripts (chỉ dùng để test, có thể xoá)

- `backend/src/server.dev.js` — start server với `NODE_ENV=development` (cho test A4)
- `backend/src/server.prod.js` — start server với `NODE_ENV=production` (cho test A5)
- `backend/scripts/check_refresh.js` — verify `refreshTokenHash`/`refreshTokenExpiresAt` sau login
- `backend/scripts/check_reset_for_inactive.js` — verify DB không có resetToken cho INACTIVE/SUSPENDED
- `backend/scripts/seed_expired_reset.js` — seed token reset đã hết hạn (cho test A8)
- `backend/scripts/seed_expired_refresh.js` — seed refresh token hết hạn (cho test A13)
- `backend/scripts/seed_status_users.js` — tạo user INACTIVE/SUSPENDED (cho test A14/A15/B12)
- `backend/scripts/reset_passwords.js` — reset password admin/teacher về `123456`
- `backend/scripts/gen_expired_jwt.js` — tạo JWT expired (cho test B3)
- `backend/scripts/gen_unknown_user_refresh.js` — tạo refresh token của user không tồn tại (cho test B5)

---

## Khẳng định KHÔNG có Courses

- Không file nào trong `backend/src/modules/courses/**` được tạo.
- Không route nào liên quan đến courses được thêm vào `app.js`.
- Search verify: không có `course`, `lesson`, `enrollment` trong các file mới.