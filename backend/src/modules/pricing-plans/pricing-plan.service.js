/**
 * pricing-plan.service.js — Business logic cho module PricingPlans.
 *
 * Chia 2 nhom ham:
 *   - Admin: listPlans, createPlan, getPlanById, updatePlan,
 *            deletePlan (soft), restorePlan, forceDeletePlan.
 *   - Public: listPublicPlans.
 *
 * Quy tac chung:
 *   - Validate input o service (khoi dung validator rieng).
 *   - Soft-delete/restore qua helper utils/softDelete (ghi audit tu dong).
 *   - Audit ghi qua audit.log / audit.logFromRequest.
 */

const pricingPlanRepository = require("./pricing-plan.repository");
const { validatePlanPayload, notFound } = require("./pricing-plan.helpers");
const { softDelete, restore, forceDelete } = require("../../utils/softDelete");
const { notDeletedWhere, parseFlags } = require("../../utils/softQuery");
const audit = require("../audit/audit.service");

// Whitelist sortBy cho admin (chong SQL injection qua Prisma).
const SORTABLE_FIELDS = {
  name: "name",
  classType: "classType",
  price: "price",
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
      { name: { contains: keyword, mode: "insensitive" } },
      { description: { contains: keyword, mode: "insensitive" } },
    ];
  }
  if (query.classType) {
    where.classType = String(query.classType);
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

async function listPlans(query = {}) {
  const flags = parseFlags(query);
  const { limit, page, skip } = parsePagination(query);
  const where = buildBaseWhere(query, flags);
  const { orderBy } = parseSort(query);

  const { items, total } = await pricingPlanRepository.findPlansPaginated({
    where,
    orderBy,
    skip,
    take: limit,
  });
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { plans: items, pagination: { page, limit, total, totalPages } };
}

async function createPlan(payload, req) {
  validatePlanPayload(payload, { isUpdate: false });

  const data = {
    name: String(payload.name).trim(),
    classType: String(payload.classType).trim(),
    price: Number(payload.price),
    priceUnit: String(payload.priceUnit).trim(),
    originalPrice:
      payload.originalPrice !== undefined && payload.originalPrice !== null && payload.originalPrice !== ""
        ? Number(payload.originalPrice)
        : null,
    description: String(payload.description).trim(),
    features: Array.isArray(payload.features) ? payload.features.map((f) => String(f).trim()) : [],
    courseSlug: payload.courseSlug ? String(payload.courseSlug).trim() : null,
    isFeatured: payload.isFeatured === true,
    isPublished: payload.isPublished !== false,
    displayOrder: Number(payload.displayOrder || 0),
  };

  const plan = await pricingPlanRepository.createPlan(data);
  await audit.log({
    userId: req.user.id,
    action: "ADMIN_PRICING_PLAN_CREATED",
    target: `PricingPlan:${plan.id}`,
    meta: { name: plan.name, classType: plan.classType, price: plan.price, isFeatured: plan.isFeatured },
    ip: req && req.ip,
    userAgent: req && req.headers && req.headers["user-agent"],
  });
  return plan;
}

async function getPlanById(id) {
  const plan = await pricingPlanRepository.findPlanById(id);
  if (!plan) throw notFound();
  return plan;
}

async function updatePlan(id, payload, req) {
  validatePlanPayload(payload, { isUpdate: true });

  const current = await pricingPlanRepository.findPlanByIdIncludeDeleted(String(id));
  if (!current) throw notFound();
  if (current.deletedAt) throw notFound();

  const updateData = {};

  if (payload.name !== undefined) updateData.name = String(payload.name).trim();
  if (payload.classType !== undefined) updateData.classType = String(payload.classType).trim();
  if (payload.price !== undefined) updateData.price = Number(payload.price);
  if (payload.priceUnit !== undefined) updateData.priceUnit = String(payload.priceUnit).trim();
  if (payload.originalPrice !== undefined) {
    updateData.originalPrice =
      payload.originalPrice !== null && payload.originalPrice !== "" ? Number(payload.originalPrice) : null;
  }
  if (payload.description !== undefined) updateData.description = String(payload.description).trim();
  if (payload.features !== undefined) {
    updateData.features = Array.isArray(payload.features) ? payload.features.map((f) => String(f).trim()) : [];
  }
  if (payload.courseSlug !== undefined) {
    updateData.courseSlug = payload.courseSlug ? String(payload.courseSlug).trim() : null;
  }
  if (payload.isFeatured !== undefined) updateData.isFeatured = payload.isFeatured === true;
  if (payload.isPublished !== undefined) updateData.isPublished = payload.isPublished === true;
  if (payload.displayOrder !== undefined) {
    updateData.displayOrder = Number(payload.displayOrder || 0);
  }

  const updated = await pricingPlanRepository.updatePlan(current.id, updateData);
  await audit.log({
    userId: req.user.id,
    action: "ADMIN_PRICING_PLAN_UPDATED",
    target: `PricingPlan:${updated.id}`,
    meta: { changes: payload },
    ip: req && req.ip,
    userAgent: req && req.headers && req.headers["user-agent"],
  });
  return updated;
}

async function deletePlan(id, currentUserId, req) {
  const plan = await pricingPlanRepository.findPlanByIdIncludeDeleted(String(id));
  if (!plan) throw notFound();

  if (plan.deletedAt) {
    return { id: plan.id, name: plan.name, deletedAt: plan.deletedAt, alreadyDeleted: true };
  }

  const deleted = await softDelete("PricingPlan", { id: String(id) }, { req, userId: currentUserId });
  if (!deleted) throw notFound();
  return { id: deleted.id, name: deleted.name, deletedAt: deleted.deletedAt };
}

async function restorePlan(id, currentUserId, req) {
  const plan = await pricingPlanRepository.findPlanByIdIncludeDeleted(String(id));
  if (!plan) throw notFound();

  const restored = await restore("PricingPlan", { id: String(id) }, { req, userId: currentUserId });
  if (!restored) throw notFound("Khong the khoi phuc goi hoc phi");
  return { id: restored.id, name: restored.name, deletedAt: restored.deletedAt };
}

async function forceDeletePlan(id, currentUserId, req) {
  const plan = await pricingPlanRepository.findPlanByIdIncludeDeleted(String(id));
  if (!plan) throw notFound();

  await forceDelete("PricingPlan", { id: String(id) }, { req, userId: currentUserId });
  return { id: String(id), hardDeleted: true };
}

// =====================================================================
// PUBLIC
// =====================================================================

async function listPublicPlans(query = {}) {
  // Public: chi tra isPublished=true, deletedAt=null.
  const where = { isPublished: true, deletedAt: null };
  const rawLimit = Number(query.limit);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;

  const { items, total } = await pricingPlanRepository.findPlansPaginated({
    where,
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    skip: 0,
    take: limit,
    select: pricingPlanRepository.PLAN_SELECT_PUBLIC,
  });
  return { plans: items, total };
}

module.exports = {
  // Admin
  listPlans,
  createPlan,
  getPlanById,
  updatePlan,
  deletePlan,
  restorePlan,
  forceDeletePlan,
  // Public
  listPublicPlans,
};
