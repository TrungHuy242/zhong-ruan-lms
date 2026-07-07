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
    const users = await userService.getAllUsers();

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
    const user = await userService.createUser(req.body);

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
    const user = await userService.updateUser(req.params.id, req.body);

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

module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
};
