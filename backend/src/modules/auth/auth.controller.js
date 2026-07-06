const authService = require("./auth.service");

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.json({
      message: "Đăng nhập thành công",
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      message: error.message,
    });
  }
}

async function me(req, res) {
  res.json({
    message: "Thông tin người dùng hiện tại",
  });
}

module.exports = {
  login,
  me,
};