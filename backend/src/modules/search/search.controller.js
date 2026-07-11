const searchService = require("./search.service");

// GET /api/search?keyword=&type=&page=&limit=
//
// Contract KHÔNG đổi so với bản trước. Payload được enrich thêm:
//   - mode: "lightweight" khi type=all (limit cứng = 5/module)
//   - settings: kết quả Setting (chỉ Admin)
//   - totals: {users, notifications, files, settings, grand} khi mode=lightweight
//   - mỗi item có thêm `highlight: { positions, snippet }` cho FE render <mark>.
async function search(req, res) {
  try {
    const data = await searchService.search(req.user, req.query, req);
    res.json({
      message: "Tìm kiếm thành công",
      data,
    });
  } catch (error) {
    console.error(
      "[search.controller] search error:",
      error && error.message ? error.message : error
    );
    const status = error.code === "BAD_REQUEST" ? 400 : 500;
    res.status(status).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

// GET /api/search/history?limit=10
//
// Trả về tối đa `limit` từ khoá gần nhất của user hiện tại.
// Default 10, max 50.
async function getHistory(req, res) {
  try {
    const limit = req.query.limit == null ? 10 : Number(req.query.limit);
    const items = await searchService.getSearchHistory(req.user.id, limit);
    res.json({
      message: "Lấy lịch sử tìm kiếm thành công",
      data: { items },
    });
  } catch (error) {
    console.error(
      "[search.controller] getHistory error:",
      error && error.message ? error.message : error
    );
    res.status(500).json({ message: error.message || "Lỗi hệ thống" });
  }
}

// DELETE /api/search/history
//
// Xoá toàn bộ lịch sử tìm kiếm của user hiện tại.
async function clearHistory(req, res) {
  try {
    const result = await searchService.clearSearchHistory(req.user.id);
    res.json({
      message: "Đã xoá lịch sử tìm kiếm",
      data: result,
    });
  } catch (error) {
    console.error(
      "[search.controller] clearHistory error:",
      error && error.message ? error.message : error
    );
    res.status(500).json({ message: error.message || "Lỗi hệ thống" });
  }
}

module.exports = {
  search,
  getHistory,
  clearHistory,
};