/**
 * banner.repository.js — Data access layer cho module Banners.
 *
 * Pattern: soft-delete + displayOrder sort.
 */

const { prismaInternal } = require("../../config/database");

const prisma = prismaInternal;

/** Serialize banner row → API response shape. */
function serialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    imageUrl: row.imageUrl,
    ctaText: row.ctaText,
    ctaLink: row.ctaLink,
    badgeText: row.badgeText,
    startDate: row.startDate ? row.startDate.toISOString() : null,
    endDate: row.endDate ? row.endDate.toISOString() : null,
    isPublished: row.isPublished,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

/** Trả { banners, total } cho admin (bao gồm cả soft-deleted). */
async function listAdmin({ page = 1, limit = 20, sortBy = "displayOrder", sortDir = "asc" }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const allowedSort = ["displayOrder", "createdAt", "title", "isPublished"];
  const orderByField = allowedSort.includes(sortBy) ? sortBy : "displayOrder";
  const orderByDir = sortDir === "desc" ? "desc" : "asc";

  const where = {}; // admin: thấy cả deleted + not-deleted

  const [rows, total] = await Promise.all([
    prisma.banner.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip,
      take: safeLimit,
    }),
    prisma.banner.count({ where }),
  ]);

  return {
    banners: rows.map(serialize),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total > 0 ? Math.ceil(total / safeLimit) : 1,
    },
  };
}

/** Trả 1 banner theo id (admin: bao gồm deleted). */
async function findById(id) {
  const row = await prisma.banner.findUnique({ where: { id: String(id) } });
  return serialize(row);
}

/** Tạo banner mới. */
async function create(data) {
  const row = await prisma.banner.create({ data });
  return serialize(row);
}

/** Cập nhật banner. */
async function update(id, data) {
  const row = await prisma.banner.update({ where: { id: String(id) }, data });
  return serialize(row);
}

/** Soft-delete banner (set deletedAt + deletedById). */
async function softDelete(id, deletedById) {
  const row = await prisma.banner.update({
    where: { id: String(id) },
    data: { deletedAt: new Date(), deletedById },
  });
  return serialize(row);
}

/** Restore banner đã xóa mềm. */
async function restore(id) {
  const row = await prisma.banner.update({
    where: { id: String(id) },
    data: { deletedAt: null, deletedById: null },
  });
  return serialize(row);
}

/** Xóa cứng banner. */
async function forceDelete(id) {
  const row = await prisma.banner.delete({ where: { id: String(id) } });
  return serialize(row);
}

/**
 * Lấy banners cho public.
 * Filter:
 *   - deletedAt = null
 *   - isPublished = true
 *   - startDate IS NULL OR startDate <= now
 *   - endDate IS NULL OR endDate >= now
 * Sort: displayOrder ASC
 */
async function listPublic() {
  const now = new Date();
  const rows = await prisma.banner.findMany({
    where: {
      deletedAt: null,
      isPublished: true,
      OR: [
        { startDate: null },
        { startDate: { lte: now } },
      ],
      AND: [
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    },
    orderBy: { displayOrder: "asc" },
  });
  return rows.map(serialize);
}

module.exports = {
  listAdmin,
  findById,
  create,
  update,
  softDelete,
  restore,
  forceDelete,
  listPublic,
  serialize,
};
