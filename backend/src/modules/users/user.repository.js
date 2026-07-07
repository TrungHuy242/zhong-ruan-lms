const prisma = require("../../config/database");

async function findAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
  });
}

async function findUserById(id) {
  return prisma.user.findUnique({
    where: { id: Number(id) },
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
  createUser,
  updateUser,
  deleteUser,
};