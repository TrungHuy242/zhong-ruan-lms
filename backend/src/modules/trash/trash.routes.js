/**
 * trash.routes.js — Routes cho module Trash Manager.
 *
 * Tất cả endpoint yêu cầu đăng nhập + quyền ADMIN.
 * Thứ tự route quan trọng: bulk-* đặt TRƯỚC route động /:module/:id để không
 * bị nuốt.
 */
const express = require("express");
const router = express.Router();

const ctrl = require("./trash.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

router.use(authenticate, authorizeRoles("ADMIN"));

// ===== Bulk endpoints (đặt trước route động) =====
router.post("/bulk-restore", ctrl.bulkRestore);
router.post("/bulk-force-delete", ctrl.bulkForceDelete);

// ===== List =====
router.get("/", ctrl.list);

// ===== Single restore / force-delete (route động — đặt cuối) =====
router.post("/:module/:id/restore", ctrl.restore);
router.delete("/:module/:id", ctrl.forceDelete);

module.exports = router;