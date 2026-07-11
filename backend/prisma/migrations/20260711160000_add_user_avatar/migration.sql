-- Thêm cột avatarFileId cho User (FK UploadFile) — nullable.
-- Khi user upload avatar mới → tạo UploadFile record + set avatarFileId.
-- Khi user xoá avatar → set avatarFileId = NULL (không xoá UploadFile để tránh ảnh hưởng
-- audit logs/file khác đang tham chiếu; nếu cần thu gom có thể thêm cleanup job sau).
--
-- Lưu ý: Prisma dùng tên bảng theo @map hoặc tên model. Ở đây User chưa có @map nên
-- Postgres giữ nguyên tên "User" (case-sensitive). upload_files có @map = "upload_files".
ALTER TABLE "User" ADD COLUMN "avatarFileId" INTEGER;

-- Foreign key tới upload_files(id) — khi file bị xoá (force-delete), set NULL.
ALTER TABLE "User"
  ADD CONSTRAINT "User_avatarFileId_fkey"
  FOREIGN KEY ("avatarFileId") REFERENCES "upload_files"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index phụ — không bắt buộc nhưng giúp lookup nhanh nếu cần.
CREATE INDEX "User_avatarFileId_idx" ON "User"("avatarFileId");