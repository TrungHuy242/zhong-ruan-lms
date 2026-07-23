/**
 * contact-request.routes.js — Admin API routes.
 *
 * Tất cả routes đều cần auth + role ADMIN.
 *
 * Conventions theo pricing-plan.routes.js:
 *   - router.use(authenticate, authorizeRoles("ADMIN")) ở đầu.
 *   - Soft-delete qua DELETE /:id.
 *   - Restore qua POST /:id/restore.
 *   - Force-delete qua DELETE /:id/force.
 */

const express = require("express");
const router = express.Router();
const contactRequestController = require("./contact-request.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

// Tất cả route admin đều cần auth + role ADMIN.
router.use(authenticate, authorizeRoles("ADMIN"));

router.get("/", contactRequestController.listContacts);
router.get("/:id", contactRequestController.getContactById);
router.patch("/:id/status", contactRequestController.updateContactStatus);
router.delete("/:id", contactRequestController.deleteContact);
router.post("/:id/restore", contactRequestController.restoreContact);
router.delete("/:id/force", contactRequestController.forceDeleteContact);

module.exports = router;