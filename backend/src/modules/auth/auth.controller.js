const authService = require("./auth.service");

async function register(req, res) {
  try {
    const user = await authService.register(req.body);

    res.status(201).json({
      message: "Đăng ký tài khoản thành công",
      data: { user },
    });
  } catch (error) {
    if (error.code === "DUPLICATE_EMAIL") {
      return res.status(409).json({
        message: error.message,
      });
    }
    res.status(400).json({
      message: error.message,
    });
  }
}

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

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);

    res.json({
      message: "Yêu cầu đặt lại mật khẩu đã được xử lý. Vui lòng kiểm tra email của bạn.",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);

    res.json({
      message: "Đặt lại mật khẩu thành công",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
}

async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, oldPassword, newPassword);

    res.json({
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
}

async function updateMe(req, res) {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);

    res.json({
      message: "Cập nhật hồ sơ thành công",
      data: { user },
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
}

async function logout(req, res) {
  try {
    await authService.logout(req.user.id);

    res.json({
      message: "Đăng xuất thành công",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
}

module.exports = {
  register,
  login,
  me,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  updateMe,
  logout,
};