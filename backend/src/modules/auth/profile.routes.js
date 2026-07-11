/**
 * profile.routes — Routes BỔ SUNG cho module Hồ sơ cá nhân.
 *
 * Mount tại /api/auth (cùng prefix với auth.routes cũ).
 * Chỉ chứa các endpoint MỚI; các endpoint cũ (/login, /register, /change-password, /me
 * method PUT) vẫn được serve bởi auth.routes.js.
 *
 * Endpoint mới:
 *   - POST   /me/avatar         upload avatar (multipart field="file")
 *   - DELETE /me/avatar         xoá avatar
 *   - GET    /me/login-history  10 lần LOGIN/LOGOUT gần nhất
 *
 * Note: GET /me (kèm avatarFile) được serve bởi profile.controller.me để có data
 * avatarFile — auth.controller.me cũ vẫn tồn tại nhưng KHÔNG nên dùng cho FE Profile
 * nữa. Có thể xoá auth.controller.me sau khi FE chuyển hết sang dùng endpoint mới.
 * Hiện tại GIỮ cả 2 để không phá code khác.
 */

const express = require("express");
const router = express.Router();

const profileController = require("./profile.controller");
const authenticate = require("../../middlewares/auth.middleware");
const { upload } = require("../../middlewares/upload.middleware");

// NOTE: KHÔNG dùng `router.use(authenticate)` ở đây — sẽ áp dụng cho MỌI sub-path của
// /api/auth (kể cả /login), vì router này mount tại prefix /api/auth cùng với auth.routes.
// Thay vào đó, áp dụng authenticate theo từng route cụ thể.

// ===== GET /me (override auth.controller.me để có avatarFile) =====
// KHAI BÁO TRƯỚC /me/... để Express match exact /me, không match nhầm /me/:...
router.get("/me", authenticate, profileController.me);

// ===== Avatar =====
router.post(
  "/me/avatar",
  authenticate,
  upload.single("file"),
  profileController.uploadAvatar
);
router.delete("/me/avatar", authenticate, profileController.removeAvatar);

// ===== Lịch sử đăng nhập =====
router.get("/me/login-history", authenticate, profileController.getMyLoginHistory);

module.exports = router;