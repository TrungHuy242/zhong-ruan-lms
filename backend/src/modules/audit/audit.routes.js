const express = require("express");
const router = express.Router();

const auditController = require("./audit.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

// Tất cả endpoint đều yêu cầu đăng nhập và quyền ADMIN.
router.use(authenticate);
router.use(authorizeRoles("ADMIN"));

router.get("/", auditController.listAuditLogs);
// Đặt SAU "/" để Express không khớp "/" với ":id".
// id là số nguyên dương; controller vẫn tự handle trường hợp id không hợp lệ → 404.
router.get("/:id", auditController.getAuditLogById);

module.exports = router;
