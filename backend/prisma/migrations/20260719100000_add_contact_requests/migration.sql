-- Module ContactRequest — liên hệ từ form public.
--   1. Tạo bảng "contact_requests" (id UUID, soft-delete pattern).
--   2. Index cho query list/admin/trash/search.
--
-- Lưu ý:
--   - KHÔNG đụng vào các bảng đã có data.
--   - message dùng TEXT (Postgres @db.Text) vì có thể rất dài.
--   - status lưu String (NEW | CONTACTED | CLOSED) — không dùng enum Postgres
--     để tránh phải ALTER TYPE khi cần mở rộng.
--   - FK deletedById → "User"("id") ON DELETE SET NULL.

-- ===== 1. Create table "contact_requests" =====
CREATE TABLE "contact_requests" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedById" INTEGER,
  CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

-- ===== 2. Indexes =====
CREATE INDEX "contact_requests_status_idx" ON "contact_requests"("status");
CREATE INDEX "contact_requests_createdAt_idx" ON "contact_requests"("createdAt");
CREATE INDEX "contact_requests_deletedAt_idx" ON "contact_requests"("deletedAt");
CREATE INDEX "contact_requests_deletedById_idx" ON "contact_requests"("deletedById");

-- ===== 3. FK deletedById → User (ON DELETE SET NULL) =====
ALTER TABLE "contact_requests"
  ADD CONSTRAINT "contact_requests_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;