require("dotenv").config();
const jwt = require("jsonwebtoken");
const tok = jwt.sign({ id: 99999 }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: "7d" });
console.log(tok);