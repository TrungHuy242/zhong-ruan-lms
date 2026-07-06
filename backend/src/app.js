const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/auth/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Zhong Ruan LMS API is running" });
});

app.use("/api/auth", authRoutes);

module.exports = app;