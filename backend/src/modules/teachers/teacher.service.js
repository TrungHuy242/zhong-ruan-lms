/**
 * teacher.service.js — Business logic cho module Teachers.
 *
 * Chia 2 nhom ham:
 *   - Admin: listTeachers, createTeacher, getTeacherById, updateTeacher,
 *            deleteTeacher (soft), restoreTeacher, forceDeleteTeacher.
 *   - Public: listPublicTeachers, listFeaturedTeachers, getPublicTeacherBySlug.
 *
 * Quy tac chung:
 *   - Validate input o service (khoi dung validator rieng).
 *   - Auto-generate slug tu fullName neu khong truyen (qua ensureUniqueSlug).
 *   - Soft-delete/restore qua helper utils/softDelete (ghi audit tu dong).
 *   - Audit ghi qua audit.log / audit.logFromRequest.
 */

const teacherRepository = require("./teacher.repository");
const {
  slugify,
  ensureUniqueSlug,
  validateTeacherPayload,
  notFound,
  badRequest,
} = require("./teacher.helpers");
const { softDelete, restore, forceDelete } = require("../../utils/softDelete");
const { notDeletedWhere, parseFlags } = require("../../utils/softQuery");
const audit = require("../audit/audit.service");

// Whitelist sortBy cho admin (chong SQL injection qua Prisma).
const SORTABLE_FIELDS = {
  fullName: "fullName",
  title: "title",
  isFeatured: "isFeatured",
  isPublished: "isPublished",
  displayOrder: "displayOrder",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

const ALLOWED_LIMITS = [10, 20, 50];

function buildBaseWhere(query, flags) {
  const where = notDeletedWhere({}, flags);
  const keyword = (query.keyword ?? query.search ?? "").toString().trim();
  if (keyword) {
    where.OR = [
      { fullName: { contains: keyword, mode: "insensitive" } },
      { slug: { contains: keyword.toLowerCase(), mode: "insensitive" } },
      { title: { contains: keyword, mode: "insensitive" } },
    ];
  }
  if (query.fullName) {
    where.fullName = { contains: String(query.fullName), mode: "insensitive" };
  }
  if (query.title) {
    where.title = { contains: String(query.title), mode: "insensitive" };
  }
  if (typeof query.isFeatured === "string") {
    if (query.isFeatured === "true" || query.isFeatured === "1") where.isFeatured = true;
    else if (query.isFeatured === "false" || query.isFeatured === "0") where.isFeatured = false;
  }
  if (typeof query.isPublished === "string") {
    if (query.isPublished === "true" || query.isPublished === "1") where.isPublished = true;
    else if (query.isPublished === "false" || query.isPublished === "0") where.isPublished = false;
  }
  return where;
}

function parsePagination(query) {
  const rawLimit = Number(query.limit);
  const limit = ALLOWED_LIMITS.includes(rawLimit) ? rawLimit : 10;
  const page = Math.max(1, Number(query.page) || 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

function parseSort(query) {
  const sortBy = SORTABLE_FIELDS[query.sortBy] ? query.sortBy : "displayOrder";
  const sortOrder = String(query.sortOrder).toLowerCase() === "asc" ? "asc" : "desc";
  const secondary = sortBy === "displayOrder" ? "createdAt" : "displayOrder";
  return { orderBy: [{ [sortBy]: sortOrder }, { [secondary]: sortOrder }] };
}

// =====================================================================
// ADMIN
// =====================================================================

async function listTeachers(query = {}) {
  const flags = parseFlags(query);
  const { limit, page, skip } = parsePagination(query);
  const where = buildBaseWhere(query, flags);
  const { orderBy } = parseSort(query);

  const { items, total } = await teacherRepository.findTeachersPaginated({
    where,
    orderBy,
    skip,
    take: limit,
  });
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { teachers: items, pagination: { page, limit, total, totalPages } };
}

/**
 * Lay danh sach user role=TEACHER (id + fullName + email) cho dropdown
 * "Lien ket tai khoan" trong TeacherFormModal. KHONG filter giang vien —
 * muc dich chi de Admin tham khao nhanh.
 */
async function listTeacherUserOptions() {
  return teacherRepository.listTeacherUserOptions();
}

async function createTeacher(payload, req) {
  validateTeacherPayload(payload, { isUpdate: false });

  // Tu sinh slug neu khong truyen, hoac nhan slug do admin tu dat.
  let slug = (payload.slug ? String(payload.slug).trim() : "");
  if (slug) {
    // Admin tu dat slug -> check trung, giu nguyen (khong tu them suffix -2 vi admin da chu dich).
    const exists = await teacherRepository.slugExists(slug);
    if (exists) throw notFound("Slug da ton tai"); // thuc ra la conflict; dung notFound tam vi pattern service khong co CONFLICT
  } else {
    slug = await ensureUniqueSlug(
      (s, excludeId) => teacherRepository.slugExists(s, excludeId),
      slugify(payload.fullName)
    );
  }

  const data = {
    fullName: String(payload.fullName).trim(),
    slug,
    title: String(payload.title).trim(),
    bio: String(payload.bio).trim(),
    bioShort: String(payload.bioShort).trim(),
    avatarUrl: payload.avatarUrl ? String(payload.avatarUrl).trim() : null,
    yearsOfExperience: payload.yearsOfExperience ?? null,
    specialties: Array.isArray(payload.specialties)
      ? payload.specialties.map((s) => String(s).trim())
      : [],
    isFeatured: payload.isFeatured === true,
    isPublished: payload.isPublished === false ? false : true,
    displayOrder: Number(payload.displayOrder || 0),
  };

  // linkedUserId: optional, nullable. Validate user ton tai + role=TEACHER truoc khi gan.
  if (payload.linkedUserId !== undefined && payload.linkedUserId !== null) {
    const valid = await teacherRepository.linkedUserExists(payload.linkedUserId);
    if (!valid) {
      throw badRequest("linkedUserId khong hop le (user khong ton tai hoac khong phai role TEACHER)");
    }
    data.linkedUserId = Number(payload.linkedUserId);
  } else {
    data.linkedUserId = null;
  }

  const teacher = await teacherRepository.createTeacher(data);
  await audit.log({
    userId: req.user.id,
    action: "ADMIN_TEACHER_CREATED",
    target: `Teacher:${teacher.id}`,
    meta: { fullName: teacher.fullName, slug: teacher.slug, isFeatured: teacher.isFeatured, isPublished: teacher.isPublished },
    ip: req && req.ip,
    userAgent: req && req.headers && req.headers["user-agent"],
  });
  return teacher;
}

async function getTeacherById(id) {
  const teacher = await teacherRepository.findTeacherById(id);
  if (!teacher) throw notFound("Khong tim thay giang vien");
  return teacher;
}

async function updateTeacher(id, payload, req) {
  validateTeacherPayload(payload, { isUpdate: true });

  const current = await teacherRepository.findTeacherByIdIncludeDeleted(String(id));
  if (!current) throw notFound("Khong tim thay giang vien");
  if (current.deletedAt) throw notFound("Khong tim thay giang vien"); // teacher da xoa mem -> khong update

  const updateData = {};

  if (payload.fullName !== undefined) updateData.fullName = String(payload.fullName).trim();
  if (payload.title !== undefined) updateData.title = String(payload.title).trim();
  if (payload.bio !== undefined) updateData.bio = String(payload.bio).trim();
  if (payload.bioShort !== undefined) updateData.bioShort = String(payload.bioShort).trim();
  if (payload.avatarUrl !== undefined) {
    updateData.avatarUrl = payload.avatarUrl ? String(payload.avatarUrl).trim() : null;
  }
  if (payload.yearsOfExperience !== undefined) {
    updateData.yearsOfExperience = payload.yearsOfExperience ?? null;
  }
  if (payload.specialties !== undefined) {
    updateData.specialties = Array.isArray(payload.specialties)
      ? payload.specialties.map((s) => String(s).trim())
      : [];
  }
  if (payload.isFeatured !== undefined) updateData.isFeatured = payload.isFeatured === true;
  if (payload.isPublished !== undefined) updateData.isPublished = payload.isPublished === true;
  if (payload.displayOrder !== undefined) {
    updateData.displayOrder = Number(payload.displayOrder || 0);
  }
  if (payload.linkedUserId !== undefined) {
    if (payload.linkedUserId === null) {
      updateData.linkedUserId = null;
    } else {
      const valid = await teacherRepository.linkedUserExists(payload.linkedUserId);
      if (!valid) {
        throw badRequest("linkedUserId khong hop le (user khong ton tai hoac khong phai role TEACHER)");
      }
      updateData.linkedUserId = Number(payload.linkedUserId);
    }
  }

  // Slug update: neu admin truyen slug moi -> check trung (tru chinh no).
  if (payload.slug !== undefined && payload.slug !== null) {
    const newSlug = String(payload.slug).trim();
    if (newSlug && newSlug !== current.slug) {
      const exists = await teacherRepository.slugExists(newSlug, current.id);
      if (exists) throw notFound("Slug da ton tai");
      updateData.slug = newSlug;
    }
  } else if (payload.fullName !== undefined && payload.fullName !== current.fullName) {
    // fullName doi ma slug khong doi -> tu sinh lai slug cho khop.
    const newSlug = await ensureUniqueSlug(
      (s, excludeId) => teacherRepository.slugExists(s, excludeId),
      slugify(updateData.fullName || current.fullName),
      current.id
    );
    updateData.slug = newSlug;
  }

  const updated = await teacherRepository.updateTeacher(current.id, updateData);
  await audit.log({
    userId: req.user.id,
    action: "ADMIN_TEACHER_UPDATED",
    target: `Teacher:${updated.id}`,
    meta: { changes: payload, slugChanged: updateData.slug && updateData.slug !== current.slug },
    ip: req && req.ip,
    userAgent: req && req.headers && req.headers["user-agent"],
  });
  return updated;
}

async function deleteTeacher(id, currentUserId, req) {
  const numericOrUuid = String(id);
  const teacher = await teacherRepository.findTeacherByIdIncludeDeleted(numericOrUuid);
  if (!teacher) throw notFound("Khong tim thay giang vien");

  if (teacher.deletedAt) {
    return { id: teacher.id, fullName: teacher.fullName, deletedAt: teacher.deletedAt, alreadyDeleted: true };
  }

  const deleted = await softDelete(
    "Teacher",
    { id: numericOrUuid },
    { req, userId: currentUserId }
  );
  if (!deleted) throw notFound("Khong tim thay giang vien");
  return { id: deleted.id, fullName: deleted.fullName, deletedAt: deleted.deletedAt };
}

async function restoreTeacher(id, currentUserId, req) {
  const numericOrUuid = String(id);
  const teacher = await teacherRepository.findTeacherByIdIncludeDeleted(numericOrUuid);
  if (!teacher) throw notFound("Khong tim thay giang vien");

  const restored = await restore(
    "Teacher",
    { id: numericOrUuid },
    { req, userId: currentUserId }
  );
  if (!restored) throw notFound("Khong the khoi phuc giang vien");
  return { id: restored.id, fullName: restored.fullName, deletedAt: restored.deletedAt };
}

async function forceDeleteTeacher(id, currentUserId, req) {
  const numericOrUuid = String(id);
  const teacher = await teacherRepository.findTeacherByIdIncludeDeleted(numericOrUuid);
  if (!teacher) throw notFound("Khong tim thay giang vien");

  await forceDelete(
    "Teacher",
    { id: numericOrUuid },
    { req, userId: currentUserId }
  );
  return { id: numericOrUuid, hardDeleted: true };
}

// =====================================================================
// PUBLIC
// =====================================================================

async function listPublicTeachers(query = {}) {
  // Public: luon chi tra isPublished=true, deletedAt=null.
  const where = { isPublished: true };
  const { limit, page, skip } = parsePagination(query);
  const keyword = (query.keyword ?? query.search ?? "").toString().trim();
  if (keyword) {
    where.OR = [
      { fullName: { contains: keyword, mode: "insensitive" } },
      { title: { contains: keyword, mode: "insensitive" } },
      { bioShort: { contains: keyword, mode: "insensitive" } },
    ];
  }
  if (query.specialty) {
    // Postgres String[] contains check (case-insensitive qua chuoi da luu nguyen).
    where.specialties = { has: String(query.specialty) };
  }

  const orderBy = [{ displayOrder: "asc" }, { createdAt: "desc" }];

  const { items, total } = await teacherRepository.findTeachersPaginated({
    where,
    orderBy,
    skip,
    take: limit,
    select: teacherRepository.TEACHER_SELECT_PUBLIC,
  });
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { teachers: items, pagination: { page, limit, total, totalPages } };
}

async function listFeaturedTeachers(query = {}) {
  const where = { isPublished: true, isFeatured: true };
  const rawLimit = Number(query.limit);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 && rawLimit <= 50 ? rawLimit : 6;
  const { items, total } = await teacherRepository.findTeachersPaginated({
    where,
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    skip: 0,
    take: limit,
    select: teacherRepository.TEACHER_SELECT_PUBLIC,
  });
  return { teachers: items, total };
}

async function getPublicTeacherBySlug(slug) {
  // Public: chi tra teacher published + chua xoa mem.
  const teacher = await teacherRepository.findTeacherBySlug(slug);
  if (!teacher || !teacher.isPublished) {
    throw notFound("Khong tim thay giang vien");
  }
  return teacher;
}

module.exports = {
  // Admin
  listTeachers,
  listTeacherUserOptions,
  createTeacher,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  restoreTeacher,
  forceDeleteTeacher,
  // Public
  listPublicTeachers,
  listFeaturedTeachers,
  getPublicTeacherBySlug,
};
