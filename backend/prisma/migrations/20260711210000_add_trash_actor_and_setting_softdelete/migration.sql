-- Trash Manager migration:
--   1. Add `deletedById Int?` cho 4 model (User, Notification, UploadFile, Setting) — track actor.
--   2. Add `deletedAt DateTime?` cho Setting — đồng bộ soft-delete với 3 model kia.
--   3. Add index cho query trash (theo deletedAt, deletedById).
--
-- Lưu ý:
--   - User table giữ nguyên tên "User" (Postgres case-sensitive, chưa có @map).
--   - 3 table còn lại có @map = kebab/plural.
--   - Tất cả FK dùng ON DELETE SET NULL (khi user bị force-delete, các deletedById trỏ về user
--     đó sẽ tự set NULL — không cản trở việc xoá user).
--   - deletedById là Int? (nullable) để backward-compatible với data cũ.

-- ===== 1. Settings: deletedAt + deletedById =====
ALTER TABLE "settings" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "settings" ADD COLUMN "deletedById" INTEGER;

CREATE INDEX "settings_deletedAt_idx" ON "settings"("deletedAt");
CREATE INDEX "settings_deletedById_idx" ON "settings"("deletedById");

ALTER TABLE "settings"
  ADD CONSTRAINT "settings_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== 2. User: deletedById =====
ALTER TABLE "User" ADD COLUMN "deletedById" INTEGER;
CREATE INDEX "User_deletedById_idx" ON "User"("deletedById");

ALTER TABLE "User"
  ADD CONSTRAINT "User_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== 3. Notification: deletedById =====
ALTER TABLE "notifications" ADD COLUMN "deletedById" INTEGER;
CREATE INDEX "notifications_deletedById_idx" ON "notifications"("deletedById");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== 4. UploadFile: deletedById =====
ALTER TABLE "upload_files" ADD COLUMN "deletedById" INTEGER;
CREATE INDEX "upload_files_deletedById_idx" ON "upload_files"("deletedById");

ALTER TABLE "upload_files"
  ADD CONSTRAINT "upload_files_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;