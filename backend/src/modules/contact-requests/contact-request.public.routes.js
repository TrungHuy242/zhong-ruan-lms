/**
 * contact-request.public.routes.js — Routes public (không cần auth).
 *
 * Rate-limit riêng: 3 req / 1 giờ / IP. Định nghĩa trong rateLimit.middleware.
 */

const express = require("express");
const router = express.Router();
const contactRequestPublicController = require("./contact-request.public.controller");
const { contactRequestPublicRateLimiter } = require("../../middlewares/rateLimit.middleware");

// Rate-limit CHỐNG SPAM: tối đa 3 lần/IP/giờ.
router.use(contactRequestPublicRateLimiter);

router.post("/", contactRequestPublicController.createContact);

module.exports = router;