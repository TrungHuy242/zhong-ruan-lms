require("dotenv").config();
const jwt = require("jsonwebtoken");
const expired = jwt.sign(
  { id: 3, email: "student@zhongruan.com", role: "STUDENT" },
  process.env.JWT_SECRET,
  { expiresIn: "-1s" }
);
console.log(expired);