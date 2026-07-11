const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");
const authenticate = require("../../middlewares/auth.middleware");
const loginRateLimiter = require("../../middlewares/rateLimit.middleware");

router.post("/register", authController.register);
router.post("/login", loginRateLimiter, authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/logout", authenticate, authController.logout);
router.put("/change-password", authenticate, authController.changePassword);
router.put("/me", authenticate, authController.updateMe);
// GET /me đã chuyển sang profile.routes.js (trả kèm avatarFile).
// Nếu user cũ vẫn gọi /api/auth/me GET sẽ trúng vào profile.routes vì mount order.

module.exports = router;
