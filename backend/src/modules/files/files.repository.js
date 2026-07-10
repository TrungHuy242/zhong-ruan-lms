const prisma = require("../../config/database");
const { prismaInternal } = require("../../config/database");

// Lấy 1 file theo id — không bao gồm đã xóa mềm
async function findById(id) {
  return prisma.uploadFile.findFirst({
    where: { id: Number(id), deletedAt: null },
  });
}

// Lấy 1 file kể cả đã xóa mềm — dùng cho restore / force-delete
async function findByIdIncludeDeleted(id) {
  return prismaInternal.uploadFile.findUnique({
    where: { id: Number(id) },
  });
}

// Lấy nhiều file theo id (chỉ chưa xoá) — dùng cho bulk operations
async function findManyByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return prisma.uploadFile.findMany({
    where: { id: { in: ids.map(Number) }, deletedAt: null },
  });
}

// Lấy nhiều file theo id (kể cả đã xoá mềm) — dùng cho restore / force-delete
async function findManyByIdsIncludeDeleted(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return prismaInternal.uploadFile.findMany({
    where: { id: { in: ids.map(Number) } },
  });
}

/**
 * Lấy danh sách file — filter + sort + phân trang, hoàn toàn qua Prisma.
 *
 * @param {Object} opts
 * @param {Object} opts.where          - Prisma where (đã được build bởi service)
 * @param {Object} opts.orderBy        - Prisma orderBy (đã được build bởi service)
 * @param {number} opts.page
 * @param {number} opts.pageSize
 */
async function findAll(opts) {
  opts = opts || {};
  const where = opts.where || {};
  const orderBy = opts.orderBy || { createdAt: "desc" };

  const page = opts.page ? Number(opts.page) : 1;
  const pageSize = opts.pageSize ? Number(opts.pageSize) : 20;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const [items, total] = await Promise.all([
    prisma.uploadFile.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    prisma.uploadFile.count({ where }),
  ]);

  return { items, total, page, pageSize: take };
}

// Tạo bản ghi file sau khi multer đã lưu file vật lý xong
async function create({
  originalName,
  storedName,
  mimeType,
  size,
  path,
  uploadedById,
}) {
  return prisma.uploadFile.create({
    data: {
      originalName,
      storedName,
      mimeType,
      size,
      path,
      uploadedById: Number(uploadedById),
    },
  });
}

// Xoá bản ghi (sau khi controller đã xoá file vật lý)
async function remove(id) {
  return prisma.uploadFile.delete({ where: { id: Number(id) } });
}

/**
 * Aggregate storage stats theo category.
 * Trả về mảng [{ mimePrefix, count, totalSize }] — service sẽ bucket theo category.
 *
 * @param {Object} [opts]
 * @param {Object} [opts.extraWhere] - Where bổ sung (vd: chỉ Admin -> mặc định filter deletedAt: null)
 */
async function aggregateByMimePrefix({ extraWhere = {} } = {}) {
  // groupBy mimePrefix (lấy phần trước "/" của mimeType). Prisma không có groupBy theo
  // derived column, nên ta fetch toàn bộ (count + size) rồi bucket phía service — chấp
  // nhận được vì bảng upload_files thường không quá lớn và storage stats không gọi liên tục.
  const rows = await prisma.uploadFile.findMany({
    where: { ...extraWhere, deletedAt: null },
    select: { mimeType: true, size: true },
  });
  return rows;
}

module.exports = {
  findById,
  findByIdIncludeDeleted,
  findManyByIds,
  findManyByIdsIncludeDeleted,
  findAll,
  create,
  remove,
  aggregateByMimePrefix,
};