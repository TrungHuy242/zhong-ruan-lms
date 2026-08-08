/**
 * testimonial.service.js — Business logic cho module Testimonial.
 *
 * Admin: list, create, update, delete (soft), restore, forceDelete.
 * Public: listPublished (dùng cho block "Feedback học viên" ở Trang chủ).
 *
 * Soft-delete/restore qua helper utils/softDelete (audit log qua helper đó).
 * Audit log riêng qua audit.service cho create/update/delete.
 */

const repo = require("./testimonial.repository");
const { softDelete, restore, forceDelete } = require("../../utils/softDelete");
const audit = require("../audit/audit.service");

// ===== Validation =====

const MAX_STUDENT_NAME = 100;
const MAX_COURSE_INFO = 50;
const MAX_CONTENT = 5000;
const MAX_AVATAR_URL = 500;
const MAX_SOURCE = 50;
const MIN_RATING = 1;
const MAX_RATING = 5;

function trimOrNull(v) {
  if (v === undefined || v === null) return null;
  return String(v).trim();
}

function notFound(id) {
  const e = new Error(`Không tìm thấy Testimonial với id = ${id}`);
  e.code = "NOT_FOUND";
  return e;
}

function badRequest(message) {
  const e = new Error(message);
  e.code = "BAD_REQUEST";
  return e;
}

/**
 * Validate payload cho create + update.
 * - studentName: bắt buộc create, optional update nhưng nếu có thì không rỗng.
 * - content: bắt buộc create, optional update nhưng nếu có thì không rỗng.
 * - rating: 1-5, default 5.
 * - isFeatured, isPublished: boolean.
 * - displayOrder: int >= 0.
 * - avatarUrl, source, courseInfo: optional, maxLength check.
 */
function validatePayload(data, isUpdate = false) {
  const errors = [];

  // studentName
  if (!isUpdate) {
    if (data.studentName === undefined || data.studentName === null || !String(data.studentName).trim()) {
      errors.push("studentName là bắt buộc");
    }
  } else if (data.studentName !== undefined) {
    if (data.studentName === null || !String(data.studentName).trim()) {
      errors.push("studentName không được rỗng");
    }
  }
  if (data.studentName !== undefined && data.studentName !== null) {
    const s = String(data.studentName).trim();
    if (s.length > MAX_STUDENT_NAME) {
      errors.push(`studentName không được dài quá ${MAX_STUDENT_NAME} ký tự`);
    }
  }

  // content
  if (!isUpdate) {
    if (data.content === undefined || data.content === null || !String(data.content).trim()) {
      errors.push("content là bắt buộc");
    }
  } else if (data.content !== undefined) {
    if (data.content === null || !String(data.content).trim()) {
      errors.push("content không được rỗng");
    }
  }
  if (data.content !== undefined && data.content !== null) {
    const s = String(data.content).trim();
    if (s.length > MAX_CONTENT) {
      errors.push(`content không được dài quá ${MAX_CONTENT} ký tự`);
    }
  }

  // courseInfo (optional)
  if (data.courseInfo !== undefined && data.courseInfo !== null) {
    if (typeof data.courseInfo !== "string") errors.push("courseInfo phải là string hoặc null");
    else if (data.courseInfo.trim().length > MAX_COURSE_INFO) {
      errors.push(`courseInfo không được dài quá ${MAX_COURSE_INFO} ký tự`);
    }
  }

  // source (optional)
  if (data.source !== undefined && data.source !== null) {
    if (typeof data.source !== "string") errors.push("source phải là string hoặc null");
    else if (data.source.trim().length > MAX_SOURCE) {
      errors.push(`source không được dài quá ${MAX_SOURCE} ký tự`);
    }
  }

  // avatarUrl (optional)
  if (data.avatarUrl !== undefined && data.avatarUrl !== null) {
    if (typeof data.avatarUrl !== "string") errors.push("avatarUrl phải là string hoặc null");
    else if (data.avatarUrl.trim().length > MAX_AVATAR_URL) {
      errors.push(`avatarUrl không được dài quá ${MAX_AVATAR_URL} ký tự`);
    }
  }

  // rating
  if (data.rating !== undefined && data.rating !== null) {
    const n = Number(data.rating);
    if (!Number.isInteger(n) || n < MIN_RATING || n > MAX_RATING) {
      errors.push(`rating phải là số nguyên trong khoảng ${MIN_RATING}-${MAX_RATING}`);
    }
  }

  // isFeatured
  if (data.isFeatured !== undefined && typeof data.isFeatured !== "boolean") {
    errors.push("isFeatured phải là boolean");
  }

  // isPublished
  if (data.isPublished !== undefined && typeof data.isPublished !== "boolean") {
    errors.push("isPublished phải là boolean");
  }

  // displayOrder
  if (data.displayOrder !== undefined && data.displayOrder !== null) {
    const o = Number(data.displayOrder);
    if (!Number.isInteger(o) || o < 0) {
      errors.push("displayOrder phải là số nguyên không âm");
    }
  }

  if (errors.length > 0) {
    const e = new Error(errors.join("; "));
    e.code = "VALIDATION_ERROR";
    throw e;
  }
}

/** Build payload cho create. */
function buildCreatePayload(data) {
  return {
    studentName: String(data.studentName).trim(),
    courseInfo: data.courseInfo != null ? String(data.courseInfo).trim() : null,
    content: String(data.content).trim(),
    rating: data.rating !== undefined && data.rating !== null ? Number(data.rating) : 5,
    avatarUrl: data.avatarUrl != null && data.avatarUrl !== "" ? String(data.avatarUrl).trim() : null,
    source: data.source != null && data.source !== "" ? String(data.source).trim() : null,
    isFeatured: data.isFeatured === true,
    isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : true,
    displayOrder: Number.isInteger(Number(data.displayOrder)) ? Number(data.displayOrder) : 0,
  };
}

/** Build payload cho update (chỉ set field được truyền). */
function buildUpdatePayload(data) {
  const p = {};
  if (data.studentName !== undefined) p.studentName = String(data.studentName).trim();
  if (data.courseInfo !== undefined) {
    p.courseInfo = data.courseInfo == null ? null : String(data.courseInfo).trim();
  }
  if (data.content !== undefined) p.content = String(data.content).trim();
  if (data.rating !== undefined && data.rating !== null) p.rating = Number(data.rating);
  if (data.avatarUrl !== undefined) {
    p.avatarUrl = data.avatarUrl == null || data.avatarUrl === "" ? null : String(data.avatarUrl).trim();
  }
  if (data.source !== undefined) {
    p.source = data.source == null || data.source === "" ? null : String(data.source).trim();
  }
  if (data.isFeatured !== undefined) p.isFeatured = data.isFeatured === true;
  if (data.isPublished !== undefined) p.isPublished = Boolean(data.isPublished);
  if (data.displayOrder !== undefined && data.displayOrder !== null) {
    const o = Number(data.displayOrder);
    if (!Number.isInteger(o) || o < 0) throw badRequest("displayOrder phải là số nguyên không âm");
    p.displayOrder = o;
  }
  return p;
}

// ===== ADMIN =====

async function listTestimonials(query) {
  return repo.listAdmin({
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });
}

async function getTestimonialById(id) {
  const row = await repo.findById(id);
  if (!row) throw notFound(id);
  return row;
}

async function createTestimonial(data, currentUserId, req = null) {
  validatePayload(data, false);
  const payload = buildCreatePayload(data);
  const created = await repo.create(payload);

  await audit.logFromRequest(req, {
    userId: currentUserId,
    action: "TESTIMONIAL_CREATED",
    target: `Testimonial:${created.id}`,
    meta: {
      studentName: created.studentName,
      isFeatured: created.isFeatured,
      isPublished: created.isPublished,
    },
  });

  return created;
}

async function updateTestimonial(id, data, currentUserId, req = null) {
  validatePayload(data, true);

  const existing = await repo.findById(id);
  if (!existing) throw notFound(id);

  const payload = buildUpdatePayload(data);
  const updated = await repo.update(id, payload);

  await audit.logFromRequest(req, {
    userId: currentUserId,
    action: "TESTIMONIAL_UPDATED",
    target: `Testimonial:${id}`,
    meta: { studentName: updated.studentName, changes: Object.keys(payload) },
  });

  return updated;
}

async function deleteTestimonial(id, currentUserId, req = null) {
  const existing = await repo.findById(id);
  if (!existing) throw notFound(id);

  // Helper softDelete() tự ghi TESTIMONIAL_SOFT_DELETE.
  await softDelete("Testimonial", { id: String(id) }, { req, userId: currentUserId });

  return { id, deleted: true };
}

async function restoreTestimonial(id, currentUserId, req = null) {
  const existing = await repo.findById(id);
  if (!existing) throw notFound(id);

  // Helper restore() tự ghi TESTIMONIAL_RESTORE.
  await restore("Testimonial", { id: String(id) }, { req, userId: currentUserId });

  return { id, restored: true };
}

async function forceDeleteTestimonial(id, currentUserId, req = null) {
  const existing = await repo.findById(id);
  if (!existing) throw notFound(id);

  // Helper forceDelete() tự ghi TESTIMONIAL_FORCE_DELETE.
  await forceDelete("Testimonial", { id: String(id) }, { req, userId: currentUserId });

  return { id, forceDeleted: true };
}

// ===== PUBLIC =====

/**
 * Trả danh sách testimonial published cho block "Feedback học viên" trên Trang chủ.
 * FE tự quyết định hiển thị bao nhiêu (mặc định trả tất cả nếu không truyền limit).
 */
async function listPublicTestimonials(query = {}) {
  const testimonials = await repo.listPublic({
    limit: query.limit,
  });
  return { testimonials };
}

module.exports = {
  // Admin
  listTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  restoreTestimonial,
  forceDeleteTestimonial,
  // Public
  listPublicTestimonials,
};