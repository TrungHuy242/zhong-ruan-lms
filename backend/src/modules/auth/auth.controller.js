const authService = require("./auth.service");

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    // req.user được gán bởi middleware auth (sẽ làm sau)
    const user = await authService.getMe(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };