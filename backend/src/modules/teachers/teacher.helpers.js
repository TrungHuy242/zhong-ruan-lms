/**
 * teacher.helpers.js — Helper dung chung cho module Teachers.
 *
 * - slugify(input): Tu sinh slug URL-friendly tu fullName (unidecode + kebab).
 * - ensureUniqueSlug(...): Tranh trung bang suffix -2, -3...
 * - validateTeacherPayload(...): Validate input create/update.
 * - notFound/badRequest: Error co code de controller map HTTP.
 */

const SLUG_MAX_LEN = 100;

// Map unidecode don gian cho tieng Viet + Latin mo rong.
const VIETNAMESE_MAP = {
  "à": "a", "á": "a", "ạ": "a", "ả": "a", "ã": "a",
  "â": "a", "ầ": "a", "ấ": "a", "ậ": "a", "ẩ": "a", "ẫ": "a",
  "ă": "a", "ằ": "a", "ắ": "a", "ặ": "a", "ẳ": "a", "ẵ": "a",
  "è": "e", "é": "e", "ẹ": "e", "ẻ": "e", "ẽ": "e",
  "ê": "e", "ề": "e", "ế": "e", "ệ": "e", "ể": "e", "ễ": "e",
  "ì": "i", "í": "i", "ị": "i", "ỉ": "i", "ĩ": "i",
  "ò": "o", "ó": "o", "ọ": "o", "ỏ": "o", "õ": "o",
  "ô": "o", "ồ": "o", "ố": "o", "ộ": "o", "ổ": "o", "ỗ": "o",
  "ơ": "o", "ờ": "o", "ớ": "o", "ợ": "o", "ở": "o", "ỡ": "o",
  "ù": "u", "ú": "u", "ụ": "u", "ủ": "u", "ũ": "u",
  "ư": "u", "ừ": "u", "ứ": "u", "ự": "u", "ử": "u", "ữ": "u",
  "ỳ": "y", "ý": "y", "ỵ": "y", "ỷ": "y", "ỹ": "y",
  "đ": "d",
};

function unidecodeLite(input) {
  if (!input) return "";
  const lower = String(input).toLowerCase();
  let out = "";
  for (const ch of lower) {
    out += VIETNAMESE_MAP[ch] || ch;
  }
  return out;
}

function slugify(input) {
  const ascii = unidecodeLite(input);
  const replaced = ascii
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LEN);
  if (replaced) return replaced;
  return "teacher-" + Date.now().toString(36);
}

async function ensureUniqueSlug(existsFn, base, excludeId = null) {
  const root = base || "teacher";
  const takenByRoot = await existsFn(root, excludeId);
  if (!takenByRoot) return root;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${root}-${i}`;
    const taken = await existsFn(candidate, excludeId);
    if (!taken) return candidate;
  }
  return "teacher-" + Math.random().toString(36).slice(2, 10);
}

// ===== Validation =====
const MAX_FULL_NAME = 100;
const MAX_TITLE = 150;
const MAX_BIO = 5000;
const MAX_BIO_SHORT = 300;
const MAX_AVATAR_URL = 500;
const MIN_YEARS = 0;
const MAX_YEARS = 80;
const MAX_SPECIALTY_LEN = 60;
const MAX_SPECIALTIES = 15;

function trimOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function validateTeacherPayload(payload, { isUpdate = false } = {}) {
  if (!payload || typeof payload !== "object") {
    throw badRequest("payload khong hop le");
  }

  if (!isUpdate || payload.fullName !== undefined) {
    const fullName = trimOrNull(payload.fullName);
    if (!fullName) {
      if (isUpdate) throw badRequest("fullName khong duoc de trong");
      throw badRequest("Ho ten giang vien la bat buoc");
    }
    if (fullName.length > MAX_FULL_NAME) {
      throw badRequest(`Ho ten khong duoc dai qua ${MAX_FULL_NAME} ky tu`);
    }
  }

  if (!isUpdate || payload.title !== undefined) {
    const title = trimOrNull(payload.title);
    if (!title) {
      if (isUpdate) throw badRequest("title khong duoc de trong");
      throw badRequest("Hoc vi/chuc danh la bat buoc");
    }
    if (title.length > MAX_TITLE) {
      throw badRequest(`Hoc vi/chuc danh khong duoc dai qua ${MAX_TITLE} ky tu`);
    }
  }

  if (!isUpdate || payload.bio !== undefined) {
    const bio = trimOrNull(payload.bio);
    if (!bio) {
      if (isUpdate) throw badRequest("bio khong duoc de trong");
      throw badRequest("Mo ta chi tiet (bio) la bat buoc");
    }
    if (bio.length > MAX_BIO) {
      throw badRequest(`Mo ta chi tiet khong duoc dai qua ${MAX_BIO} ky tu`);
    }
  }

  if (!isUpdate || payload.bioShort !== undefined) {
    const bioShort = trimOrNull(payload.bioShort);
    if (!bioShort) {
      if (isUpdate) throw badRequest("bioShort khong duoc de trong");
      throw badRequest("Mo ta ngan (bioShort) la bat buoc");
    }
    if (bioShort.length > MAX_BIO_SHORT) {
      throw badRequest(`Mo ta ngan khong duoc dai qua ${MAX_BIO_SHORT} ky tu`);
    }
  }

  if (payload.avatarUrl !== undefined && payload.avatarUrl !== null) {
    const url = trimOrNull(payload.avatarUrl);
    if (url && url.length > MAX_AVATAR_URL) {
      throw badRequest(`Link anh dai dien khong duoc dai qua ${MAX_AVATAR_URL} ky tu`);
    }
  }

  if (payload.yearsOfExperience !== undefined && payload.yearsOfExperience !== null) {
    const n = Number(payload.yearsOfExperience);
    if (!Number.isInteger(n) || n < MIN_YEARS || n > MAX_YEARS) {
      throw badRequest(`So nam kinh nghiem phai la so nguyen trong khoang ${MIN_YEARS}-${MAX_YEARS}`);
    }
  }

  if (payload.specialties !== undefined && payload.specialties !== null) {
    if (!Array.isArray(payload.specialties)) {
      throw badRequest("specialties phai la mang chuoi");
    }
    if (payload.specialties.length > MAX_SPECIALTIES) {
      throw badRequest(`Toi da ${MAX_SPECIALTIES} chuyen mon`);
    }
    for (const sp of payload.specialties) {
      const s = String(sp || "").trim();
      if (!s) throw badRequest("specialties khong duoc chua phan tu rong");
      if (s.length > MAX_SPECIALTY_LEN) {
        throw badRequest(`Moi chuyen mon khong duoc dai qua ${MAX_SPECIALTY_LEN} ky tu`);
      }
    }
  }

  if (payload.isFeatured !== undefined && typeof payload.isFeatured !== "boolean") {
    throw badRequest("isFeatured phai la boolean");
  }
  if (payload.isPublished !== undefined && typeof payload.isPublished !== "boolean") {
    throw badRequest("isPublished phai la boolean");
  }
  if (payload.displayOrder !== undefined && payload.displayOrder !== null) {
    const o = Number(payload.displayOrder);
    if (!Number.isInteger(o) || o < 0) {
      throw badRequest("displayOrder phai la so nguyen khong am");
    }
  }

  if (payload.linkedUserId !== undefined && payload.linkedUserId !== null) {
    const id = Number(payload.linkedUserId);
    if (!Number.isInteger(id) || id <= 0) {
      throw badRequest("linkedUserId phai la so nguyen duong (User.id)");
    }
  }
}

function notFound(message = "Khong tim thay giang vien") {
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
  slugify,
  ensureUniqueSlug,
  unidecodeLite,
  validateTeacherPayload,
  notFound,
  badRequest,
  constants: {
    MAX_FULL_NAME,
    MAX_TITLE,
    MAX_BIO,
    MAX_BIO_SHORT,
    MAX_AVATAR_URL,
    MIN_YEARS,
    MAX_YEARS,
    MAX_SPECIALTY_LEN,
    MAX_SPECIALTIES,
    SLUG_MAX_LEN,
  },
};
