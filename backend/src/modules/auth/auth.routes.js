const express = require("express");
const router = express.Router();

const authController = require("./auth.controller");
const authenticate = require("../../middlewares/auth.middleware");
const loginRateLimiter = require("../../middlewares/rateLimit.middleware");

router.post("/login", loginRateLimiter, authController.login);
router.post("/refresh-token", authController.refreshToken);
router.get("/me", authenticate, authController.me);

module.exports = router;
