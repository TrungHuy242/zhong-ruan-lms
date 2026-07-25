/**
 * asyncHandler — wraps an async Express route handler so unhandled promise
 * rejections are forwarded to next() and caught by the error middleware.
 *
 * Usage:
 *   const list = tryCatch(async (req, res, next) => { ... });
 *
 * Does NOT call next() on success — only on rejection.
 */
function tryCatch(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { tryCatch };
