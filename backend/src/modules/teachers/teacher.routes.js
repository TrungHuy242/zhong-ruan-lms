const express = require("express");
const router = express.Router();
const teacherController = require("./teacher.controller");
const authenticate = require("../../middlewares/auth.middleware");
const authorizeRoles = require("../../middlewares/role.middleware");

// Tat ca route admin deu can auth + role ADMIN.
router.use(authenticate, authorizeRoles("ADMIN"));

router.get("/", teacherController.getAllTeachers);
router.post("/", teacherController.createTeacher);
router.get("/:id", teacherController.getTeacherById);
router.put("/:id", teacherController.updateTeacher);
router.delete("/:id", teacherController.deleteTeacher);
router.post("/:id/restore", teacherController.restoreTeacher);
router.delete("/:id/force", teacherController.forceDeleteTeacher);

module.exports = router;
