/**
 * trash.service.js — Service thống nhất cho module Trash Manager.
 *
 * Chức năng:
 *   1. list({ module, deletedById, from, to, keyword, page, limit })
 *      → Trả dữ liệu đã xoá mềm của 1 trong 4 module, có phân trang,
 *        include thông tin actor (deletedBy), filter theo deletedById,
 *        khoảng thời gian deletedAt, và keyword search trên các field chính.
 *
 *   2. restoreOne(module, id, currentUserId, req)
 *      → Khôi phục 1 bản ghi đã xoá mềm. Idempotent.
 *      → Ghi AuditLog qua softDelete helper.
 *
 *   3. forceDeleteOne(module, id, currentUserId, req)
 *      → Xoá cứng 1 bản ghi. Snapshot trước khi xoá (audit trail).
 *
 *   4. bulkRestore(items, currentUserId, req)
 *      → Khôi phục nhiều bản ghi. Mỗi restore 1 audit.
 *
 *   5. bulkForceDelete(items, currentUserId, req)
 *      → Xoá cứng nhiều bản ghi. Mỗi force-delete 1 audit.
 *
 * Quy tắc:
 *   - Bulk operations: MỖI record được xử lý độc lập; lỗi 1 record KHÔNG
 *     chặn các record khác. Trả { success, failed, results: [{module,id,ok,error?}] }.
 *   - Bulk KHÔNG chạy trong $transaction (để partial-success khả thi). Tuy nhiên,
 *     mỗi record vẫn được restore/force-delete qua helper đã có (atomic ở mức row).
 *   - Audit tổng hợp `TRASH_BULK_RESTORE` / `TRASH_BULK_FORCE_DELETE` 1 record
 *     cho cả batch (không spam), kèm danh sách id đã xử lý.
 */

const { prismaInternal } = require("../../config/database");
const audit = require("../audit/audit.service");
const {
  softDelete,
  restore,
  forceDelete,
  RESTORE_ACTIONS,
  FORCE_DELETE_ACTIONS,
} = require("../../utils/softDelete");

// ===== Module whitelist =====
const MODULES = ["users", "notifications", "files", "settings", "teachers", "pricingplans", "contactrequests"];
const MODULE_TO_LABEL = {
  users: "User",
  notifications: "Notification",
  files: "UploadFile",
  settings: "Setting",
  teachers: "Teacher",
  pricingplans: "PricingPlan",
  contactrequests: "ContactRequest",
};
const MODULE_TO_PRISMA = {
  users: "user",
  notifications: "notification",
  files: "uploadFile",
  settings: "setting",
  teachers: "teacher",
  pricingplans: "pricingPlan",
  contactrequests: "contactRequest",
};

// ===== Error helpers =====
function badRequest(message) {
  const e = new Error(message);
  e.code = "BAD_REQUEST";
  return e;
}
function notFound(message = "Không tìm thấy") {
  const e = new Error(message);
  e.code = "NOT_FOUND";
  return e;
}

function assertModule(mod) {
  if (!MODULES.includes(mod)) {
    throw badRequest(
      `module không hợp lệ. Chỉ chấp nhận: ${MODULES.join(", ")}`
    );
  }
}

// ===== 1. LIST =====
//
// Trả dữ liệu đã xoá mềm có phân trang + filter.
// Filter chung cho cả 4 module: deletedById, from/to, keyword (khoảng text).
// Mỗi module có thêm 1 vài field riêng để search (vd: email/fullName với users).
async function listTrash({
  module: mod = null,
  deletedById = null,
  from = null,
  to = null,
  keyword = null,
  page = 1,
  limit = 20,
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  // Common where: deletedAt != null (+ from/to + deletedById)
  const baseWhere = { deletedAt: { not: null } };
  if (from || to) {
    baseWhere.deletedAt = baseWhere.deletedAt || {};
    if (from) baseWhere.deletedAt.gte = new Date(from);
    if (to) baseWhere.deletedAt.lte = new Date(to);
  }
  if (deletedById) {
    const actorId = Number(deletedById);
    if (Number.isFinite(actorId) && actorId > 0) {
      baseWhere.deletedById = actorId;
    }
  }

  // Module cụ thể — build where riêng (keyword search trên field phù hợp).
  const moduleWhere = buildModuleWhere(mod, keyword);

  const where = mergeWhere(baseWhere, moduleWhere);
  const delegate = pickDelegate(mod);

  const orderBy = { deletedAt: "desc" };

  let items = [];
  let total = 0;

  if (mod) {
    // 1 module
    assertModule(mod);
    const [i, t] = await Promise.all([
      delegate.findMany({
        where,
        orderBy,
        skip,
        take: safeLimit,
      }),
      delegate.count({ where }),
    ]);
    items = i.map((r) => serialize(mod, r));
    total = t;
  } else {
    // all 4 modules → chạy song song, rồi sort + paginate theo deletedAt desc
    const perModule = Math.ceil(safeLimit * 2); // lấy dư để sort chung
    const allResults = await Promise.all(
      MODULES.map(async (m) => {
        const d = pickDelegate(m);
        const w = mergeWhere(baseWhere, buildModuleWhere(m, keyword));
        const rows = await d.findMany({
          where: w,
          orderBy,
          take: perModule,
        });
        return rows.map((r) => serialize(m, r));
      })
    );
    const merged = allResults.flat();
    merged.sort((a, b) => {
      const ta = new Date(a.deletedAt).getTime();
      const tb = new Date(b.deletedAt).getTime();
      return tb - ta;
    });
    total = merged.length; // chính xác cho 1 page — không phải grand total
    items = merged.slice(skip, skip + safeLimit);
  }

  // Fill actor info (1 query)
  items = await resolveActors(items);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total > 0 ? Math.ceil(total / safeLimit) : 1,
    },
    filters: {
      module: mod,
      deletedById: deletedById ? Number(deletedById) : null,
      from,
      to,
      keyword,
    },
  };
}

function buildModuleWhere(mod, keyword) {
  if (!mod || !keyword || String(keyword).trim() === "") return {};
  const q = String(keyword).trim();
  switch (mod) {
    case "users":
      return {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      };
    case "notifications":
      return {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { message: { contains: q, mode: "insensitive" } },
        ],
      };
    case "files":
      return {
        OR: [
          { originalName: { contains: q, mode: "insensitive" } },
          { storedName: { contains: q, mode: "insensitive" } },
        ],
      };
    case "settings":
      return {
        OR: [
          { key: { contains: q } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      };
    case "teachers":
      return {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { slug: { contains: q.toLowerCase() } },
          { title: { contains: q, mode: "insensitive" } },
        ],
      };
    case "pricingplans":
      return {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      };
    case "contactrequests":
      return {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      };
    default:
      return {};
  }
}

function mergeWhere(base, extra) {
  if (!extra || Object.keys(extra).length === 0) return base;
  return { AND: [base, extra] };
}

function pickDelegate(mod) {
  const key = MODULE_TO_PRISMA[mod];
  return prismaInternal[key];
}

/**
 * Chuẩn hoá 1 record thành shape thống nhất để FE render.
 * Lưu ý: KHÔNG include "deletedBy" từ Prisma (User chưa có relation ngược cho 3 model soft-delete
 * để tránh phải đụng schema). Service sẽ tự resolve actor qua resolveActors() sau.
 */
function serialize(mod, row) {
  return {
    id: row.id,
    module: mod,
    deletedAt: row.deletedAt,
    deletedById: row.deletedById ?? null,
    deletedBy: null, // được fill bởi resolveActors()
    label: pickLabel(mod, row),
    createdAt: row.createdAt,
  };
}

/**
 * Bulk lookup thông tin actor (deletedBy) — 1 query duy nhất.
 * Nhận list các row đã serialize, fill `deletedBy` nếu deletedById tồn tại.
 */
async function resolveActors(rows) {
  const actorIds = Array.from(
    new Set(
      rows
        .map((r) => r.deletedById)
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  );
  if (actorIds.length === 0) return rows;

  const actors = await prismaInternal.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, email: true, fullName: true, role: true },
  });
  const map = new Map(actors.map((a) => [a.id, a]));
  return rows.map((r) => {
    if (r.deletedById && map.has(r.deletedById)) {
      r.deletedBy = map.get(r.deletedById);
    }
    return r;
  });
}

function pickLabel(mod, row) {
  switch (mod) {
    case "users":
      return row.fullName || row.email || `#${row.id}`;
    case "notifications":
      return row.title || `#${row.id}`;
    case "files":
      return row.originalName || row.storedName || `#${row.id}`;
    case "settings":
      return row.key || `#${row.id}`;
    case "teachers":
      return row.fullName || row.title || `#${row.id}`;
    case "pricingplans":
      return row.name || `#${row.id}`;
    case "contactrequests":
      return row.fullName || row.email || `#${row.id}`;
    default:
      return `#${row.id}`;
  }
}

// ===== 2. RESTORE ONE =====

/**
 * Với 3 model User/Notification/UploadFile: dùng `id` (Int).
 * Với Setting: dùng `key` (String, unique) — restore theo key thay vì id
 * vì Setting không có API /:id public.
 */
async function restoreOne(mod, idOrKey, currentUserId, req = null) {
  assertModule(mod);
  const label = MODULE_TO_LABEL[mod];

  if (mod === "settings") {
    const restored = await restore(
      label,
      { key: String(idOrKey) },
      { req, userId: currentUserId }
    );
    if (!restored) {
      throw notFound(`Không tìm thấy ${label} với key = "${idOrKey}"`);
    }
    return {
      module: mod,
      id: restored.id,
      key: restored.key,
      deletedAt: restored.deletedAt,
      restored: true,
    };
  }

  // pricingplans, teachers, contactrequests dùng String (UUID), còn lại dùng Number (Int)
  const isStringIdModule = mod === "pricingplans" || mod === "teachers" || mod === "contactrequests";
  const numericId = Number(idOrKey);

  if (!isStringIdModule && (!Number.isFinite(numericId) || numericId <= 0)) {
    throw badRequest("id không hợp lệ");
  }

  const where = isStringIdModule ? { id: String(idOrKey) } : { id: numericId };
  const restored = await restore(
    label,
    where,
    { req, userId: currentUserId }
  );
  if (!restored) {
    throw notFound(`Không tìm thấy ${label} với id = ${idOrKey}`);
  }

  return {
    module: mod,
    id: restored.id,
    deletedAt: restored.deletedAt,
    restored: true,
  };
}

// ===== 3. FORCE DELETE ONE =====

async function forceDeleteOne(mod, idOrKey, currentUserId, req = null) {
  assertModule(mod);
  const label = MODULE_TO_LABEL[mod];

  if (mod === "settings") {
    const removed = await forceDelete(
      label,
      { key: String(idOrKey) },
      { req, userId: currentUserId }
    );
    if (!removed) {
      throw notFound(`Không tìm thấy ${label} với key = "${idOrKey}"`);
    }
    return {
      module: mod,
      id: removed.id,
      key: removed.key,
      forceDeleted: true,
    };
  }

  // pricingplans, teachers, contactrequests dùng String (UUID), còn lại dùng Number (Int)
  const isStringIdModule = mod === "pricingplans" || mod === "teachers" || mod === "contactrequests";
  const numericId = Number(idOrKey);

  if (!isStringIdModule && (!Number.isFinite(numericId) || numericId <= 0)) {
    throw badRequest("id không hợp lệ");
  }

  const where = isStringIdModule ? { id: String(idOrKey) } : { id: numericId };
  const removed = await forceDelete(
    label,
    where,
    { req, userId: currentUserId }
  );
  if (!removed) {
    throw notFound(`Không tìm thấy ${label} với id = ${idOrKey}`);
  }

  return {
    module: mod,
    id: removed.id,
    forceDeleted: true,
  };
}

// ===== 4. BULK RESTORE =====

/**
 * @param {Array<{module: string, id: number}>} items
 */
async function bulkRestore(items, currentUserId, req = null) {
  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest("items phải là mảng không rỗng");
  }
  if (items.length > 500) {
    throw badRequest("Bulk tối đa 500 bản ghi / lần");
  }

  const results = [];
  let success = 0;
  let failed = 0;

  for (const it of items) {
    try {
      const lookup = it.module === "settings" ? (it.key ?? it.id) : it.id;
      const r = await restoreOne(it.module, lookup, currentUserId, req);
      results.push({ ...r, ok: true });
      success += 1;
    } catch (err) {
      results.push({
        module: it.module,
        id: it.id ?? null,
        key: it.key ?? null,
        ok: false,
        error: err && err.message ? err.message : "Lỗi không xác định",
      });
      failed += 1;
    }
  }

  // Audit tổng hợp (1 record cho cả batch).
  await audit.logFromRequest(req, {
    userId: currentUserId,
    action: "TRASH_BULK_RESTORE",
    target: "Trash:bulk",
    meta: {
      total: items.length,
      success,
      failed,
      successIds: results.filter((r) => r.ok).map((r) => `${r.module}:${r.key ?? r.id}`),
      failedDetail: results.filter((r) => !r.ok),
    },
  });

  return { total: items.length, success, failed, results };
}

// ===== 5. BULK FORCE DELETE =====

async function bulkForceDelete(items, currentUserId, req = null) {
  if (!Array.isArray(items) || items.length === 0) {
    throw badRequest("items phải là mảng không rỗng");
  }
  if (items.length > 500) {
    throw badRequest("Bulk tối đa 500 bản ghi / lần");
  }

  const results = [];
  let success = 0;
  let failed = 0;

  for (const it of items) {
    try {
      const lookup = it.module === "settings" ? (it.key ?? it.id) : it.id;
      const r = await forceDeleteOne(it.module, lookup, currentUserId, req);
      results.push({ ...r, ok: true });
      success += 1;
    } catch (err) {
      results.push({
        module: it.module,
        id: it.id ?? null,
        key: it.key ?? null,
        ok: false,
        error: err && err.message ? err.message : "Lỗi không xác định",
      });
      failed += 1;
    }
  }

  await audit.logFromRequest(req, {
    userId: currentUserId,
    action: "TRASH_BULK_FORCE_DELETE",
    target: "Trash:bulk",
    meta: {
      total: items.length,
      success,
      failed,
      successIds: results.filter((r) => r.ok).map((r) => `${r.module}:${r.key ?? r.id}`),
      failedDetail: results.filter((r) => !r.ok),
    },
  });

  return { total: items.length, success, failed, results };
}

// ===== 6. STATS =====

/**
 * Thống kê tổng quan cho Trash Manager:
 *   - Tổng bản ghi đã xoá (toàn hệ thống)
 *   - Số lượng theo từng module
 *   - Hôm nay (>= 00:00 hôm nay UTC+7 — Việt Nam)
 *   - 7 ngày gần nhất
 *
 * Lưu ý: dùng 1 query per module (findMany với select id) → đếm trên Node.
 * Khi data lớn có thể thay bằng `prisma.X.count({ where: { deletedAt: { not: null } } })`
 * rồi gộp; hiện tại ước lượng tổng số record đã xoá < vài nghìn → đủ nhanh.
 *
 * Vì 3 model (User/Notification/UploadFile) track deletedById nhưng Setting
 * KHÔNG track → actorStats chỉ thống kê từ 3 model có deletedById.
 */
async function getTrashStats() {
  // Khoảng thời gian Việt Nam (UTC+7).
  const nowVn = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const startOfTodayVn = new Date(nowVn);
  startOfTodayVn.setHours(0, 0, 0, 0);
  const startOf7DaysAgoVn = new Date(startOfTodayVn);
  startOf7DaysAgoVn.setDate(startOf7DaysAgoVn.getDate() - 7);

  const baseWhere = { deletedAt: { not: null } };
  const todayWhere = { deletedAt: { gte: startOfTodayVn } };
  const last7Where = { deletedAt: { gte: startOf7DaysAgoVn } };

  // Đếm per module. Dùng findMany id để tránh Prisma issue với count nặng
  // (an toàn cho mọi phiên bản). Với 4 module × 2 query (tổng + 7 ngày) là 8 query nhỏ.
  const counts = await Promise.all(
    MODULES.map(async (mod) => {
      const delegate = pickDelegate(mod);
      // Lấy deletedAt + deletedById để count + actor thống kê.
      const allRows = await delegate.findMany({
        where: baseWhere,
        select: { deletedAt: true, deletedById: true },
      });
      const rows7 = allRows.filter(
        (r) => r.deletedAt && new Date(r.deletedAt) >= startOf7DaysAgoVn
      );
      const rowsToday = rows7.filter(
        (r) => r.deletedAt && new Date(r.deletedAt) >= startOfTodayVn
      );
      return {
        module: mod,
        total: allRows.length,
        today: rowsToday.length,
        last7Days: rows7.length,
        // Chỉ 3 model có deletedById; setting thì bỏ qua.
        deletedByCounts: countByActor(allRows),
      };
    })
  );

  const byModule = counts.reduce((acc, c) => {
    acc[c.module] = {
      total: c.total,
      today: c.today,
      last7Days: c.last7Days,
    };
    return acc;
  }, {});

  const total = counts.reduce((sum, c) => sum + c.total, 0);
  const today = counts.reduce((sum, c) => sum + c.today, 0);
  const last7Days = counts.reduce((sum, c) => sum + c.last7Days, 0);

  // Gộp top actors từ 3 module có deletedById (users/notifications/files).
  const actorMap = new Map(); // actorId → count
  for (const c of counts) {
    if (!c.deletedByCounts) continue;
    for (const [id, cnt] of Object.entries(c.deletedByCounts)) {
      const key = Number(id);
      actorMap.set(key, (actorMap.get(key) ?? 0) + cnt);
    }
  }
  const topActors = Array.from(actorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ actorId: id, count }));

  return {
    total,
    today,
    last7Days,
    byModule,
    topActors,
    generatedAt: new Date().toISOString(),
  };
}

function countByActor(rows) {
  const map = {};
  for (const r of rows) {
    if (r.deletedById && Number.isFinite(r.deletedById)) {
      map[r.deletedById] = (map[r.deletedById] ?? 0) + 1;
    }
  }
  return map;
}

// ===== 7. DETAIL =====

/**
 * Lấy chi tiết 1 bản ghi đã xoá kèm snapshot trước khi xoá (nếu còn) + thông tin actor.
 *
 * `raw` chính là record Prisma — đã là "before" trong ngữ cảnh (vì record
 * hiện tại đang ở trạng thái deleted). BE soft-delete giữ nguyên dữ liệu
 * row, chỉ set deletedAt + deletedById, nên toàn bộ row là "thông tin trước khi xoá".
 *
 * Trả thêm: `creator` (user tạo record — chỉ support cho module có field
 * tạo bởi user như Notification/UploadFile; với User thì chính nó là creator).
 */
async function getTrashDetail(mod, idOrKey) {
  assertModule(mod);
  const delegate = pickDelegate(mod);
  const label = MODULE_TO_LABEL[mod];

  let row;
  if (mod === "settings") {
    row = await delegate.findUnique({ where: { key: String(idOrKey) } });
  } else {
    // pricingplans, teachers, contactrequests dùng String (UUID), còn lại dùng Number (Int)
    const isStringIdModule = mod === "pricingplans" || mod === "teachers" || mod === "contactrequests";
    const numericId = Number(idOrKey);

    if (!isStringIdModule && (!Number.isFinite(numericId) || numericId <= 0)) {
      throw badRequest("id không hợp lệ");
    }

    const where = isStringIdModule ? { id: String(idOrKey) } : { id: numericId };
    row = await delegate.findUnique({ where });
  }

  if (!row || !row.deletedAt) {
    throw notFound(`Không tìm thấy ${label} đã xoá`);
  }

  const base = serialize(mod, row);
  if (row.deletedById) {
    const actor = await prismaInternal.user.findUnique({
      where: { id: row.deletedById },
      select: { id: true, email: true, fullName: true, role: true },
    });
    if (actor) base.deletedBy = actor;
  }

  // Creator — chỉ support 3 model có field phù hợp.
  let creator = null;
  if (mod === "users") {
    creator = { id: row.id, fullName: row.fullName, email: row.email, role: row.role };
  } else if (mod === "notifications") {
    if (row.userId) {
      creator = await prismaInternal.user.findUnique({
        where: { id: row.userId },
        select: { id: true, email: true, fullName: true, role: true },
      });
    }
  } else if (mod === "files") {
    if (row.uploadedById) {
      creator = await prismaInternal.user.findUnique({
        where: { id: row.uploadedById },
        select: { id: true, email: true, fullName: true, role: true },
      });
    }
  }
  // settings: không có creator, để null.

  // Snapshot = toàn bộ row (trừ các field nội bộ nhạy cảm nếu có).
  // Ở 4 model này không có field password/token → trả full row là an toàn.
  return {
    ...base,
    snapshot: row,
    creator,
  };
}

// ===== Helpers exposed =====
const RESTORE_ACTIONS_BY_MODULE = RESTORE_ACTIONS;
const FORCE_DELETE_ACTIONS_BY_MODULE = FORCE_DELETE_ACTIONS;

module.exports = {
  MODULES,
  MODULE_TO_LABEL,
  listTrash,
  restoreOne,
  forceDeleteOne,
  bulkRestore,
  bulkForceDelete,
  getTrashStats,
  getTrashDetail,
  resolveActors,
  serialize,
  RESTORE_ACTIONS_BY_MODULE,
  FORCE_DELETE_ACTIONS_BY_MODULE,
};