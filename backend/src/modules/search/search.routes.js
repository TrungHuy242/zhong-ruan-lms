const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const searchController = require("./search.controller");

router.use(authMiddleware);
router.get("/", searchController.search);

module.exports = router;