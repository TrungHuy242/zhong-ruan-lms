-- Migration: thêm field linkedUserId (nullable) cho bảng Teacher.
--
-- Lý do: cho phép Admin liên kết 1 giảng viên (hồ sơ công khai) với 1 tài khoản
-- User có role=teacher để tham khảo/đối chiếu nhanh. KHÔNG đồng bộ dữ liệu
-- 2 chiều, KHÔNG copy tên/email — chỉ là tham chiếu nội bộ (ghi chú cho Admin).
--
-- Quyết định kiến trúc: Teacher (hồ sơ công khai marketing) và User role=teacher
-- (tài khoản đăng nhập) là 2 khái niệm TÁCH BIỆT. Field này là optional,
-- nullable để không phá vỡ data cũ.
--
-- ON DELETE SET NULL: nếu user bị xoá (cả soft lẫn hard), liên kết tự trả về null
-- thay vì xoá luôn Teacher — đúng nguyên tắc "Teacher là dữ liệu marketing độc lập".
--
-- An toàn:
--  - Thêm cột nullable → không cần default value, không phá row cũ.
--  - Thêm FK cùng lúc → đảm bảo chỉ link tới user còn tồn tại (chưa bị xoá).
--  - Thêm index cho query nhanh theo linkedUserId.
--
-- Rollback:
--  DROP INDEX IF EXISTS "Teacher_linkedUserId_idx";
--  ALTER TABLE "teachers" DROP CONSTRAINT IF EXISTS "teachers_linkedUserId_fkey";
--  ALTER TABLE "teachers" DROP COLUMN IF EXISTS "linkedUserId";

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN "linkedUserId" INTEGER;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_linkedUserId_fkey"
FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Teacher_linkedUserId_idx" ON "teachers"("linkedUserId");
