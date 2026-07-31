-- BASELINE migration — bảng "contact_requests" đã tồn tại trong DB trước khi project
-- áp dụng Prisma migrations một cách nhất quán. Cấu trúc thật được xác nhận qua
-- `npx prisma db pull` (ngày 2026-07-31) khớp với model ContactRequest trong
-- schema.prisma (11 columns, 4 indexes, tên bảng "contact_requests"). Field
-- `message` lưu kiểu TEXT (Postgres) — Prisma annotation `@db.Text` chỉ là hint,
-- không thay đổi SQL thực tế.
--
-- Migration này KHÔNG chạy SQL nào — chỉ tồn tại để đánh dấu trong bảng
-- _prisma_migrations rằng "contact_requests" đã được coi như đã áp dụng.
-- Áp dụng qua: `npx prisma migrate resolve --applied 20260730020000_baseline_contact_requests`.
--
-- Không reset database (theo CLAUDE.md warning #6).

SELECT 1; -- marker, không có side effect