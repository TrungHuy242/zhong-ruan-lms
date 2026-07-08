const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/user.routes");
const auditRoutes = require("./modules/audit/audit.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");
const uploadRoutes = require("./modules/uploads/upload.routes"); 
const settingsRouter = require("./modules/settings/setting.routes");
const dashboardRouter = require("./modules/dashboard/dashboard.routes");
const searchRouter = require("./modules/search/search.routes");

const notFoundHandler = require("./middlewares/notFound.middleware");
const errorHandler = require("./middlewares/error.middleware");

const app = express();

// 1. CORS
app.use(cors());

// 2. Body parsing — must be before routes.
//    Wrap express.json() so a malformed body becomes a normal 400 response
//    instead of crashing the process.
//    Skip JSON parsing for multipart/form-data (handled by multer) so the
//    request stream is not consumed before multer reads it.
app.use((req, res, next) => {
  const ct = req.headers["content-type"] || "";
  if (ct.startsWith("multipart/form-data")) return next();
  express.json({ limit: "1mb" })(req, res, (err) => {
    if (err) return next(err);
    next();
  });
});

// 3. Root + health check
app.get("/", (req, res) => {
  res.json({ message: "Zhong Ruan LMS API is running" });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// 4. Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin/users", userRoutes);
app.use("/api/admin/audit-logs", auditRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", uploadRoutes);
app.use("/api/settings", settingsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/search", searchRouter);

// 5. 404 — after routes, before error handler
app.use(notFoundHandler);

// 6. Global error handler — MUST be last
app.use(errorHandler);

module.exports = app;