const prisma = require("../../config/database");

// Lấy 1 file theo id
async function findById(id) {
  return prisma.uploadFile.findUnique({ where: { id: Number(id) } });
}

// Lấy danh sách file — có filter theo uploadedById (user thường chỉ xem của mình)
async function findAll({ uploadedById, page = 1, pageSize = 20 } = {}) {
  const where = {};
  if (uploadedById != null) where.uploadedById = Number(uploadedById);

  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  const [items, total] = await Promise.all([
    prisma.uploadFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.uploadFile.count({ where }),
  ]);

  return { items, total, page: Number(page), pageSize: take };
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
  findAll,
  create,
  remove,
};