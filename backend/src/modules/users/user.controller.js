const userService = require("./user.service");

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
      message: error.message,
    });
  }
}

module.exports = {
  getAllUsers,
  createUser,
};