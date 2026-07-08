const prisma = require("../../config/database");

const VALID_TYPES = ["INFO", "SUCCESS", "WARNING", "ERROR"];

async function findAllByUser(userId, { isRead, page = 1, pageSize = 20 } = {}) {
  const where = { userId };
  if (typeof isRead === "boolean") where.isRead = isRead;

  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.notification.count({ where }),
  ]);

  return { items, total, page: Number(page), pageSize: take };
}

async function findByIdForUser(id, userId) {
  return prisma.notification.findFirst({
    where: { id: Number(id), userId },
  });
}

async function findById(id) {
  return prisma.notification.findUnique({ where: { id: Number(id) } });
}

async function create({ userId, type, title, message }) {
  return prisma.notification.create({
    data: {
      userId: Number(userId),
      type,
      title,
      message,
    },
  });
}

async function markRead(id, userId) {
  // findFirst để check ownership trước, tránh update nhầm
  const exist = await prisma.notification.findFirst({
    where: { id: Number(id), userId },
  });
  if (!exist) return null;
  return prisma.notification.update({
    where: { id: exist.id },
    data: { isRead: true },
  });
}

async function markAllRead(userId) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { updated: result.count };
}

async function remove(id, userId) {
  // Nếu userId truyền vào → chỉ xoá của user đó
  // Nếu userId là null → admin xoá bất kỳ
  const where = userId == null
    ? { id: Number(id) }
    : { id: Number(id), userId };
  const exist = await prisma.notification.findFirst({ where });
  if (!exist) return null;
  await prisma.notification.delete({ where: { id: exist.id } });
  return exist;
}

async function userExists(userId) {
  const u = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { id: true },
  });
  return !!u;
}

module.exports = {
  VALID_TYPES,
  findAllByUser,
  findByIdForUser,
  findById,
  create,
  markRead,
  markAllRead,
  remove,
  userExists,
};