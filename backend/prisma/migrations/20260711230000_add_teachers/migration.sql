-- Module Teachers — hồ sơ giảng viên công khai.
--   1. Tạo bảng "teachers" (id UUID, slug @unique, soft-delete theo pattern chung).
--   2. Thêm relation "TeacherDeletedBy" trên User (deletedTeachers).
--   3. Index cho query list/featured/trash.
--
-- Lưu ý:
--   - KHÔNG đụng vào các bảng đã có data (User, Notification, UploadFile,
--     Setting, AuditLog, SearchHistory). Migration này purely additive.
--   - specialties dùng text[] của Postgres (Prisma String[]).
--   - FK deletedById → "User"("id") ON DELETE SET NULL (giống 4 model còn lại).

-- ===== 1. Create table "teachers" =====
CREATE TABLE "teachers" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "bio" TEXT NOT NULL,
  "bioShort" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "yearsOfExperience" INTEGER,
  "specialties" TEXT[],
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedById" INTEGER,
  CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- ===== 2. Unique + indexes =====
CREATE UNIQUE INDEX "teachers_slug_key" ON "teachers"("slug");
CREATE INDEX "teachers_isPublished_idx" ON "teachers"("isPublished");
CREATE INDEX "teachers_isFeatured_idx" ON "teachers"("isFeatured");
CREATE INDEX "teachers_displayOrder_idx" ON "teachers"("displayOrder");
CREATE INDEX "teachers_deletedAt_idx" ON "teachers"("deletedAt");
CREATE INDEX "teachers_deletedById_idx" ON "teachers"("deletedById");

-- ===== 3. FK deletedById → User (ON DELETE SET NULL) =====
ALTER TABLE "teachers"
  ADD CONSTRAINT "teachers_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
