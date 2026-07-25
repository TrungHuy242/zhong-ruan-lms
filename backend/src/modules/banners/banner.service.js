/**
 * banner.service.js — Business logic cho module Banners.
 *
 * Admin: list, create, update, delete (soft), restore, forceDelete.
 * Public: listActive (filtered by time window).
 *
 * Soft-delete/restore qua helper utils/softDelete.
 * Audit log qua audit.service.
 */

const bannerRepository = require("./banner.repository");
const { softDelete, restore, forceDelete } = require("../../utils/softDelete");
const audit = require("../audit/audit.service");

/** Validate payload khi tạo/cập nhật banner. */
function validatePayload(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate) {
    if (!data.title || String(data.title).trim() === "") {
      errors.push("title là bắt buộc");
    }
    if (!data.imageUrl || String(data.imageUrl).trim() === "") {
      errors.push("imageUrl là bắt buộc");
    }
  }

  if (data.title !== undefined && String(data.title || "").trim() === "") {
    errors.push("title không được rỗng");
  }
  if (data.imageUrl !== undefined && String(data.imageUrl || "").trim() === "") {
    errors.push("imageUrl không được rỗng");
  }
  if (data.ctaLink !== undefined && data.ctaLink !== null && String(data.ctaLink).trim() !== "") {
    if (!/^\//.test(data.ctaLink) && !/^https?:\/\//.test(data.ctaLink)) {
      errors.push("ctaLink phải là đường dẫn tuyệt đối (/) hoặc URL (https://)");
    }
  }
  if (data.startDate !== undefined && data.startDate !== null) {
    const d = new Date(data.startDate);
    if (isNaN(d.getTime())) errors.push("startDate không hợp lệ");
  }
  if (data.endDate !== undefined && data.endDate !== null) {
    const d = new Date(data.endDate);
    if (isNaN(d.getTime())) errors.push("endDate không hợp lệ");
  }
  if (
    data.startDate !== undefined && data.endDate !== undefined &&
    data.startDate !== null && data.endDate !== null
  ) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end <= start) {
      errors.push("endDate phải sau startDate");
    }
  }

  if (errors.length > 0) {
    const e = new Error(errors.join("; "));
    e.code = "VALIDATION_ERROR";
    throw e;
  }
}

function notFound(id) {
  const e = new Error(`Không tìm thấy banner với id = ${id}`);
  e.code = "NOT_FOUND";
  return e;
}

// ===== ADMIN =====

async function listBanners(query) {
  return bannerRepository.listAdmin({
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });
}

async function getBannerById(id) {
  const row = await bannerRepository.findById(id);
  if (!row) throw notFound(id);
  return row;
}

async function createBanner(data, currentUserId, req = null) {
  validatePayload(data, false);

  const payload = {
    title: String(data.title).trim(),
    subtitle: data.subtitle ? String(data.subtitle).trim() : null,
    imageUrl: String(data.imageUrl).trim(),
    ctaText: data.ctaText ? String(data.ctaText).trim() : null,
    ctaLink: data.ctaLink ? String(data.ctaLink).trim() : null,
    badgeText: data.badgeText ? String(data.badgeText).trim() : null,
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : true,
    displayOrder: Number.isFinite(Number(data.displayOrder)) ? Number(data.displayOrder) : 0,
  };

  const created = await bannerRepository.create(payload);

  await audit.logFromRequest(req, {
    userId: currentUserId,
    action: "BANNER_CREATED",
    target: `Banner:${created.id}`,
    meta: { title: created.title },
  });

  return created;
}

async function updateBanner(id, data, currentUserId, req = null) {
  validatePayload(data, true);

  const existing = await bannerRepository.findById(id);
  if (!existing) throw notFound(id);

  const payload = {};
  if (data.title !== undefined) payload.title = String(data.title).trim();
  if (data.subtitle !== undefined) payload.subtitle = data.subtitle ? String(data.subtitle).trim() : null;
  if (data.imageUrl !== undefined) payload.imageUrl = String(data.imageUrl).trim();
  if (data.ctaText !== undefined) payload.ctaText = data.ctaText ? String(data.ctaText).trim() : null;
  if (data.ctaLink !== undefined) payload.ctaLink = data.ctaLink ? String(data.ctaLink).trim() : null;
  if (data.badgeText !== undefined) payload.badgeText = data.badgeText ? String(data.badgeText).trim() : null;
  if (data.startDate !== undefined) payload.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) payload.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.isPublished !== undefined) payload.isPublished = Boolean(data.isPublished);
  if (Number.isFinite(Number(data.displayOrder))) payload.displayOrder = Number(data.displayOrder);

  const updated = await bannerRepository.update(id, payload);

  await audit.logFromRequest(req, {
    userId: currentUserId,
    action: "BANNER_UPDATED",
    target: `Banner:${id}`,
    meta: { title: updated.title },
  });

  return updated;
}

async function deleteBanner(id, currentUserId, req = null) {
  const existing = await bannerRepository.findById(id);
  if (!existing) throw notFound(id);

  await softDelete("Banner", { id: String(id) }, { req, userId: currentUserId });

  await audit.logFromRequest(req, {
    userId: currentUserId,
    action: "BANNER_DELETED",
    target: `Banner:${id}`,
    meta: { title: existing.title },
  });

  return { id, deleted: true };
}

async function restoreBanner(id, currentUserId, req = null) {
  const existing = await bannerRepository.findById(id);
  if (!existing) throw notFound(id);

  const restored = await restore("Banner", { id: String(id) }, { req, userId: currentUserId });

  await audit.logFromRequest(req, {
    userId: currentUserId,
    action: "BANNER_RESTORED",
    target: `Banner:${id}`,
    meta: { title: restored.title },
  });

  return { id, restored: true };
}

async function forceDeleteBanner(id, currentUserId, req = null) {
  const existing = await bannerRepository.findById(id);
  if (!existing) throw notFound(id);

  await forceDelete("Banner", { id: String(id) }, { req, userId: currentUserId });

  await audit.logFromRequest(req, {
    userId: currentUserId,
    action: "BANNER_FORCE_DELETED",
    target: `Banner:${id}`,
    meta: { title: existing.title },
  });

  return { id, forceDeleted: true };
}

// ===== PUBLIC =====

async function getPublicBanners() {
  return bannerRepository.listPublic();
}

module.exports = {
  listBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  restoreBanner,
  forceDeleteBanner,
  getPublicBanners,
};
