-- Bio & bioShort trở thành optional trong model Teacher.
--
-- Lý do: Trước đây `bio` và `bioShort` không null trong schema.prisma và cũng
-- bị validator ép "khong duoc de trong" (teacher.helpers.js validateTeacherPayload).
-- UI Frontend (TeacherFormModal) hiển thị 2 field này là TÙY CHỌN (placeholder
-- "Tối đa 5000/300 ký tự", required không đặt) — User bị lỗi lần đầu khi submit
-- vì BE đột ngột reject với empty bio/bioShort. Confuse UX.
--
-- Fix: cho phép null. Service default "" qua `payload.bio != null ? ... : null`.
-- FE sửa validateAll() bỏ check required, BE sửa validateTeacherPayload bỏ
-- "khong duoc de trong" — chỉ check maxlength khi có giá trị.
--
-- Migration này DROP NOT NULL cả 2 cột. Data hiện có (4 records còn lại trong
-- teachers, đa số soft-deleted) đều có bio/bioShort ≠ null nên ALTER COLUMN
-- không cần DEFAULT — không có data loss.

-- Drop NOT NULL constraint trên bio + bioShort của bảng teachers.
ALTER TABLE "teachers" ALTER COLUMN "bio" DROP NOT NULL;
ALTER TABLE "teachers" ALTER COLUMN "bioShort" DROP NOT NULL;
