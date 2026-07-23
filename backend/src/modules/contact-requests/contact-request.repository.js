/**
 * contact-request.repository.js — Truy vấn Prisma thuần cho ContactRequest.
 *
 * - prisma (extended): auto-filter deletedAt: null. Dùng cho list/get thường.
 * - prismaInternal: KHÔNG filter, dùng cho soft-delete/restore/force-delete.
 *
 * Model id là String (UUID).
 */

const prisma = require("../../config/database");
const { prismaInternal } = require("../../config/database");

const CONTACT_SELECT = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  message: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedById: true,
};

async function findContactsPaginated({
  where = {},
  orderBy = [{ createdAt: "desc" }],
  skip = 0,
  take = 20,
  select = CONTACT_SELECT,
}) {
  const [items, total] = await Promise.all([
    prisma.contactRequest.findMany({ where, orderBy, skip, take, select }),
    prisma.contactRequest.count({ where }),
  ]);
  return { items, total };
}

async function findContactById(id) {
  return prisma.contactRequest.findFirst({
    where: { id: String(id) },
    select: CONTACT_SELECT,
  });
}

async function findContactByIdIncludeDeleted(id) {
  return prismaInternal.contactRequest.findUnique({
    where: { id: String(id) },
  });
}

async function createContact(data) {
  return prisma.contactRequest.create({
    data,
    select: CONTACT_SELECT,
  });
}

async function updateContact(id, data) {
  return prisma.contactRequest.update({
    where: { id: String(id) },
    data,
    select: CONTACT_SELECT,
  });
}

async function countByStatus() {
  const rows = await prisma.contactRequest.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  return rows.reduce((acc, r) => {
    acc[r.status] = r._count._all;
    return acc;
  }, {});
}

module.exports = {
  CONTACT_SELECT,
  findContactsPaginated,
  findContactById,
  findContactByIdIncludeDeleted,
  createContact,
  updateContact,
  countByStatus,
};