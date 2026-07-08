-- Add deletedAt column to User, Notification, UploadFile
-- Step 1: Add nullable column
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "notifications" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "upload_files" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Step 2: Add index for query performance (default filter + restore search)
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "notifications_deletedAt_idx" ON "notifications"("deletedAt");
CREATE INDEX "upload_files_deletedAt_idx" ON "upload_files"("deletedAt");
