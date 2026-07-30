/**
 * enrollment-schedule.repository.js — Data access layer cho module EnrollmentSchedule.
 *
 * Pattern: soft-delete + displayOrder sort.
 * Singleton-style: public API chỉ lấy 1 bản ghi (xem getActive).
 */

const { prismaInternal } = require("../../config/database");

const prisma = prismaInternal;

/**
 * Serialize row → API response shape.
 * Mọi field đều pass-through (Postgres đã lưu text[] → JS array).
 */
function serialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    coursesEnrolling: row.coursesEnrolling ?? [],
    morningTimes: row.morningTimes,
    afternoonTimes: row.afternoonTimes,
    eveningTimes: row.eveningTimes,
    scheduleGroupA: row.scheduleGroupA,
    scheduleGroupB: row.scheduleGroupB,
    note: row.note,
    tagline: row.tagline,
    ctaText: row.ctaText,
    ctaLink: row.ctaLink,
    phoneNumbers: row.phoneNumbers ?? [],
    isPublished: row.isPublished,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

/** Trả { schedules, total } cho admin (bao gồm cả soft-deleted). */
async function listAdmin({ page = 1, limit = 20, sortBy = "displayOrder", sortDir = "asc" }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const allowedSort = ["displayOrder", "createdAt", "updatedAt", "title"];
  const orderByField = allowedSort.includes(sortBy) ? sortBy : "displayOrder";
  const orderByDir = sortDir === "desc" ? "desc" : "asc";

  const where = {}; // admin: thấy cả deleted + not-deleted

  const [rows, total] = await Promise.all([
    prisma.enrollmentSchedule.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip,
      take: safeLimit,
    }),
    prisma.enrollmentSchedule.count({ where }),
  ]);

  return {
    schedules: rows.map(serialize),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total > 0 ? Math.ceil(total / safeLimit) : 1,
    },
  };
}

/** Trả 1 schedule theo id (admin: bao gồm deleted). */
async function findById(id) {
  const row = await prisma.enrollmentSchedule.findUnique({ where: { id: String(id) } });
  return serialize(row);
}

/** Tạo mới. */
async function create(data) {
  const row = await prisma.enrollmentSchedule.create({ data });
  return serialize(row);
}

/** Cập nhật. */
async function update(id, data) {
  const row = await prisma.enrollmentSchedule.update({ where: { id: String(id) }, data });
  return serialize(row);
}

/** Soft-delete (set deletedAt + deletedById) — tầng BE/service xử lý. */
async function softDelete(id, deletedById) {
  const row = await prisma.enrollmentSchedule.update({
    where: { id: String(id) },
    data: { deletedAt: new Date(), deletedById },
  });
  return serialize(row);
}

/** Restore — clear deletedAt + deletedById. */
async function restore(id) {
  const row = await prisma.enrollmentSchedule.update({
    where: { id: String(id) },
    data: { deletedAt: null, deletedById: null },
  });
  return serialize(row);
}

/** Force-delete — xoá cứng row. */
async function forceDelete(id) {
  await prisma.enrollmentSchedule.delete({ where: { id: String(id) } });
}

/**
 * Lấy 1 schedule cho public (singleton-style).
 * Filter:
 *   - deletedAt = null
 *   - isPublished = true
 * Sort: displayOrder ASC, tiebreak createdAt DESC (lấy bản mới nhất khi trùng order).
 * Trả về null nếu không có bản nào thỏa mãn (Caller FE sẽ fallback ẩn block).
 */
async function getActive() {
  const row = await prisma.enrollmentSchedule.findFirst({
    where: {
      deletedAt: null,
      isPublished: true,
    },
    orderBy: [
      { displayOrder: "asc" },
      { createdAt: "desc" },
    ],
  });
  return serialize(row);
}

module.exports = {
  listAdmin,
  findById,
  create,
  update,
  softDelete,
  restore,
  forceDelete,
  getActive,
  serialize,
};
