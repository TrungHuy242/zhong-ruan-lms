const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");
const authenticate = require("../../middlewares/auth.middleware");
const loginRateLimiter = require("../../middlewares/rateLimit.middleware");

router.post("/register", authController.register);
router.post("/login", loginRateLimiter, authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);
router.put("/change-password", authenticate, authController.changePassword);
router.put("/me", authenticate, authController.updateMe);
router.get("/me", authenticate, authController.me);

module.exports = router;
