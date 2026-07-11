const prisma = require("../../config/database");
const { prismaInternal } = require("../../config/database");
const { notDeletedWhere, deletedOnlyWhere } = require("../../utils/softQuery");

/**
 * Lấy danh sách setting có filter + search.
 * Mặc định CHỈ trả record chưa xoá (theo prismaSoftDelete extension).
 *
 * @param {Object} [opts]
 * @param {string|null} [opts.group]   - filter exact match (null = không filter)
 * @param {string|null} [opts.search]  - keyword search (key / description / value)
 * @returns {Promise<Array>}
 */
async function findAll({ group = null, search = null } = {}) {
  const andClauses = [];
  if (group) andClauses.push({ group });
  if (search && String(search).trim() !== "") {
    const q = String(search).trim();
    // Search cả key (không có mode), description, value — đều là cột text.
    andClauses.push({
      OR: [
        { key: { contains: q } },
        { description: { contains: q, mode: "insensitive" } },
        { value: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  const where = andClauses.length === 0 ? {} : { AND: andClauses };

  return prisma.setting.findMany({
    where,
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });
}

/**
 * Lấy 1 setting theo key — CHỈ trả record chưa xoá.
 * Dùng prisma mặc định (extension đã tự filter deletedAt: null).
 */
async function findByKey(key) {
  return prisma.setting.findUnique({ where: { key } });
}

/**
 * Lấy 1 setting theo key, KỂ CẢ đã xoá — dùng cho restore/force-delete.
 * Phải dùng prismaInternal vì extension sẽ chặn record đã xoá.
 */
async function findByKeyIncludeDeleted(key) {
  return prismaInternal.setting.findUnique({ where: { key } });
}

// Lấy 1 setting theo id (dùng cho update/delete trong 1 số trường hợp)
async function findById(id) {
  return prisma.setting.findUnique({ where: { id: Number(id) } });
}

/**
 * Kiểm tra key đã tồn tại (kể cả đã xoá mềm) — dùng cho create để tránh trùng.
 * Phải dùng prismaInternal để xem được record đã xoá mềm.
 */
async function existsByKey(key) {
  const found = await prismaInternal.setting.findUnique({
    where: { key },
    select: { id: true },
  });
  return Boolean(found);
}

// Tạo mới
async function create({ key, value, description, group }) {
  return prisma.setting.create({
    data: {
      key,
      value,
      description: description ?? null,
      group: group ?? null,
    },
  });
}

// Cập nhật theo key (chỉ update field nào có trong patch)
async function updateByKey(key, { value, description, group }) {
  const data = {};
  if (value !== undefined) data.value = value;
  if (description !== undefined) data.description = description;
  if (group !== undefined) data.group = group;

  if (Object.keys(data).length === 0) {
    return prisma.setting.findUnique({ where: { key } });
  }

  return prisma.setting.update({
    where: { key },
    data,
  });
}

// Upsert theo key (dùng cho import).
// Trả về { action: "created" | "updated", record }.
async function upsertByKey({ key, value, description, group }) {
  const existing = await prismaInternal.setting.findUnique({ where: { key } });
  if (existing) {
    const updated = await prisma.setting.update({
      where: { key },
      data: {
        value: value ?? existing.value,
        description: description === undefined ? existing.description : description,
        group: group === undefined ? existing.group : group,
      },
    });
    return { action: "updated", record: updated };
  }
  const created = await prisma.setting.create({
    data: {
      key,
      value: value ?? "",
      description: description ?? null,
      group: group ?? null,
    },
  });
  return { action: "created", record: created };
}

/**
 * Xoá mềm theo key — set deletedAt + deletedById (gọi từ softDelete helper).
 * Repository không tự xoá cứng nữa; controller gọi qua softDelete("Setting", ...).
 */
async function softDeleteByKey(key, userId) {
  return prismaInternal.setting.updateMany({
    where: { key, deletedAt: null },
    data: { deletedAt: new Date(), deletedById: userId ?? null },
  });
}

/**
 * Khoảng 1 record (đã xoá) — dùng cho restore.
 * Phải dùng prismaInternal vì extension sẽ chặn record đã xoá.
 */
async function findDeletedByKey(key) {
  return prismaInternal.setting.findFirst({
    where: { key, deletedAt: { not: null } },
  });
}

/**
 * Build query filter CHỈ lấy record đã xoá mềm (cho TrashManager).
 * Bao gồm cả actor (deletedBy) để FE hiển thị "Người xoá".
 */
async function findDeletedMany({ from = null, to = null, deletedById = null, search = null } = {}) {
  const where = { deletedAt: { not: null } };
  if (from || to) {
    where.deletedAt = where.deletedAt || {};
    if (from) where.deletedAt.gte = new Date(from);
    if (to) where.deletedAt.lte = new Date(to);
  }
  if (deletedById) where.deletedById = Number(deletedById);
  if (search && String(search).trim()) {
    const q = String(search).trim();
    where.OR = [
      { key: { contains: q } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  return prismaInternal.setting.findMany({
    where,
    orderBy: { deletedAt: "desc" },
    include: {
      deletedBy: { select: { id: true, email: true, fullName: true, role: true } },
    },
  });
}

module.exports = {
  findAll,
  findByKey,
  findByKeyIncludeDeleted,
  findById,
  existsByKey,
  create,
  updateByKey,
  upsertByKey,
  softDeleteByKey,
  findDeletedByKey,
  findDeletedMany,
  // Re-export tiện cho controller unit-test nếu cần
  notDeletedWhere,
  deletedOnlyWhere,
};