const express = require("express");
const router = express.Router();

const ctrl = require("./setting.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

// Tất cả API setting đều yêu cầu đăng nhập + quyền ADMIN
router.use(authenticate, authorizeRoles("ADMIN"));

router.get("/", ctrl.list);
router.get("/:key", ctrl.getOne);
router.post("/", ctrl.create);
router.put("/:key", ctrl.update);
router.delete("/:key", ctrl.remove);

module.exports = router;