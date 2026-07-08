const userService = require("./user.service");

function handlePrismaError(error) {
  if (error.code === "P2002") {
    return "Email đã tồn tại";
  }
  if (error.code === "P2025") {
    return "Không tìm thấy người dùng";
  }
  return error.message;
}

async function getAllUsers(req, res) {
  try {
    const users = await userService.getAllUsers(req.query || {});

    res.json({
      message: "Lấy danh sách người dùng thành công",
      data: {
        users,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi hệ thống",
    });
  }
}

async function createUser(req, res) {
  try {
    const user = await userService.createUser(req.body, req);

    res.status(201).json({
      message: "Tạo người dùng thành công",
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(400).json({
      message: handlePrismaError(error),
    });
  }
}

async function getUserById(req, res) {
  try {
    const user = await userService.getUserById(req.params.id);

    res.json({
      message: "Lấy thông tin người dùng thành công",
      data: { user },
    });
  } catch (error) {
    res.status(404).json({
      message: error.message,
    });
  }
}

async function updateUser(req, res) {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req);

    res.json({
      message: "Cập nhật người dùng thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
}

async function deleteUser(req, res) {
  try {
    const result = await userService.deleteUser(req.params.id, req.user.id, req);

    res.json({
      message: "Đã chuyển người dùng vào thùng rác (soft delete)",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
}

// POST /users/:id/restore — khôi phục user đã soft-delete (chỉ Admin)
async function restoreUser(req, res) {
  try {
    const result = await userService.restoreUser(req.params.id, req.user.id, req);
    res.json({
      message: "Khôi phục người dùng thành công",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
}

// DELETE /users/:id/force — xóa cứng user khỏi DB (chỉ Admin, dùng khi cần dọn dẹp vĩnh viễn)
async function forceDeleteUser(req, res) {
  try {
    const result = await userService.forceDeleteUser(req.params.id, req.user.id, req);
    res.json({
      message: "Đã xóa cứng người dùng khỏi database",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
}

module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  restoreUser,
  forceDeleteUser,
};
