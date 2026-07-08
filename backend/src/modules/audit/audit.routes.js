const express = require("express");
const router = express.Router();

const auditController = require("./audit.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  auditController.listAuditLogs
);

module.exports = router;