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
    message: "Lấy thông tin người dùng thành công",
    data: {
      user: req.user,
    },
  });
}

async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        message: "Vui lòng cung cấp refresh token",
      });
    }

    const result = await authService.refreshToken(refreshToken);

    res.json({
      message: "Làm mới token thành công",
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      message: error.message,
    });
  }
}

module.exports = {
  login,
  me,
  refreshToken,
};
