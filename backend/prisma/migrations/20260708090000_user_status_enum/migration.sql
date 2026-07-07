-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- Add temp column for mapping old string status -> enum
ALTER TABLE "User" ADD COLUMN "status_new" "UserStatus";

-- Map existing data
UPDATE "User" SET "status_new" =
  CASE "status"
    WHEN 'active'   THEN 'ACTIVE'::"UserStatus"
    WHEN 'inactive' THEN 'INACTIVE'::"UserStatus"
    WHEN 'locked'   THEN 'SUSPENDED'::"UserStatus"
    ELSE 'ACTIVE'::"UserStatus"
  END;

-- Drop old, rename new, set defaults
ALTER TABLE "User" DROP COLUMN "status";
ALTER TABLE "User" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TABLE "User" ALTER COLUMN "status" SET NOT NULL;

-- Add refresh token hash + expiresAt
ALTER TABLE "User" ADD COLUMN "refreshTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "refreshTokenExpiresAt" TIMESTAMP(3);