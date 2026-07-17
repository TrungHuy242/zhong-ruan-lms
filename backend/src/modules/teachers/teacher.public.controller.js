const teacherService = require("./teacher.service");

function statusFromError(error) {
  let status = 400;
  if (error.code === "NOT_FOUND") status = 404;
  else if (error.code === "FORBIDDEN") status = 403;
  return status;
}

// =====================================================================
// PUBLIC handlers (KHONG can auth)
// =====================================================================

async function listTeachers(req, res) {
  try {
    const result = await teacherService.listPublicTeachers(req.query || {});
    res.json({
      message: "Lay danh sach giang vien thanh cong",
      data: { teachers: result.teachers, pagination: result.pagination },
    });
  } catch (error) {
    res.status(500).json({ message: "Loi he thong" });
  }
}

async function listFeaturedTeachers(req, res) {
  try {
    const result = await teacherService.listFeaturedTeachers(req.query || {});
    res.json({
      message: "Lay danh sach giang vien noi bat thanh cong",
      data: { teachers: result.teachers, total: result.total },
    });
  } catch (error) {
    res.status(500).json({ message: "Loi he thong" });
  }
}

async function getTeacherBySlug(req, res) {
  try {
    const teacher = await teacherService.getPublicTeacherBySlug(req.params.slug);
    res.json({
      message: "Lay thong tin giang vien thanh cong",
      data: { teacher },
    });
  } catch (error) {
    res.status(statusFromError(error)).json({ message: error.message });
  }
}

module.exports = {
  listTeachers,
  listFeaturedTeachers,
  getTeacherBySlug,
};
