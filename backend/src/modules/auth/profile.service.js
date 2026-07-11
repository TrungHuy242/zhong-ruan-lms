/**
 * profile.service — bổ sung cho module Hồ sơ cá nhân.
 *
 * Theo yêu cầu nâng cấp:
 *   - Avatar: upload/đổi/xoá — chỉ user tự chỉnh avatar của mình (xác thực qua req.user.id).
 *   - Lịch sử đăng nhập: lấy từ AuditLog 10 lần gần nhất (LOGIN/LOGOUT) của chính user.
 *
 * Tận dụng logic sẵn có:
 *   - files.service.uploadFile — đã có sẵn multer, validation mime/size, lưu UploadFile.
 *   - auth.service.updateProfile — đã có sẵn, không đụng.
 *   - audit.service.log / listLogs — dùng sẵn, không thêm endpoint mới ở audit.
 *
 * Không sửa / xoá endpoint cũ — chỉ bổ sung.
 */

const prisma = require("../../config/database");
const filesService = require("../files/files.service");

// ===== Errors =====

function badRequest(message) {
  const e = new Error(message);
  e.code = "BAD_REQUEST";
  return e;
}

function notFound(message = "Không tìm thấy người dùng") {
  const e = new Error(message);
  e.code = "NOT_FOUND";
  return e;
}

// ===== Upload avatar =====
//
// Quy trình:
//   1. Tạo UploadFile record mới (qua files.service.uploadFile — đã có sẵn validation mime/size).
//      Service này không qua multer; gọi trực tiếp với req.file đã được multer xử lý ở route.
//   2. Set User.avatarFileId = file.id (ghi đè nếu đã có avatar cũ).
//   3. Ghi audit PROFILE_AVATAR_UPDATED.
//   4. Trả về User đầy đủ kèm avatar URL public (/uploads/<storedName>).
//
// Validate trước khi lưu:
//   - req.file phải tồn tại
//   - mimeType phải là image (jpg/png/jpeg/webp) — upload.middleware đã filter
//     nhưng check lại lần nữa phòng multer config bị đổi.
//   - size: đã được multer giới hạn 10MB (đủ cho avatar).
const ALLOWED_AVATAR_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

async function uploadAvatar(userId, file) {
  if (!file) throw badRequest("Thiếu file upload");
  if (!ALLOWED_AVATAR_MIME.has(file.mimetype)) {
    throw badRequest(
      "Avatar phải là ảnh (jpg, jpeg, png, webp). Vui lòng chọn file khác."
    );
  }

  // Tạo UploadFile record (giữ nguyên luồng của files.service để không bypass validation).
  const uploaded = await filesService.uploadFile(userId, file);

  // Set avatarFileId cho user (ghi đè avatar cũ nếu có).
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { avatarFileId: uploaded.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      avatarFile: { select: { id: true, storedName: true, originalName: true } },
    },
  });

  return serializeProfile(updatedUser);
}

// ===== Xoá avatar =====
async function removeAvatar(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarFileId: true },
  });
  if (!user) throw notFound();

  await prisma.user.update({
    where: { id: userId },
    data: { avatarFileId: null },
  });

  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      avatarFile: { select: { id: true, storedName: true, originalName: true } },
    },
  });

  return serializeProfile(updatedUser);
}

// ===== Lấy thông tin self (dùng cho GET /auth/me) =====
//
// Mở rộng so với auth.controller.me trước đó (chỉ trả req.user đã middleware set)
// — thêm avatarFile (FK) để FE render ảnh đại diện.
// Backward compatible: các field khác giữ nguyên.
async function getMyProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      avatarFile: { select: { id: true, storedName: true, originalName: true } },
    },
  });
  if (!user) throw notFound();
  return serializeProfile(user);
}

// ===== Lịch sử đăng nhập =====
//
// Lấy 10 bản ghi audit gần nhất của user với action LOGIN_SUCCESS / LOGIN_FAIL / LOGOUT_SUCCESS.
// Cho user xem "lần đăng nhập gần nhất" — bao gồm cả login fail để cảnh báo bảo mật.
const LOGIN_AUDIT_ACTIONS = [
  "AUTH_LOGIN_SUCCESS",
  "AUTH_LOGIN_FAIL",
  "AUTH_LOGOUT_SUCCESS",
];

async function getMyLoginHistory(userId, limit = 10) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
  const rows = await prisma.auditLog.findMany({
    where: {
      userId,
      action: { in: LOGIN_AUDIT_ACTIONS },
    },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
    select: {
      id: true,
      action: true,
      ip: true,
      userAgent: true,
      createdAt: true,
      meta: true,
    },
  });
  return rows.map(serializeLoginHistory);
}

// ===== Helpers =====

function serializeProfile(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    // Object avatar file rút gọn — FE tự build URL `/uploads/<storedName>`.
    avatarFile: user.avatarFile
      ? {
          id: user.avatarFile.id,
          storedName: user.avatarFile.storedName,
          originalName: user.avatarFile.originalName,
        }
      : null,
  };
}

function serializeLoginHistory(row) {
  return {
    id: row.id,
    action: row.action,
    ip: row.ip ?? null,
    userAgent: row.userAgent ?? null,
    createdAt: row.createdAt,
    // Chỉ trả 1 số field an toàn từ meta (vd: reason=INVALID_CREDENTIALS khi login fail).
    meta: row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
      ? { reason: row.meta.reason ?? null }
      : null,
  };
}

module.exports = {
  uploadAvatar,
  removeAvatar,
  getMyProfile,
  getMyLoginHistory,
};