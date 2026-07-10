const prisma = require("../../config/database");

const VALID_TYPES = ["INFO", "SUCCESS", "WARNING", "ERROR"];

async function findAllByUser(userId, opts) {
  opts = opts || {};
  const where = opts.where || { userId: userId };
  if (typeof opts.isRead === "boolean") where.isRead = opts.isRead;

  const page = opts.page ? Number(opts.page) : 1;
  const pageSize = opts.pageSize ? Number(opts.pageSize) : 20;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const items = await prisma.notification.findMany({
    where: where,
    orderBy: { createdAt: "desc" },
    skip: skip,
    take: take,
  });
  const total = await prisma.notification.count({ where: where });

  return { items: items, total: total, page: page, pageSize: take };
}

async function findByIdForUser(id, userId) {
  return prisma.notification.findFirst({
    where: { id: Number(id), userId, deletedAt: null },
  });
}

async function findById(id) {
  return prisma.notification.findUnique({ where: { id: Number(id) } });
}

/**
 * Tìm notification kể cả đã bị soft-delete (dùng cho restore / force-delete).
 */
async function findByIdIncludeDeleted(id) {
  const { prismaInternal } = require("../../config/database");
  return prismaInternal.notification.findUnique({ where: { id: Number(id) } });
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

/**
 * Tạo nhiều notification trong 1 lần (dùng cho broadcast theo role / tất cả).
 * Trả về danh sách record đã tạo (mảng).
 */
async function createMany(records) {
  if (!Array.isArray(records) || records.length === 0) return [];
  // createMany không trả về record trên một số driver Postgres, nên dùng create lặp
  // để đảm bảo có đầy đủ createdAt cho payload broadcast.
  const results = [];
  for (const r of records) {
    const created = await prisma.notification.create({
      data: {
        userId: Number(r.userId),
        type: r.type,
        title: r.title,
        message: r.message,
      },
    });
    results.push(created);
  }
  return results;
}

/**
 * Lấy id của tất cả user active (chưa xoá, status=ACTIVE).
 * Dùng để broadcast "Tất cả".
 */
async function findActiveUserIds() {
  const rows = await prisma.user.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Lấy id của user active theo role (ADMIN / TEACHER / STUDENT).
 * Dùng để broadcast theo vai trò.
 */
async function findActiveUserIdsByRole(role) {
  const rows = await prisma.user.findMany({
    where: { deletedAt: null, status: "ACTIVE", role },
    select: { id: true },
  });
  return rows.map((r) => r.id);
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
  findByIdIncludeDeleted,
  create,
  createMany,
  findActiveUserIds,
  findActiveUserIdsByRole,
  markRead,
  markAllRead,
  remove,
  userExists,
};