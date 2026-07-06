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

module.exports = router;