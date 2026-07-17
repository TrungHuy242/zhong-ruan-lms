const express = require("express");
const router = express.Router();
const teacherPublicController = require("./teacher.public.controller");
const { teachersPublicRateLimiter } = require("../../middlewares/rateLimit.middleware");

// Rate-limit nhe (IP-based) de chong spam. KHONG qua middleware auth.
router.use(teachersPublicRateLimiter);

// GET /api/public/teachers/featured phai dat TRUOC /:slug de match dung route.
router.get("/featured", teacherPublicController.listFeaturedTeachers);
router.get("/", teacherPublicController.listTeachers);
router.get("/:slug", teacherPublicController.getTeacherBySlug);

module.exports = router;
