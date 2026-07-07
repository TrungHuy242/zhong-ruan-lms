// 404 handler — must be registered after all routes, before the global error handler.
function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `Route ${req.method} ${req.originalUrl} không tồn tại`,
  });
}

module.exports = notFoundHandler;