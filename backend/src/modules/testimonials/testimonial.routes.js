/**
 * testimonial.routes.js — Admin routes cho module Testimonial.
 *
 * GET    /api/admin/testimonials              — Danh sách (phân trang)
 * GET    /api/admin/testimonials/:id          — Chi tiết 1 testimonial
 * POST   /api/admin/testimonials              — Tạo mới
 * PUT    /api/admin/testimonials/:id          — Cập nhật
 * DELETE /api/admin/testimonials/:id          — Soft-delete
 * POST   /api/admin/testimonials/:id/restore  — Restore
 * DELETE /api/admin/testimonials/:id/permanent — Xoá vĩnh viễn
 */

const express = require("express");
const router = express.Router();
const ctrl = require("./testimonial.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

router.use(authenticate, authorizeRoles("ADMIN"));

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);
router.post("/:id/restore", ctrl.restore);
router.delete("/:id/permanent", ctrl.forceDelete);

module.exports = router;