/**
 * pricing-plan.helpers.js — Helper dùng chung cho module PricingPlans.
 *
 * - validatePlanPayload(...): Validate input create/update.
 * - notFound/badRequest: Error có code để controller map HTTP.
 */

const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;
const MAX_PRICE = 999_999_999_999;
const MAX_COURSE_SLUG = 100;

const ALLOWED_CLASS_TYPES = new Set(["GROUP", "PRIVATE"]);
const ALLOWED_PRICE_UNITS = new Set(["buổi", "tháng", "khóa"]);
const MAX_FEATURES = 20;
const MAX_FEATURE_LEN = 150;

function validatePlanPayload(payload, { isUpdate = false } = {}) {
  if (!payload || typeof payload !== "object") {
    throw badRequest("payload khong hop le");
  }

  // name (required on create)
  if (!isUpdate || payload.name !== undefined) {
    const name = trimOrNull(payload.name);
    if (!name) {
      if (isUpdate) throw badRequest("name khong duoc de trong");
      throw badRequest("Ten goi la bat buoc");
    }
    if (name.length > MAX_NAME) {
      throw badRequest(`Ten goi khong duoc dai qua ${MAX_NAME} ky tu`);
    }
  }

  // classType (required on create)
  if (!isUpdate || payload.classType !== undefined) {
    const ct = trimOrNull(payload.classType);
    if (!ct) {
      if (isUpdate) throw badRequest("classType khong duoc de trong");
      throw badRequest("Loai lop (classType) la bat buoc");
    }
    if (!ALLOWED_CLASS_TYPES.has(ct)) {
      throw badRequest(`classType phai la "GROUP" hoac "PRIVATE"`);
    }
  }

  // price (required on create)
  if (!isUpdate || payload.price !== undefined) {
    const p = Number(payload.price);
    if (!Number.isFinite(p) || !Number.isInteger(p) || p < 0) {
      throw badRequest("price phai la so nguyen khong am");
    }
    if (p > MAX_PRICE) {
      throw badRequest(`price khong duoc vuot ${MAX_PRICE}`);
    }
  }

  // priceUnit (required on create)
  if (!isUpdate || payload.priceUnit !== undefined) {
    const pu = trimOrNull(payload.priceUnit);
    if (!pu) {
      if (isUpdate) throw badRequest("priceUnit khong duoc de trong");
      throw badRequest("Don vi gia (priceUnit) la bat buoc");
    }
    if (!ALLOWED_PRICE_UNITS.has(pu)) {
      throw badRequest(`priceUnit phai la "buổi", "tháng", hoặc "khóa"`);
    }
  }

  // originalPrice (optional, nullable)
  if (payload.originalPrice !== undefined && payload.originalPrice !== null) {
    const op = Number(payload.originalPrice);
    if (!Number.isFinite(op) || !Number.isInteger(op) || op < 0) {
      throw badRequest("originalPrice phai la so nguyen khong am");
    }
  }

  // description (required on create)
  if (!isUpdate || payload.description !== undefined) {
    const d = trimOrNull(payload.description);
    if (!d) {
      if (isUpdate) throw badRequest("description khong duoc de trong");
      throw badRequest("Mo ta la bat buoc");
    }
    if (d.length > MAX_DESCRIPTION) {
      throw badRequest(`Mo ta khong duoc dai qua ${MAX_DESCRIPTION} ky tu`);
    }
  }

  // features (optional array)
  if (payload.features !== undefined && payload.features !== null) {
    if (!Array.isArray(payload.features)) {
      throw badRequest("features phai la mang");
    }
    if (payload.features.length > MAX_FEATURES) {
      throw badRequest(`Toi da ${MAX_FEATURES} quyen loi`);
    }
    for (const f of payload.features) {
      const s = String(f || "").trim();
      if (!s) throw badRequest("features khong duoc chua phan tu rong");
      if (s.length > MAX_FEATURE_LEN) {
        throw badRequest(`Moi quyen loi khong duoc dai qua ${MAX_FEATURE_LEN} ky tu`);
      }
    }
  }

  // courseSlug (optional string)
  if (payload.courseSlug !== undefined && payload.courseSlug !== null) {
    const cs = trimOrNull(payload.courseSlug);
    if (cs && cs.length > MAX_COURSE_SLUG) {
      throw badRequest(`courseSlug khong duoc dai qua ${MAX_COURSE_SLUG} ky tu`);
    }
  }

  // isFeatured (optional boolean)
  if (payload.isFeatured !== undefined && typeof payload.isFeatured !== "boolean") {
    throw badRequest("isFeatured phai la boolean");
  }

  // isPublished (optional boolean)
  if (payload.isPublished !== undefined && typeof payload.isPublished !== "boolean") {
    throw badRequest("isPublished phai la boolean");
  }

  // displayOrder (optional integer >= 0)
  if (payload.displayOrder !== undefined && payload.displayOrder !== null) {
    const o = Number(payload.displayOrder);
    if (!Number.isInteger(o) || o < 0) {
      throw badRequest("displayOrder phai la so nguyen khong am");
    }
  }
}

function trimOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function notFound(message = "Khong tim thay goi hoc phi") {
  const e = new Error(message);
  e.code = "NOT_FOUND";
  return e;
}

function badRequest(message) {
  const e = new Error(message);
  e.code = "BAD_REQUEST";
  return e;
}

module.exports = {
  validatePlanPayload,
  notFound,
  badRequest,
  ALLOWED_CLASS_TYPES,
  ALLOWED_PRICE_UNITS,
};
