/**
 * banner.routes.js — Admin routes cho module Banners.
 *
 * POST   /api/admin/banners              — Tạo banner
 * GET    /api/admin/banners              — Danh sách banner (phân trang)
 * GET    /api/admin/banners/:id          — Chi tiết 1 banner
 * PUT    /api/admin/banners/:id          — Cập nhật banner
 * DELETE /api/admin/banners/:id          — Soft-delete banner
 * POST   /api/admin/banners/:id/restore — Restore banner
 * DELETE /api/admin/banners/:id/permanent — Xóa vĩnh viễn
 */

const express = require("express");
const router = express.Router();
const ctrl = require("./banner.controller");
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
