/**
 * enrollment-schedule.service.js — Business logic cho module EnrollmentSchedule.
 *
 * Admin: list, create, update, delete (soft), restore, forceDelete.
 * Public: getActive (1 bản published có displayOrder thấp nhất).
 *
 * Soft-delete/restore qua helper utils/softDelete (audit log qua helper đó).
 * Audit log riêng qua audit.service cho create/update/delete.
 */

const repo = require("./enrollment-schedule.repository");
const { softDelete, restore, forceDelete } = require("../../utils/softDelete");
const audit = require("../audit/audit.service");

// ===== Helpers =====

function isString(v) {
  return typeof v === "string" || (v && typeof v === "object" && typeof v.length === "number");
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Chuẩn hoá input array: chỉ chấp nhận string[], loại bỏ entry rỗng/whitespace,
 * trim từng phần tử. Nếu input không phải array → null (caller hiểu là "không đổi").
 */
function normalizeStringArray(v) {
  if (v === undefined || v === null) return null;
  if (!Array.isArray(v)) return "INVALID";
  const trimmed = v.map((x) => (typeof x === "string" ? x.trim() : ""));
  // Bỏ qua entry rỗng (giữ lại các entry khác) nhưng nếu array rỗng → trả [].
  const nonEmpty = trimmed.filter((x) => x.length > 0);
  if (nonEmpty.length !== v.length) return "INVALID"; // có phần tử rỗng → invalid
  return nonEmpty;
}

/**
 * Normalize 1 String ngắn: trim, giữ null nếu nguyên input là null/undefined,
 * trả chuỗi rỗng nếu chỉ là whitespace (sẽ bị reject ở validate).
 */
function trimOrNull(v) {
  if (v === undefined || v === null) return null;
  return String(v).trim();
}

/** Validate payload chung (dùng cho create + update). isUpdate=true cho phép field optional. */
function validatePayload(data, isUpdate = false) {
  const errors = [];

  // ---- title: bắt buộc lúc create, optional lúc update nhưng nếu có thì không rỗng ----
  if (!isUpdate) {
    if (!isNonEmptyString(data.title)) errors.push("title là bắt buộc");
  }
  if (data.title !== undefined && !isNonEmptyString(data.title)) {
    errors.push("title không được rỗng");
  }

  // ---- 6 String format bắt buộc (nếu gửi thì không được rỗng) ----
  const requiredFields = [
    "morningTimes",
    "afternoonTimes",
    "eveningTimes",
    "scheduleGroupA",
    "scheduleGroupB",
  ];
  for (const f of requiredFields) {
    if (!isUpdate && !isNonEmptyString(data[f])) {
      errors.push(`${f} là bắt buộc`);
    } else if (data[f] !== undefined && !isNonEmptyString(data[f])) {
      errors.push(`${f} không được rỗng`);
    }
  }

  // ---- CTA (bắt buộc cả create lẫn update nếu gửi) ----
  if (!isUpdate) {
    if (!isNonEmptyString(data.ctaText)) errors.push("ctaText là bắt buộc");
    if (!isNonEmptyString(data.ctaLink)) errors.push("ctaLink là bắt buộc");
  }
  if (data.ctaText !== undefined && !isNonEmptyString(data.ctaText)) {
    errors.push("ctaText không được rỗng");
  }
  if (data.ctaLink !== undefined && !isNonEmptyString(data.ctaLink)) {
    errors.push("ctaLink không được rỗng");
  } else if (
    isNonEmptyString(data.ctaLink) &&
    !/^\//.test(data.ctaLink) &&
    !/^https?:\/\//.test(data.ctaLink)
  ) {
    errors.push("ctaLink phải là đường dẫn tuyệt đối (/) hoặc URL (https://)");
  }

  // ---- note + tagline: optional, nếu gửi thì phải là string null/undefined OK ----
  for (const f of ["note", "tagline"]) {
    if (data[f] !== undefined && data[f] !== null && typeof data[f] !== "string") {
      errors.push(`${f} phải là string hoặc null`);
    }
  }

  // ---- String[] fields ----
  const arrayFields = ["coursesEnrolling", "phoneNumbers"];
  for (const f of arrayFields) {
    if (!isUpdate) {
      if (!Array.isArray(data[f])) {
        errors.push(`${f} là bắt buộc (string[])`);
      } else {
        const norm = normalizeStringArray(data[f]);
        if (norm === "INVALID") errors.push(`${f} không được chứa phần tử rỗng`);
        else if (norm.length === 0) errors.push(`${f} không được là mảng rỗng`);
      }
    } else if (data[f] !== undefined) {
      const norm = normalizeStringArray(data[f]);
      if (norm === "INVALID") errors.push(`${f} không được chứa phần tử rỗng`);
      else if (Array.isArray(data[f]) && norm.length === 0) {
        errors.push(`${f} không được là mảng rỗng`);
      }
    }
  }

  // ---- Boolean: isPublished ----
  if (data.isPublished !== undefined && typeof data.isPublished !== "boolean") {
    errors.push("isPublished phải là boolean");
  }

  // ---- Number: displayOrder ----
  if (data.displayOrder !== undefined && data.displayOrder !== null) {
    if (!Number.isFinite(Number(data.displayOrder))) {
      errors.push("displayOrder phải là số");
    } else if (Number(data.displayOrder) < 0) {
      errors.push("displayOrder không được âm");
    }
  }

  if (errors.length > 0) {
    const e = new Error(errors.join("; "));
    e.code = "VALIDATION_ERROR";
    throw e;
  }
}

function notFound(id) {
  const e = new Error(`Không tìm thấy EnrollmentSchedule với id = ${id}`);
  e.code = "NOT_FOUND";
  return e;
}

/** Build payload gửi xuống Prisma — chỉ chứa field đã được phép thay đổi. */
function buildCreatePayload(data) {
  return {
    title: String(data.title).trim(),
    coursesEnrolling: normalizeStringArray(data.coursesEnrolling),
    morningTimes: String(data.morningTimes).trim(),
    afternoonTimes: String(data.afternoonTimes).trim(),
    eveningTimes: String(data.eveningTimes).trim(),
    scheduleGroupA: String(data.scheduleGroupA).trim(),
    scheduleGroupB: String(data.scheduleGroupB).trim(),
    note: trimOrNull(data.note),
    tagline: trimOrNull(data.tagline),
    ctaText: String(data.ctaText).trim(),
    ctaLink: String(data.ctaLink).trim(),
    phoneNumbers: normalizeStringArray(data.phoneNumbers),
    isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : true,
    displayOrder: Number.isFinite(Number(data.displayOrder)) ? Number(data.displayOrder) : 0,
  };
}

function buildUpdatePayload(data) {
  const p = {};
  if (data.title !== undefined) p.title = String(data.title).trim();
  if (data.coursesEnrolling !== undefined) {
    const arr = normalizeStringArray(data.coursesEnrolling);
    if (arr === "INVALID") throw badRequest("coursesEnrolling không được chứa phần tử rỗng");
    p.coursesEnrolling = arr;
  }
  if (data.morningTimes !== undefined) p.morningTimes = String(data.morningTimes).trim();
  if (data.afternoonTimes !== undefined) p.afternoonTimes = String(data.afternoonTimes).trim();
  if (data.eveningTimes !== undefined) p.eveningTimes = String(data.eveningTimes).trim();
  if (data.scheduleGroupA !== undefined) p.scheduleGroupA = String(data.scheduleGroupA).trim();
  if (data.scheduleGroupB !== undefined) p.scheduleGroupB = String(data.scheduleGroupB).trim();
  if (data.note !== undefined) p.note = trimOrNull(data.note);
  if (data.tagline !== undefined) p.tagline = trimOrNull(data.tagline);
  if (data.ctaText !== undefined) p.ctaText = String(data.ctaText).trim();
  if (data.ctaLink !== undefined) p.ctaLink = String(data.ctaLink).trim();
  if (data.phoneNumbers !== undefined) {
    const arr = normalizeStringArray(data.phoneNumbers);
    if (arr === "INVALID") throw badRequest("phoneNumbers không được chứa phần tử rỗng");
    p.phoneNumbers = arr;
  }
  if (data.isPublished !== undefined) p.isPublished = Boolean(data.isPublished);
  if (Number.isFinite(Number(data.displayOrder))) {
    if (Number(data.displayOrder) < 0) throw badRequest("displayOrder không được âm");
    p.displayOrder = Number(data.displayOrder);
  }
  return p;
}

function badRequest(message) {
  const e = new Error(message);
  e.code = "BAD_REQUEST";
  return e;
}

// ===== ADMIN =====

async function listSchedules(query) {
  return repo.listAdmin({
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });
}

async function getScheduleById(id) {
  const row = await repo.findById(id);
  if (!row) throw notFound(id);
  return row;
}

async function createSchedule(data, currentUserId, req = null) {
  validatePayload(data, false);
  const payload = buildCreatePayload(data);
  const created = await repo.create(payload);

  await audit.logFromRequest(req, {
    userId: currentUserId,
    action: "ENROLLMENT_SCHEDULE_CREATED",
    target: `EnrollmentSchedule:${created.id}`,
    meta: { title: created.title },
  });

  return created;
}

async function updateSchedule(id, data, currentUserId, req = null) {
  validatePayload(data, true);

  const existing = await repo.findById(id);
  if (!existing) throw notFound(id);

  const payload = buildUpdatePayload(data);
  const updated = await repo.update(id, payload);

  await audit.logFromRequest(req, {
    userId: currentUserId,
    action: "ENROLLMENT_SCHEDULE_UPDATED",
    target: `EnrollmentSchedule:${id}`,
    meta: { title: updated.title },
  });

  return updated;
}

async function deleteSchedule(id, currentUserId, req = null) {
  const existing = await repo.findById(id);
  if (!existing) throw notFound(id);

  await softDelete("EnrollmentSchedule", { id: String(id) }, { req, userId: currentUserId });

  await audit.logFromRequest(req, {
    userId: currentUserId,
    action: "ENROLLMENT_SCHEDULE_DELETED",
    target: `EnrollmentSchedule:${id}`,
    meta: { title: existing.title },
  });

  return { id, deleted: true };
}

async function restoreSchedule(id, currentUserId, req = null) {
  const existing = await repo.findById(id);
  if (!existing) throw notFound(id);

  const restored = await restore("EnrollmentSchedule", { id: String(id) }, { req, userId: currentUserId });

  await audit.logFromRequest(req, {
    userId: currentUserId,
    action: "ENROLLMENT_SCHEDULE_RESTORED",
    target: `EnrollmentSchedule:${id}`,
    meta: { title: restored.title },
  });

  return { id, restored: true };
}

async function forceDeleteSchedule(id, currentUserId, req = null) {
  const existing = await repo.findById(id);
  if (!existing) throw notFound(id);

  await forceDelete("EnrollmentSchedule", { id: String(id) }, { req, userId: currentUserId });

  await audit.logFromRequest(req, {
    userId: currentUserId,
    action: "ENROLLMENT_SCHEDULE_FORCE_DELETED",
    target: `EnrollmentSchedule:${id}`,
    meta: { title: existing.title },
  });

  return { id, forceDeleted: true };
}

// ===== PUBLIC =====

/**
 * Trả về 1 schedule (singleton) cho trang public.
 * Trả { schedule: null } nếu không có bản nào published — caller FE xử lý ẩn block.
 */
async function getPublicActiveSchedule() {
  const schedule = await repo.getActive();
  return { schedule };
}

module.exports = {
  listSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  restoreSchedule,
  forceDeleteSchedule,
  getPublicActiveSchedule,
};
