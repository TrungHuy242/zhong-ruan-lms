const teacherService = require("./teacher.service");

function statusFromError(error) {
  let status = 400;
  if (error.code === "NOT_FOUND") status = 404;
  else if (error.code === "FORBIDDEN") status = 403;
  return status;
}

function handlePrismaError(error) {
  if (error && error.code === "P2002") return "Slug da ton tai";
  if (error && error.code === "P2025") return "Khong tim thay giang vien";
  return error.message;
}

// =====================================================================
// ADMIN handlers
// =====================================================================

async function getAllTeachers(req, res) {
  try {
    const result = await teacherService.listTeachers(req.query || {});
    res.json({
      message: "Lay danh sach giang vien thanh cong",
      data: { teachers: result.teachers, pagination: result.pagination },
    });
  } catch (error) {
    res.status(500).json({ message: "Loi he thong" });
  }
}

async function createTeacher(req, res) {
  try {
    const teacher = await teacherService.createTeacher(req.body, req);
    res.status(201).json({
      message: "Tao giang vien thanh cong",
      data: { teacher },
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: handlePrismaError(error) });
  }
}

async function getTeacherById(req, res) {
  try {
    const teacher = await teacherService.getTeacherById(req.params.id);
    res.json({
      message: "Lay thong tin giang vien thanh cong",
      data: { teacher },
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

async function updateTeacher(req, res) {
  try {
    const teacher = await teacherService.updateTeacher(req.params.id, req.body, req);
    res.json({
      message: "Cap nhat giang vien thanh cong",
      data: { teacher },
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

async function deleteTeacher(req, res) {
  try {
    const result = await teacherService.deleteTeacher(req.params.id, req.user.id, req);
    res.json({
      message: "Da chuyen giang vien vao thung rac (soft delete)",
      data: result,
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

async function restoreTeacher(req, res) {
  try {
    const result = await teacherService.restoreTeacher(req.params.id, req.user.id, req);
    res.json({
      message: "Khoi phuc giang vien thanh cong",
      data: result,
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

async function forceDeleteTeacher(req, res) {
  try {
    const result = await teacherService.forceDeleteTeacher(req.params.id, req.user.id, req);
    res.json({
      message: "Da xoa cung giang vien khoi database",
      data: result,
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

module.exports = {
  getAllTeachers,
  createTeacher,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  restoreTeacher,
  forceDeleteTeacher,
};
