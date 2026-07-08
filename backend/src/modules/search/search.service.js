const prisma = require("../../config/database");

const VALID_TYPES = ["users", "notifications", "files", "all"];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function badRequest(message) {
  const e = new Error(message);
  e.code = "BAD_REQUEST";
  return e;
}

// Chuẩn hoá page/limit, throw nếu không hợp lệ
function parsePaging({ page, limit }) {
  const p = page == null || page === "" ? DEFAULT_PAGE : Number(page);
  const l = limit == null || limit === "" ? DEFAULT_LIMIT : Number(limit);

  if (!Number.isInteger(p) || p < 1) {
    throw badRequest("page phải là số nguyên dương");
  }
  if (!Number.isInteger(l) || l < 1 || l > MAX_LIMIT) {
    throw badRequest(`limit phải là số nguyên từ 1 đến ${MAX_LIMIT}`);
  }
  return { page: p, limit: l };
}

function buildSelect(type) {
  // Tách bạch field trả về để không lộ passwordHash/refreshToken
  if (type === "users") {
    return {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    };
  }
  if (type === "notifications") {
    return {
      id: true,
      userId: true,
      type: true,
      title: true,
      message: true,
      isRead: true,
      createdAt: true,
    };
  }
  if (type === "files") {
    return {
      id: true,
      originalName: true,
      storedName: true,
      mimeType: true,
      size: true,
      path: true,
      uploadedById: true,
      createdAt: true,
    };
  }
  return null;
}

// Tìm trong bảng users — chỉ Admin mới có quyền
async function searchUsers({ keyword, page, limit, isAdmin }) {
  if (!isAdmin) {
    return { items: [], total: 0, page, limit };
  }
  const where = {
    OR: [
      { fullName: { contains: keyword, mode: "insensitive" } },
      { email: { contains: keyword, mode: "insensitive" } },
      { phone: { contains: keyword, mode: "insensitive" } },
    ],
  };
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: buildSelect("users"), skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, limit };
}

// Tìm trong bảng notifications — user thường chỉ thấy của mình
async function searchNotifications({ keyword, page, limit, currentUserId, isAdmin }) {
  const where = {
    AND: [
      {
        OR: [
          { title: { contains: keyword, mode: "insensitive" } },
          { message: { contains: keyword, mode: "insensitive" } },
        ],
      },
    ],
  };
  if (!isAdmin) where.AND.push({ userId: currentUserId });

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.notification.findMany({ where, select: buildSelect("notifications"), skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.notification.count({ where }),
  ]);
  return { items, total, page, limit };
}

// Tìm trong bảng files — user thường chỉ thấy file mình upload
async function searchFiles({ keyword, page, limit, currentUserId, isAdmin }) {
  const where = {
    AND: [
      {
        OR: [
          { originalName: { contains: keyword, mode: "insensitive" } },
          { storedName: { contains: keyword, mode: "insensitive" } },
        ],
      },
    ],
  };
  if (!isAdmin) where.AND.push({ uploadedById: currentUserId });

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.uploadFile.findMany({ where, select: buildSelect("files"), skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.uploadFile.count({ where }),
  ]);
  return { items, total, page, limit };
}

async function search(currentUser, query = {}) {
  const keyword = (query.keyword || "").trim();
  if (!keyword) {
    throw badRequest("keyword là bắt buộc và không được để trống");
  }
  if (keyword.length > 200) {
    throw badRequest("keyword tối đa 200 ký tự");
  }

  const type = (query.type || "all").toLowerCase();
  if (!VALID_TYPES.includes(type)) {
    throw badRequest(`type không hợp lệ. Chỉ chấp nhận: ${VALID_TYPES.join(", ")}`);
  }

  const { page, limit } = parsePaging(query);
  const isAdmin = currentUser && currentUser.role === "ADMIN";
  const currentUserId = currentUser && currentUser.id;

  if (type === "all") {
    const [users, notifications, files] = await Promise.all([
      searchUsers({ keyword, page, limit, isAdmin }),
      searchNotifications({ keyword, page, limit, currentUserId, isAdmin }),
      searchFiles({ keyword, page, limit, currentUserId, isAdmin }),
    ]);
    return { keyword, type, users, notifications, files };
  }

  if (type === "users") {
    return { keyword, type, users: await searchUsers({ keyword, page, limit, isAdmin }) };
  }
  if (type === "notifications") {
    return { keyword, type, notifications: await searchNotifications({ keyword, page, limit, currentUserId, isAdmin }) };
  }
  return { keyword, type, files: await searchFiles({ keyword, page, limit, currentUserId, isAdmin }) };
}

module.exports = {
  VALID_TYPES,
  search,
};
