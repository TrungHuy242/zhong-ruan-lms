/**
 * profile.controller — Controller bổ sung cho Hồ sơ cá nhân.
 *
 * Các handler mới (KHÔNG sửa/xóa handler cũ):
 *   - me:                       GET    /auth/me  → trả profile self (kèm avatarFile)
 *   - uploadAvatar:             POST   /auth/me/avatar     (multipart field="file")
 *   - removeAvatar:             DELETE /auth/me/avatar
 *   - getMyLoginHistory:        GET    /auth/me/login-history?limit=10
 *
 * Permission:
 *   - Tất cả endpoint đều yêu cầu authenticate (đã enforce ở route).
 *   - Chỉ thao tác trên chính user đang đăng nhập (req.user.id).
 */

const profileService = require("./profile.service");
const audit = require("../audit/audit.service");
const fs = require("fs");
const path = require("path");

// ===== Error mapper =====
function statusFromError(error) {
  let status = 400;
  if (error && error.code === "NOT_FOUND") status = 404;
  else if (error && error.code === "BAD_REQUEST") status = 400;
  else if (error && error.code === "FORBIDDEN") status = 403;
  return status;
}

// ===== GET /auth/me =====
async function me(req, res) {
  try {
    const user = await profileService.getMyProfile(req.user.id);
    res.json({
      message: "Lấy thông tin cá nhân thành công",
      data: { user },
    });
  } catch (error) {
    console.error("[profile.controller] me error:", error && error.message ? error.message : error);
    res.status(statusFromError(error)).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

// ===== POST /auth/me/avatar =====
//
// Multer đã xử lý multipart + validate mime/size trước khi vào controller.
// Nếu multer fail (mime invalid, file too large) → middleware error ném 400.
async function uploadAvatar(req, res) {
  try {
    const user = await profileService.uploadAvatar(req.user.id, req.file);

    // Audit log (best-effort).
    try {
      await audit.logFromRequest(req, {
        userId: req.user.id,
        action: "PROFILE_AVATAR_UPDATED",
        target: `User:${req.user.id}`,
        meta: {
          avatarFileId: user.avatarFile ? user.avatarFile.id : null,
        },
      });
    } catch (_) {}

    res.status(201).json({
      message: "Cập nhật ảnh đại diện thành công",
      data: { user },
    });
  } catch (error) {
    // Nếu upload đã thành công (file vật lý + UploadFile đã tạo) nhưng update user fail →
    // best-effort xoá file rác để tránh orphan. (Bỏ qua nếu fail để không mask lỗi chính.)
    if (req.file && req.file.path && req.file.storedName) {
      try {
        const absPath = path.isAbsolute(req.file.path)
          ? req.file.path
          : path.join(process.cwd(), req.file.path);
        if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
      } catch (_) {}
    }
    console.error("[profile.controller] uploadAvatar error:", error && error.message ? error.message : error);
    res.status(statusFromError(error)).json({
      message: error.message || "Lỗi upload avatar",
    });
  }
}

// ===== DELETE /auth/me/avatar =====
async function removeAvatar(req, res) {
  try {
    const user = await profileService.removeAvatar(req.user.id);

    try {
      await audit.logFromRequest(req, {
        userId: req.user.id,
        action: "PROFILE_AVATAR_REMOVED",
        target: `User:${req.user.id}`,
      });
    } catch (_) {}

    res.json({
      message: "Đã xoá ảnh đại diện",
      data: { user },
    });
  } catch (error) {
    console.error("[profile.controller] removeAvatar error:", error && error.message ? error.message : error);
    res.status(statusFromError(error)).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

// ===== GET /auth/me/login-history =====
async function getMyLoginHistory(req, res) {
  try {
    const limit = req.query && req.query.limit ? Number(req.query.limit) : 10;
    const items = await profileService.getMyLoginHistory(req.user.id, limit);
    res.json({
      message: "Lấy lịch sử đăng nhập thành công",
      data: { items, total: items.length },
    });
  } catch (error) {
    console.error("[profile.controller] loginHistory error:", error && error.message ? error.message : error);
    res.status(statusFromError(error)).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

module.exports = {
  me,
  uploadAvatar,
  removeAvatar,
  getMyLoginHistory,
};