const prisma = require("../../config/database");

/**
 * Lấy danh sách setting có filter + search.
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

// Lấy 1 setting theo key
async function findByKey(key) {
  return prisma.setting.findUnique({ where: { key } });
}

// Lấy 1 setting theo id (dùng cho update/delete trong 1 số trường hợp)
async function findById(id) {
  return prisma.setting.findUnique({ where: { id: Number(id) } });
}

// Kiểm tra key đã tồn tại chưa
async function existsByKey(key) {
  const found = await prisma.setting.findUnique({
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
  const existing = await prisma.setting.findUnique({ where: { key } });
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

// Xoá theo key
async function removeByKey(key) {
  return prisma.setting.delete({ where: { key } });
}

module.exports = {
  findAll,
  findByKey,
  findById,
  existsByKey,
  create,
  updateByKey,
  upsertByKey,
  removeByKey,
};