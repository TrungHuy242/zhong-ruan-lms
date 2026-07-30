-- Module EnrollmentSchedule — "Lịch khai giảng" (singleton-style CRUD).
--   1. Tạo bảng "enrollment_schedules" (id UUID, soft-delete pattern).
--   2. Index cho query list/admin/trash/public (sort displayOrder ASC + filter isPublished).
--   3. FK deletedById → "User"("id") ON DELETE SET NULL.
--
-- Lưu ý:
--   - KHÔNG đụng vào các bảng đã có data (theo CLAUDE.md warning #6).
--   - coursesEnrolling + phoneNumbers dùng text[] của Postgres (Prisma String[]).
--   - 3 field schedule (morningTimes / afternoonTimes / eveningTimes) và 2 group
--     (scheduleGroupA / scheduleGroupB) là String thuần — lưu biểu thức hiển thị đã
--     formatter sẵn, KHÔNG phải DateTime từng buổi (không có TZ chuyển đổi).
--   - CTA fields (ctaText/ctaLink) bắt buộc — block này có CTA chính trên trang.
--   - Public sort theo displayOrder ASC + tiebreak createdAt DESC — đảm bảo luôn
--     có 1 bản được chọn kể cả khi displayOrder bằng nhau.
--   - Lưu ý drift: DB thực tế đã có bảng "banners" + "contact_requests" trước đó
--     nhưng KHÔNG có file migration tương ứng trong thư mục migrations/.
--     Prisma đã cảnh báo drift lúc chạy `prisma migrate dev --create-only` và
--     đề xuất reset — KHÔNG reset. Hai bảng đó không thuộc phạm vi task này,
--     việc migrate sẽ được xử lý trong task riêng (bằng cách thêm migration
--     thủ công baselining hoặc `prisma migrate resolve`).

-- ===== 1. Create table "enrollment_schedules" =====
CREATE TABLE "enrollment_schedules" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "coursesEnrolling" TEXT[] NOT NULL,
  "morningTimes" TEXT NOT NULL,
  "afternoonTimes" TEXT NOT NULL,
  "eveningTimes" TEXT NOT NULL,
  "scheduleGroupA" TEXT NOT NULL,
  "scheduleGroupB" TEXT NOT NULL,
  "note" TEXT,
  "tagline" TEXT,
  "ctaText" TEXT NOT NULL,
  "ctaLink" TEXT NOT NULL,
  "phoneNumbers" TEXT[] NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedById" INTEGER,
  CONSTRAINT "enrollment_schedules_pkey" PRIMARY KEY ("id")
);

-- ===== 2. Indexes =====
CREATE INDEX "enrollment_schedules_isPublished_idx" ON "enrollment_schedules"("isPublished");
CREATE INDEX "enrollment_schedules_displayOrder_idx" ON "enrollment_schedules"("displayOrder");
CREATE INDEX "enrollment_schedules_deletedAt_idx" ON "enrollment_schedules"("deletedAt");
CREATE INDEX "enrollment_schedules_deletedById_idx" ON "enrollment_schedules"("deletedById");

-- ===== 3. FK deletedById → "User" ("id") ON DELETE SET NULL =====
ALTER TABLE "enrollment_schedules"
  ADD CONSTRAINT "enrollment_schedules_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
