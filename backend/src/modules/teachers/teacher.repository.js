/**
 * teacher.repository.js — Truy vấn Prisma thuần cho Teacher.
 *
 * - prisma (extended): auto-filter deletedAt: null. Dùng cho list/get thường.
 * - prismaInternal: KHÔNG filter, dùng cho soft-delete/restore/force-delete.
 *
 * Model id là String (UUID) — KHÔNG ép Number như User.
 */

const prisma = require("../../config/database");
const { prismaInternal } = require("../../config/database");

const TEACHER_SELECT = {
  id: true,
  fullName: true,
  slug: true,
  title: true,
  bio: true,
  bioShort: true,
  avatarUrl: true,
  yearsOfExperience: true,
  specialties: true,
  isFeatured: true,
  isPublished: true,
  displayOrder: true,
  linkedUserId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

const TEACHER_SELECT_PUBLIC = {
  id: true,
  fullName: true,
  slug: true,
  title: true,
  bio: true,
  bioShort: true,
  avatarUrl: true,
  yearsOfExperience: true,
  specialties: true,
  isFeatured: true,
  displayOrder: true,
  createdAt: true,
  updatedAt: true,
};

async function findTeachersPaginated({ where = {}, orderBy = [{ displayOrder: "asc" }, { createdAt: "desc" }], skip = 0, take = 10, select = TEACHER_SELECT }) {
  const [items, total] = await Promise.all([
    prisma.teacher.findMany({ where, orderBy, skip, take, select }),
    prisma.teacher.count({ where }),
  ]);
  return { items, total };
}

async function findTeacherById(id) {
  return prisma.teacher.findFirst({
    where: { id: String(id) },
    select: TEACHER_SELECT,
  });
}

async function findTeacherBySlug(slug) {
  return prisma.teacher.findFirst({
    where: { slug: String(slug) },
    select: TEACHER_SELECT,
  });
}

async function findTeacherByIdIncludeDeleted(id) {
  return prismaInternal.teacher.findUnique({
    where: { id: String(id) },
  });
}

async function findTeacherBySlugIncludeDeleted(slug) {
  return prismaInternal.teacher.findUnique({
    where: { slug: String(slug) },
  });
}

/**
 * Check slug đã tồn tại chưa (để tạo/sinh slug unique).
 * @param {string} slug
 * @param {string|null} excludeId - Bỏ qua record có id này (khi update).
 */
async function slugExists(slug, excludeId = null) {
  if (!slug) return false;
  const row = await prisma.teacher.findFirst({
    where: { slug: String(slug), deletedAt: null, NOT: excludeId ? { id: String(excludeId) } : undefined },
    select: { id: true },
  });
  return !!row;
}

async function createTeacher(data) {
  return prisma.teacher.create({
    data,
    select: TEACHER_SELECT,
  });
}

async function updateTeacher(id, data) {
  return prisma.teacher.update({
    where: { id: String(id) },
    data,
    select: TEACHER_SELECT,
  });
}

async function deleteTeacher(id) {
  return prismaInternal.teacher.delete({ where: { id: String(id) } });
}

/**
 * Check User ton tai + role=TEACHER cho field linkedUserId.
 * Tra ve true neu hop le (user ton tai, role=TEACHER, chua bi xoa mem).
 */
async function linkedUserExists(id) {
  if (!id && id !== 0) return false;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) return false;
  const row = await prisma.user.findFirst({
    where: { id: numeric, role: "TEACHER", deletedAt: null },
    select: { id: true },
  });
  return !!row;
}

/**
 * Lay danh sach user role=TEACHER (chua xoa mem), chi id+fullName+email.
 * Dung cho dropdown "Lien ket tai khoan" trong TeacherFormModal.
 */
async function listTeacherUserOptions() {
  return prisma.user.findMany({
    where: { role: "TEACHER", deletedAt: null },
    select: { id: true, fullName: true, email: true },
    orderBy: [{ fullName: "asc" }],
  });
}

module.exports = {
  TEACHER_SELECT,
  TEACHER_SELECT_PUBLIC,
  findTeachersPaginated,
  findTeacherById,
  findTeacherBySlug,
  findTeacherByIdIncludeDeleted,
  findTeacherBySlugIncludeDeleted,
  slugExists,
  linkedUserExists,
  listTeacherUserOptions,
  createTeacher,
  updateTeacher,
  deleteTeacher,
};
