const searchService = require("./search.service");

// GET /api/search?keyword=&type=&page=&limit=
async function search(req, res) {
  try {
    const data = await searchService.search(req.user, req.query);
    res.json({
      message: "Tìm kiếm thành công",
      data,
    });
  } catch (error) {
    console.error("[search.controller] search error:", error && error.message ? error.message : error);
    const status = error.code === "BAD_REQUEST" ? 400 : 500;
    res.status(status).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

module.exports = {
  search,
};