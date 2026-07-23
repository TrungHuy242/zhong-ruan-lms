-- Module PricingPlan — quản lý gói học phí.
--   1. Tạo bảng "pricing_plans" (id UUID, soft-delete pattern).
--   2. Index cho query list/public/trash.
--
-- Lưu ý:
--   - KHÔNG đụng vào các bảng đã có data.
--   - features dùng text[] của Postgres (Prisma String[]).
--   - FK deletedById → "User"("id") ON DELETE SET NULL.
--   - name + classType + deletedAt tạo unique index để tránh trùng gói cùng loại.

-- ===== 1. Create table "pricing_plans" =====
CREATE TABLE "pricing_plans" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "classType" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "priceUnit" TEXT NOT NULL,
  "originalPrice" INTEGER,
  "description" TEXT NOT NULL,
  "features" TEXT[],
  "courseSlug" TEXT,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedById" INTEGER,
  CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id")
);

-- ===== 2. Indexes =====
CREATE INDEX "pricing_plans_classType_idx" ON "pricing_plans"("classType");
CREATE INDEX "pricing_plans_isPublished_idx" ON "pricing_plans"("isPublished");
CREATE INDEX "pricing_plans_isFeatured_idx" ON "pricing_plans"("isFeatured");
CREATE INDEX "pricing_plans_displayOrder_idx" ON "pricing_plans"("displayOrder");
CREATE INDEX "pricing_plans_deletedAt_idx" ON "pricing_plans"("deletedAt");
CREATE INDEX "pricing_plans_deletedById_idx" ON "pricing_plans"("deletedById");
CREATE INDEX "pricing_plans_courseSlug_idx" ON "pricing_plans"("courseSlug");

-- ===== 3. FK deletedById → User (ON DELETE SET NULL) =====
ALTER TABLE "pricing_plans"
  ADD CONSTRAINT "pricing_plans_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
