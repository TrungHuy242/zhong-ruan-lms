const express = require("express");
const router = express.Router();

const userController = require("./user.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  userController.getAllUsers
);

router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  userController.createUser
);

// ===== Bulk endpoints (đặt TRƯỚC "/:id" để Express match đúng — nếu đặt sau
// thì "DELETE /bulk" sẽ bị route "/:id" bắt mất với id="bulk" → lỗi) =====
router.delete(
  "/bulk",
  authenticate,
  authorizeRoles("ADMIN"),
  userController.bulkDeleteUsers
);

router.patch(
  "/bulk-status",
  authenticate,
  authorizeRoles("ADMIN"),
  userController.bulkUpdateStatus
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  userController.getUserById
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  userController.updateUser
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  userController.deleteUser
);

router.post(
  "/:id/restore",
  authenticate,
  authorizeRoles("ADMIN"),
  userController.restoreUser
);

router.delete(
  "/:id/force",
  authenticate,
  authorizeRoles("ADMIN"),
  userController.forceDeleteUser
);

module.exports = router;