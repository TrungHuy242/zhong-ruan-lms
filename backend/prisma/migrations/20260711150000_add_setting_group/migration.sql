-- Add group column to settings (module Settings — nhóm cấu hình).
-- Nullable để giữ backward-compatible với row cũ (chưa phân nhóm).
-- Sau migration, FE/BE default nhóm = 'General' nếu row cũ NULL.
ALTER TABLE "settings" ADD COLUMN "group" TEXT;

-- Index hỗ trợ filter theo group (kết hợp findAll có where).
CREATE INDEX "settings_group_idx" ON "settings"("group");