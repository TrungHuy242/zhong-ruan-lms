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

module.exports = {
  getAllUsers,
  createUser,
};
