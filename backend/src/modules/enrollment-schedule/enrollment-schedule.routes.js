/**
 * enrollment-schedule.routes.js — Admin routes cho module EnrollmentSchedule.
 *
 * GET    /api/admin/enrollment-schedule              — Danh sách (phân trang)
 * GET    /api/admin/enrollment-schedule/:id          — Chi tiết 1 schedule
 * POST   /api/admin/enrollment-schedule              — Tạo mới
 * PUT    /api/admin/enrollment-schedule/:id          — Cập nhật
 * DELETE /api/admin/enrollment-schedule/:id          — Soft-delete
 * POST   /api/admin/enrollment-schedule/:id/restore  — Restore
 * DELETE /api/admin/enrollment-schedule/:id/permanent — Xoá vĩnh viễn
 */

const express = require("express");
const router = express.Router();
const ctrl = require("./enrollment-schedule.controller");
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
