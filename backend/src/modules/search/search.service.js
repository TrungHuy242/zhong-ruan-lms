/**
 * search.service — tìm kiếm toàn hệ thống.
 *
 * Module ban đầu: search Users / Notifications / Files với paging + quyền (admin / user thường).
 * Bổ sung:
 *   - Settings (chỉ Admin) — search key + description.
 *   - Highlight (snippet + match positions) cho FE render bold keyword.
 *   - Tổng số kết quả từng module (mặc định trả; UI có thể ẩn).
 *   - Tự động giới hạn 5 kết quả/module cho "all" (lightweight mode), và MAX_LIMIT
 *     cho query riêng từng module.
 *   - Search History (tối đa 10 keyword gần nhất / user).
 *
 * Lưu ý quan trọng:
 *   - Endpoint GET /api/search hiện có KHÔNG bị thay đổi contract; chỉ enrich payload.
 *   - Endpoint mới: GET /api/search/history (lấy lịch sử của self),
 *     DELETE /api/search/history (xoá hết lịch sử của self).
 *   - Ghi log audit mỗi lần user search thành công (action: SEARCH_EXECUTED).
 */

const prisma = require("../../config/database");
const audit = require("../audit/audit.service");

const VALID_TYPES = ["users", "notifications", "files", "settings", "all"];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
// Mặc định mỗi module tối đa 5 kết quả khi type=all — đủ UX mà không tải nặng DB.
const DEFAULT_ALL_LIMIT = 5;
// Highlight snippet chiều dài tối đa (ký tự) — đủ cho 1 dòng trong dropdown.
const SNIPPET_RADIUS = 30;
// Lưu tối đa 10 keyword gần nhất cho mỗi user.
const MAX_HISTORY = 10;

function badRequest(message) {
  const e = new Error(message);
  e.code = "BAD_REQUEST";
  return e;
}

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
  if (type === "settings") {
    return {
      id: true,
      key: true,
      value: true,
      description: true,
      group: true,
      updatedAt: true,
    };
  }
  return null;
}

// ===== Highlight helpers =====
//
// FE dùng để render <mark>...</mark> quanh các vị trí match. `positions` là mảng
// [start, endExclusive) (chuẩn Intl.Segmenter / substring).
//
// `snippet` là đoạn text ngắn chứa match đầu tiên, có prefix/suffix "…" nếu bị cắt.
//
// `needle` đã được normalize (lowercase) bên dưới; ta dùng function case-insensitive
// match đơn giản (substring) — không xử lý Unicode normalize phức tạp vì keyword
// từ FE thường đã plain ASCII/tiếng Việt có dấu.
function findAllPositions(haystack, needleLower) {
  const positions = [];
  if (!haystack || !needleLower) return positions;
  const h = haystack.toLowerCase();
  let from = 0;
  while (from <= h.length) {
    const idx = h.indexOf(needleLower, from);
    if (idx === -1) break;
    positions.push([idx, idx + needleLower.length]);
    from = idx + needleLower.length;
  }
  return positions;
}

function buildSnippet(haystack, needleLower, radius = SNIPPET_RADIUS) {
  if (!haystack) return null;
  const positions = findAllPositions(haystack, needleLower);
  if (!positions.length) {
    // Không có match (lý do: data cũ hoặc snippet rỗng) — trả phần đầu text.
    const trimmed = haystack.length > radius * 2 ? haystack.slice(0, radius * 2) : haystack;
    return haystack.length > radius * 2 ? `${trimmed}…` : trimmed;
  }
  const firstMatch = positions[0];
  const start = Math.max(0, firstMatch[0] - radius);
  const end = Math.min(haystack.length, firstMatch[1] + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < haystack.length ? "…" : "";
  return `${prefix}${haystack.slice(start, end)}${suffix}`;
}

// Chuẩn hoá keyword cho `findAllPositions` / `buildSnippet`.
function lc(s) {
  return typeof s === "string" ? s.toLowerCase() : "";
}

// Áp dụng highlight lên 1 item: trả về object `highlight` gồm {positions, snippet}
// cho từng field text. Chỉ những field được list mới có highlight — tiết kiệm
// payload và tránh phải xử lý field Date/Boolean.
function buildItemHighlight(item, textFields, needleLower) {
  if (!needleLower) return null;
  const positions = {};
  const snippet = {};
  for (const f of textFields) {
    const v = item?.[f];
    if (typeof v === "string" && v.length > 0) {
      const pos = findAllPositions(v, needleLower);
      if (pos.length) positions[f] = pos;
      const snip = buildSnippet(v, needleLower);
      if (snip) snippet[f] = snip;
    }
  }
  if (!Object.keys(positions).length && !Object.keys(snippet).length) return null;
  return { positions, snippet };
}

// ===== Các hàm search riêng cho từng module =====

async function searchUsers({ keyword, page, limit, isAdmin }) {
  if (!isAdmin) return { items: [], total: 0, page, limit };
  const where = {
    OR: [
      { fullName: { contains: keyword, mode: "insensitive" } },
      { email: { contains: keyword, mode: "insensitive" } },
      { phone: { contains: keyword, mode: "insensitive" } },
    ],
  };
  const skip = (page - 1) * limit;
  const needle = lc(keyword);
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: buildSelect("users"),
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);
  const items = rows.map((u) => ({
    ...u,
    highlight: buildItemHighlight(u, ["fullName", "email", "phone"], needle),
  }));
  return { items, total, page, limit };
}

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
  const needle = lc(keyword);
  const [rows, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: buildSelect("notifications"),
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where }),
  ]);
  const items = rows.map((n) => ({
    ...n,
    highlight: buildItemHighlight(n, ["title", "message"], needle),
  }));
  return { items, total, page, limit };
}

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
  const needle = lc(keyword);
  const [rows, total] = await Promise.all([
    prisma.uploadFile.findMany({
      where,
      select: buildSelect("files"),
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.uploadFile.count({ where }),
  ]);
  const items = rows.map((f) => ({
    ...f,
    highlight: buildItemHighlight(f, ["originalName", "storedName"], needle),
  }));
  return { items, total, page, limit };
}

// Settings — chỉ Admin. Search trên `key` + `description`.
// `value` là JSON string nên ta không search trên value (sẽ trả về ngẫu nhiên nếu match),
// nhưng nếu FE/BE cần thì có thể bật sau với `StringContains` trên value.
async function searchSettings({ keyword, page, limit, isAdmin }) {
  if (!isAdmin) return { items: [], total: 0, page, limit };
  const where = {
    OR: [
      { key: { contains: keyword, mode: "insensitive" } },
      { description: { contains: keyword, mode: "insensitive" } },
    ],
  };
  const skip = (page - 1) * limit;
  const needle = lc(keyword);
  const [rows, total] = await Promise.all([
    prisma.setting.findMany({
      where,
      select: buildSelect("settings"),
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.setting.count({ where }),
  ]);
  const items = rows.map((s) => ({
    ...s,
    highlight: buildItemHighlight(s, ["key", "description"], needle),
  }));
  return { items, total, page, limit };
}

// ===== Search History =====

/**
 * Ghi 1 keyword vào lịch sử tìm kiếm của user.
 *
 * Logic dedupe: nếu user đã search cùng keyword (case-insensitive) gần đây thì
 * ta KHÔNG tạo row mới — chỉ di chuyển `createdAt` của row cũ lên now() bằng
 * cách update. Điều này giữ lịch sử "từ khoá duy nhất" ở đầu, dễ cho UX recent
 * keyword (Google-style).
 *
 * Sau khi ghi, cắt tỉa để chỉ giữ MAX_HISTORY dòng mới nhất.
 *
 * Không throw — lỗi ghi history không được ảnh hưởng tới search chính.
 */
async function recordSearchHistory(userId, keywordRaw) {
  if (!userId) return;
  const keyword = String(keywordRaw || "").trim();
  if (!keyword) return;
  const normalized = keyword.toLowerCase();
  try {
    // Tìm row cũ trùng keyword (case-insensitive) của user này.
    const existing = await prisma.searchHistory.findFirst({
      where: {
        userId,
        keyword: { equals: keyword, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      // Update keyword về dạng user vừa gõ (giữ casing gốc), đẩy createdAt lên now.
      await prisma.searchHistory.update({
        where: { id: existing.id },
        data: { keyword, createdAt: new Date() },
      });
    } else {
      await prisma.searchHistory.create({
        data: { userId, keyword },
      });
    }

    // Cắt tỉa: chỉ giữ MAX_HISTORY dòng mới nhất.
    const all = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (all.length > MAX_HISTORY) {
      const idsToDelete = all.slice(MAX_HISTORY).map((r) => r.id);
      await prisma.searchHistory.deleteMany({ where: { id: { in: idsToDelete } } });
    }
    // Tránh warning "normalized declared but unused" nếu sau này dùng.
    void normalized;
  } catch (err) {
    console.warn(
      "[search.service] recordSearchHistory failed:",
      err && err.message ? err.message : err
    );
  }
}

/**
 * Lấy lịch sử từ khoá gần nhất của 1 user (mặc định 10).
 * Trả [{ id, keyword, createdAt }].
 */
async function getSearchHistory(userId, limit = MAX_HISTORY) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || MAX_HISTORY));
  const rows = await prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
    select: { id: true, keyword: true, createdAt: true },
  });
  return rows;
}

/**
 * Xoá toàn bộ lịch sử của user (DELETE /api/search/history).
 */
async function clearSearchHistory(userId) {
  const result = await prisma.searchHistory.deleteMany({ where: { userId } });
  return { deleted: result.count };
}

// ===== Hàm search chính =====

async function search(currentUser, query = {}, req = null) {
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

  const isAdmin = currentUser && currentUser.role === "ADMIN";
  const currentUserId = currentUser && currentUser.id;

  // Khi type=all: tự động dùng limit mặc định 5/module (không tôn trọng limit
  // từ query — đây là "lightweight search dropdown" UX).
  // Khi type cụ thể: tôn trọng paging như cũ.
  const isAll = type === "all";

  let paging;
  let allLimit;
  if (isAll) {
    // Bỏ qua page (all search luôn page 1) — dùng DEFAULT_ALL_LIMIT cho mỗi module.
    paging = { page: 1, limit: DEFAULT_ALL_LIMIT };
    allLimit = DEFAULT_ALL_LIMIT;
  } else {
    paging = parsePaging(query);
  }

  const searchArgs = {
    keyword,
    page: paging.page,
    limit: isAll ? allLimit : paging.limit,
    isAdmin,
    currentUserId,
  };

  // Thực thi song song các module phù hợp với type.
  // Lưu ý: searchUsers/Settings trả [] khi không phải admin; do đó kết quả all
  // cho user thường chỉ có notifications + files (của họ).
  let result;
  if (isAll) {
    const [users, notifications, files, settings] = await Promise.all([
      searchUsers(searchArgs),
      searchNotifications(searchArgs),
      searchFiles(searchArgs),
      searchSettings(searchArgs),
    ]);
    result = {
      keyword,
      type,
      mode: "lightweight",
      limitPerModule: allLimit,
      users,
      notifications,
      files,
      settings,
      // Tổng nhanh để FE render "X kết quả" mà không cần cộng tay.
      totals: {
        users: users.total,
        notifications: notifications.total,
        files: files.total,
        settings: settings.total,
        grand:
          users.total + notifications.total + files.total + settings.total,
      },
    };
  } else {
    // Single-module search (giữ nguyên behavior cũ — không bổ sung totals).
    if (type === "users") {
      result = {
        keyword,
        type,
        mode: "detailed",
        users: await searchUsers(searchArgs),
      };
    } else if (type === "notifications") {
      result = {
        keyword,
        type,
        mode: "detailed",
        notifications: await searchNotifications(searchArgs),
      };
    } else if (type === "files") {
      result = {
        keyword,
        type,
        mode: "detailed",
        files: await searchFiles(searchArgs),
      };
    } else {
      result = {
        keyword,
        type,
        mode: "detailed",
        settings: await searchSettings(searchArgs),
      };
    }
  }

  // Ghi lịch sử (best-effort) — chỉ khi có ít nhất 1 kết quả tổng.
  if (currentUserId) {
    const grandTotal = result.totals
      ? result.totals.grand
      : (result.users?.total ?? 0) +
        (result.notifications?.total ?? 0) +
        (result.files?.total ?? 0) +
        (result.settings?.total ?? 0);
    if (grandTotal > 0) {
      await recordSearchHistory(currentUserId, keyword);
    }
  }

  // Ghi audit (best-effort).
  try {
    const meta = {
      keyword,
      type,
      isAll,
      totals: result.totals ?? null,
    };
    if (req) {
      await audit.logFromRequest(req, {
        userId: currentUserId,
        action: "SEARCH_EXECUTED",
        target: "Search:Global",
        meta,
      });
    } else if (currentUserId) {
      await audit.log({
        userId: currentUserId,
        action: "SEARCH_EXECUTED",
        target: "Search:Global",
        meta,
      });
    }
  } catch (err) {
    console.warn(
      "[search.service] audit log failed:",
      err && err.message ? err.message : err
    );
  }

  return result;
}

module.exports = {
  VALID_TYPES,
  DEFAULT_ALL_LIMIT,
  MAX_HISTORY,
  search,
  getSearchHistory,
  clearSearchHistory,
  // Export cho test (không dùng ở controller thường).
  recordSearchHistory,
};