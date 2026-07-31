-- BASELINE migration — bảng "banners" đã tồn tại trong DB trước khi project áp dụng
-- Prisma migrations một cách nhất quán. Cấu trúc thật được xác nhận qua
-- `npx prisma db pull` (ngày 2026-07-31) khớp hoàn toàn với model Banner trong
-- schema.prisma (16 columns, 6 indexes, FK deletedById → "User"("id") ON DELETE
-- SET NULL, tên bảng "banners").
--
-- Migration này KHÔNG chạy SQL nào — chỉ tồn tại để đánh dấu trong bảng
-- _prisma_migrations rằng "banners" đã được coi như đã áp dụng.
-- Áp dụng qua: `npx prisma migrate resolve --applied 20260730000000_baseline_banners`.
--
-- Không reset database (theo CLAUDE.md warning #6).

SELECT 1; -- marker, không có side effect