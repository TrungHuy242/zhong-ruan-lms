/**
 * pricing-plan.repository.js — Truy vấn Prisma thuần cho PricingPlan.
 *
 * - prisma (extended): auto-filter deletedAt: null. Dùng cho list/get thường.
 * - prismaInternal: KHÔNG filter, dùng cho soft-delete/restore/force-delete.
 *
 * Model id là String (UUID).
 */

const prisma = require("../../config/database");
const { prismaInternal } = require("../../config/database");

const PLAN_SELECT = {
  id: true,
  name: true,
  classType: true,
  price: true,
  priceUnit: true,
  originalPrice: true,
  description: true,
  features: true,
  courseSlug: true,
  isFeatured: true,
  isPublished: true,
  displayOrder: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedById: true,
};

const PLAN_SELECT_PUBLIC = {
  id: true,
  name: true,
  classType: true,
  price: true,
  priceUnit: true,
  originalPrice: true,
  description: true,
  features: true,
  courseSlug: true,
  isFeatured: true,
  displayOrder: true,
};

async function findPlansPaginated({ where = {}, orderBy = [{ displayOrder: "asc" }, { createdAt: "desc" }], skip = 0, take = 10, select = PLAN_SELECT }) {
  const [items, total] = await Promise.all([
    prisma.pricingPlan.findMany({ where, orderBy, skip, take, select }),
    prisma.pricingPlan.count({ where }),
  ]);
  return { items, total };
}

async function findPlanById(id) {
  return prisma.pricingPlan.findFirst({
    where: { id: String(id) },
    select: PLAN_SELECT,
  });
}

async function findPlanByIdIncludeDeleted(id) {
  return prismaInternal.pricingPlan.findUnique({
    where: { id: String(id) },
  });
}

async function createPlan(data) {
  return prisma.pricingPlan.create({
    data,
    select: PLAN_SELECT,
  });
}

async function updatePlan(id, data) {
  return prisma.pricingPlan.update({
    where: { id: String(id) },
    data,
    select: PLAN_SELECT,
  });
}

async function deletePlan(id) {
  return prismaInternal.pricingPlan.delete({ where: { id: String(id) } });
}

module.exports = {
  PLAN_SELECT,
  PLAN_SELECT_PUBLIC,
  findPlansPaginated,
  findPlanById,
  findPlanByIdIncludeDeleted,
  createPlan,
  updatePlan,
  deletePlan,
};
