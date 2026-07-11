-- Lưu lịch sử từ khóa tìm kiếm của từng user.
-- Mục đích:
--   - Gợi ý lại khi user gõ vào ô Global Search (UX quen thuộc — Google/YouTube).
--   - Có thể thống kê top keyword của từng user / toàn hệ thống sau này.
--
-- Thiết kế:
--   - Lưu keyword đã search (string normalized: trim + lowercase để dedupe dễ).
--   - Liên kết với User (cascade delete khi user bị xoá vĩnh viễn).
--   - Index (userId, createdAt DESC) để query "10 từ khóa gần nhất của user X" nhanh.
--   - Không unique (user có thể search cùng keyword nhiều lần — count riêng qua count
--     hoặc distinct keyword ở app layer).

CREATE TABLE "search_histories" (
  "id"        SERIAL PRIMARY KEY,
  "userId"    INTEGER NOT NULL,
  "keyword"   TEXT    NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "search_histories_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Hỗ trợ query "lịch sử gần nhất của user X".
CREATE INDEX "search_histories_userId_createdAt_idx"
  ON "search_histories"("userId", "createdAt" DESC);

-- Hỗ trợ dedupe / thống kê theo keyword.
CREATE INDEX "search_histories_keyword_idx"
  ON "search_histories"("keyword");