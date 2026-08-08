/**
 * testimonial.repository.js — Data access layer cho module Testimonial.
 *
 * Pattern: soft-delete + displayOrder sort, giống EnrollmentSchedule.
 * Public API chỉ trả về các testimonial đã isPublished=true và chưa bị soft-delete.
 */

const { prismaInternal } = require("../../config/database");

// Prisma extension tự động filter deletedAt: null. Hiện auto-filter cho 3 model
// (user/notification/uploadFile). Testimonial dùng trực tiếp prismaInternal để
// tự filter deletedAt: null — tránh phải mở rộng extension cho module mới.
const prisma = prismaInternal;

const TESTIMONIAL_SELECT = {
  id: true,
  studentName: true,
  courseInfo: true,
  content: true,
  rating: true,
  avatarUrl: true,
  source: true,
  isFeatured: true,
  isPublished: true,
  displayOrder: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

/**
 * Serialize row → API response shape (chuẩn hoá Date → ISO string).
 */
function serialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    studentName: row.studentName,
    courseInfo: row.courseInfo,
    content: row.content,
    rating: row.rating,
    avatarUrl: row.avatarUrl,
    source: row.source,
    isFeatured: row.isFeatured,
    isPublished: row.isPublished,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

/** Admin: danh sách có phân trang, sort theo sortBy/sortDir (whitelist). */
async function listAdmin({ page = 1, limit = 20, sortBy = "displayOrder", sortDir = "asc" }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const allowedSort = ["displayOrder", "createdAt", "updatedAt", "rating", "studentName"];
  const orderByField = allowedSort.includes(sortBy) ? sortBy : "displayOrder";
  const orderByDir = sortDir === "desc" ? "desc" : "asc";

  const where = {}; // admin: thấy cả deleted + not-deleted

  const [rows, total] = await Promise.all([
    prismaInternal.testimonial.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip,
      take: safeLimit,
    }),
    prismaInternal.testimonial.count({ where }),
  ]);

  return {
    testimonials: rows.map(serialize),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total > 0 ? Math.ceil(total / safeLimit) : 1,
    },
  };
}

/** Admin: 1 testimonial theo id (bao gồm deleted). */
async function findById(id) {
  const row = await prismaInternal.testimonial.findUnique({ where: { id: String(id) } });
  return serialize(row);
}

async function create(data) {
  const row = await prismaInternal.testimonial.create({ data });
  return serialize(row);
}

async function update(id, data) {
  const row = await prismaInternal.testimonial.update({
    where: { id: String(id) },
    data,
  });
  return serialize(row);
}

async function softDelete(id, deletedById) {
  const row = await prismaInternal.testimonial.update({
    where: { id: String(id) },
    data: { deletedAt: new Date(), deletedById },
  });
  return serialize(row);
}

async function restore(id) {
  const row = await prismaInternal.testimonial.update({
    where: { id: String(id) },
    data: { deletedAt: null, deletedById: null },
  });
  return serialize(row);
}

async function forceDelete(id) {
  await prismaInternal.testimonial.delete({ where: { id: String(id) } });
}

/**
 * Public: lấy danh sách testimonial published, sort theo displayOrder ASC
 * (tiebreak createdAt DESC). Hỗ trợ `limit` (mặc định trả tất cả nếu không truyền).
 */
async function listPublic({ limit = null } = {}) {
  const where = { isPublished: true, deletedAt: null };
  const orderBy = [
    { displayOrder: "asc" },
    { createdAt: "desc" },
  ];
  const take = limit && Number.isInteger(Number(limit)) && Number(limit) > 0
    ? Math.min(100, Number(limit))
    : undefined;

  const rows = await prisma.testimonial.findMany({ where, orderBy, take });
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