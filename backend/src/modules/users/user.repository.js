const prisma = require("../../config/database");
const { prismaInternal } = require("../../config/database");

async function findAllUsers(where = {}) {
  return prisma.user.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      deletedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Lấy danh sách user có phân trang + sắp xếp ngay trong Prisma query
 * (skip/take + orderBy đúng chuẩn, KHÔNG filter/sort rồi slice ở JS).
 *
 * @param {Object} where        - Điều kiện lọc đã build sẵn (đã kèm deletedAt nếu cần)
 * @param {Object} orderBy      - Object orderBy của Prisma, vd: { createdAt: 'desc' }
 * @param {number} skip
 * @param {number} take
 * @returns {Promise<{items: User[], total: number}>}
 */
async function findUsersPaginated({ where = {}, orderBy = { createdAt: "desc" }, skip = 0, take = 10 }) {
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        deletedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total };
}

async function findUserByEmail(email) {
  return prisma.user.findFirst({
    where: { email, deletedAt: null },
  });
}

async function findUserById(id) {
  return prisma.user.findFirst({
    where: { id: Number(id), deletedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Tìm user kể cả đã bị soft-delete (dùng cho restore / force-delete).
 * Phải dùng prismaInternal vì prisma có extension ẩn bản ghi đã xóa.
 */
async function findUserByIdIncludeDeleted(id) {
  return prismaInternal.user.findUnique({
    where: { id: Number(id) },
  });
}

async function createUser(data) {
  return prisma.user.create({
    data,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });
}

async function updateUser(id, data) {
  return prisma.user.update({
    where: { id: Number(id) },
    data,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      updatedAt: true,
    },
  });
}

async function deleteUser(id) {
  return prisma.user.delete({
    where: { id: Number(id) },
  });
}

/**
 * Tìm nhiều user theo danh sách id, kể cả đã soft-delete (dùng prismaInternal).
 * Trả về Map<id, user> để tra nhanh, kèm cả user đã deletedAt để check đã xóa từ trước.
 */
async function findUsersByIdsIncludeDeleted(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return prismaInternal.user.findMany({
    where: { id: { in: ids.map(Number) } },
  });
}

/**
 * Update status cho nhiều user trong 1 câu lệnh (dùng trong transaction).
 * KHÔNG ghi audit log — audit sẽ được ghi từng dòng ở tầng service.
 */
async function updateManyUsersStatus(ids, status) {
  return prisma.user.updateMany({
    where: { id: { in: ids.map(Number) }, deletedAt: null },
    data: { status },
  });
}

/**
 * Soft-delete nhiều user trong 1 transaction. Dùng prismaInternal để set deletedAt
 * (vì prisma extended sẽ ẩn record ngay sau khi update — không cần nhưng an toàn hơn).
 *
 * @param {Object} tx          - Prisma transaction client
 * @param {number[]} ids
 * @returns {Promise<{count: number}>}
 */
async function softDeleteMany(tx, ids) {
  return tx.user.updateMany({
    where: { id: { in: ids.map(Number) }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}

/**
 * Lấy snapshot email/fullName/role/status cho nhiều user — dùng cho audit log meta
 * (để sau khi xóa vẫn biết user nào đã bị tác động).
 */
async function snapshotUsers(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return prismaInternal.user.findMany({
    where: { id: { in: ids.map(Number) } },
    select: { id: true, email: true, fullName: true, role: true, status: true },
  });
}

module.exports = {
  findAllUsers,
  findUsersPaginated,
  findUserByEmail,
  findUserById,
  findUserByIdIncludeDeleted,
  findUsersByIdsIncludeDeleted,
  createUser,
  updateUser,
  updateManyUsersStatus,
  softDeleteMany,
  snapshotUsers,
  deleteUser,
};