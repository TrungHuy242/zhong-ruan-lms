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

// Lấy danh sách file — có filter theo uploadedById (user thường chỉ xem của mình)
async function findAll(opts) {
  opts = opts || {};
  const where = opts.where || {};
  if (opts.uploadedById != null) where.uploadedById = Number(opts.uploadedById);

  const page = opts.page ? Number(opts.page) : 1;
  const pageSize = opts.pageSize ? Number(opts.pageSize) : 20;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const items = await prisma.uploadFile.findMany({
    where: where,
    orderBy: { createdAt: "desc" },
    skip: skip,
    take: take,
  });
  const total = await prisma.uploadFile.count({ where: where });

  return { items: items, total: total, page: page, pageSize: take };
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

module.exports = {
  findById,
  findByIdIncludeDeleted,
  findAll,
  create,
  remove,
};