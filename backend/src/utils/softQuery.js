/**
 * softQuery.js — Helper build điều kiện Prisma để mặc định ẩn record đã xóa mềm.
 *
 * Cách dùng:
 *   const { notDeletedWhere, deletedOnlyWhere } = require("../../utils/softQuery");
 *   const where = notDeletedWhere({ userId: 7 });
 *   const where2 = deletedOnlyWhere({ uploadedById: 3 });
 *
 * Quy ước từ query string:
 *   - không có flag          → chỉ chưa xóa (deletedAt: null)
 *   - ?includeDeleted=true   → cả đã xóa + chưa xóa (bỏ filter)
 *   - ?onlyDeleted=true      → chỉ đã xóa (deletedAt != null)
 */

/**
 * Build where mặc định: chỉ lấy record CHƯA bị xóa.
 *
 * @param {Object} [extra={}]    - Các điều kiện lọc khác của repo
 * @param {Object} [opts]
 * @param {boolean} [opts.includeDeleted=false]
 * @param {boolean} [opts.onlyDeleted=false]
 * @returns {Object} where clause cho Prisma
 */
function notDeletedWhere(extra = {}, { includeDeleted = false, onlyDeleted = false } = {}) {
  if (onlyDeleted) {
    return { ...extra, deletedAt: { not: null } };
  }
  if (includeDeleted) {
    return { ...extra };
  }
  return { ...extra, deletedAt: null };
}

/**
 * Build where chỉ lấy record ĐÃ bị xóa (deletedAt != null).
 */
function deletedOnlyWhere(extra = {}) {
  return { ...extra, deletedAt: { not: null } };
}

/**
 * Đọc các flag phân trang/xóa từ req.query,
 * trả về object tham số sẵn cho `notDeletedWhere`.
 */
function parseFlags(query = {}) {
  const includeDeleted =
    query.includeDeleted === "true" || query.includeDeleted === "1";
  const onlyDeleted =
    query.onlyDeleted === "true" || query.onlyDeleted === "1";
  return { includeDeleted, onlyDeleted };
}

module.exports = {
  notDeletedWhere,
  deletedOnlyWhere,
  parseFlags,
};
