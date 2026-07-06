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

module.exports = {
  getAllUsers,
};