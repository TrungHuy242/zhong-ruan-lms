-- Thêm cột address String? cho User — để user tự cập nhật địa chỉ trong Hồ sơ.
-- Nullable vì user có thể không muốn cung cấp (giống phone).
ALTER TABLE "User" ADD COLUMN "address" TEXT;