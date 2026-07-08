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

module.exports = {
  findAllUsers,
  findUserByEmail,
  findUserById,
  findUserByIdIncludeDeleted,
  createUser,
  updateUser,
  deleteUser,
};