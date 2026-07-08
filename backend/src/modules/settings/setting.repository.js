const prisma = require("../../config/database");

// Lấy toàn bộ setting, sắp xếp theo key ASC cho dễ tra cứu
async function findAll() {
  return prisma.setting.findMany({
    orderBy: { key: "asc" },
  });
}

// Lấy 1 setting theo key
async function findByKey(key) {
  return prisma.setting.findUnique({ where: { key } });
}

// Lấy 1 setting theo id (dùng cho update/delete trong 1 số trường hợp)
async function findById(id) {
  return prisma.setting.findUnique({ where: { id: Number(id) } });
}

// Kiểm tra key đã tồn tại chưa
async function existsByKey(key) {
  const found = await prisma.setting.findUnique({
    where: { key },
    select: { id: true },
  });
  return Boolean(found);
}

// Tạo mới
async function create({ key, value, description }) {
  return prisma.setting.create({
    data: {
      key,
      value,
      description: description ?? null,
    },
  });
}

// Cập nhật theo key
async function updateByKey(key, { value, description }) {
  const data = {};
  if (value !== undefined) data.value = value;
  if (description !== undefined) data.description = description;

  return prisma.setting.update({
    where: { key },
    data,
  });
}

// Xoá theo key
async function removeByKey(key) {
  return prisma.setting.delete({ where: { key } });
}

module.exports = {
  findAll,
  findByKey,
  findById,
  existsByKey,
  create,
  updateByKey,
  removeByKey,
};