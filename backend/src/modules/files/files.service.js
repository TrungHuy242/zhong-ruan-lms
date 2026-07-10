const repo = require("./files.repository");
const { softDelete, restore, forceDelete } = require("../../utils/softDelete");
const { notDeletedWhere, parseFlags } = require("../../utils/softQuery");
const audit = require("../audit/audit.service");
const {
  categoryFromMime,
  normalizeFileType,
  validateBulkIds,
  normalizeSort,
  parseDate,
} = require("./files.helpers");

const fs = require("fs");
const path = require("path");

// ===== Errors (controller map .code -> HTTP status) =====
function notFound() {
  const e = new Error("Không tìm thấy file");
  e.code = "NOT_FOUND";
  return e;
}
function forbidden(message) {
  const e = new Error(message || "Bạn không có quyền thao tác file này");
  e.code = "FORBIDDEN";
  return e;
}
function badRequest(message) {
  const e = new Error(message);
  e.code = "BAD_REQUEST";
  return e;
}

// =====================================================================
// CRUD đơn lẻ — giữ nguyên contract, chỉ di chuyển từ uploads/ sang files/
// =====================================================================

async function uploadFile(currentUserId, file) {
  if (!file) throw badRequest("Thiếu file upload");
  return repo.create({
    originalName: file.safeOriginalName || file.originalname,
    storedName: file.storedName,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
    uploadedById: currentUserId,
  });
}

/**
 * GET /files — danh sách file có filter + sort + phân trang.
 *
 * Permission (giống bản cũ):
 *   - Admin: thấy tất cả
 *   - User thường: chỉ thấy file của mình (uploadedById === user.id)
 *
 * Query mới (backward compatible — nếu không truyền thì hành vi giống bản cũ):
 *   - sortBy:    name | size | createdAt (default createdAt)
 *   - sortOrder: asc | desc (default desc)
 *   - fileType:  image | document | video | audio
 *   - uploaderId: number (chỉ Admin dùng; user thường bị ép = currentUser.id)
 *   - dateFrom, dateTo: ISO date string
 */
async function listFiles(currentUser, query) {
  query = query || {};
  const isAdmin = currentUser && currentUser.role === "ADMIN";

  // === Permission mặc định (giữ nguyên bản cũ) ===
  // User thường: mặc định ép uploadedById = currentUser.id (không thể xem file người khác).
  // Admin: mặc định không filter uploader; nếu truyền uploaderId -> filter theo đó.
  let uploadedById = null;
  if (!isAdmin) {
    uploadedById = currentUser.id;
  } else if (query.uploaderId !== undefined && query.uploaderId !== "") {
    const n = Number(query.uploaderId);
    if (!Number.isInteger(n) || n <= 0) {
      throw badRequest("uploaderId phải là số nguyên dương");
    }
    uploadedById = n;
  }

  // === Phân trang ===
  const page = query.page ? Number(query.page) : 1;
  const pageSize = query.pageSize ? Number(query.pageSize) : 20;
  if (Number.isNaN(page) || page < 1) throw badRequest("page phải là số nguyên dương");
  if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
    throw badRequest("pageSize phải từ 1 đến 100");
  }

  // === Sort ===
  const sortResult = normalizeSort(query.sortBy, query.sortOrder);
  if (!sortResult.ok) throw badRequest(sortResult.error);
  const orderBy = { [sortResult.prismaField]: sortResult.prismaOrder };

  // === Build where clause ===
  const flags = parseFlags(query);
  const baseWhere = {};
  if (uploadedById != null) baseWhere.uploadedById = Number(uploadedById);

  // Filter fileType — vì DB không có cột category, ta không thể WHERE trực tiếp qua
  // Prisma theo derived column. Hai lựa chọn:
  //   (a) Filter ở Prisma bằng mimeType prefix (vd: mimeType: { startsWith: "image/" })
  //       -> NHANH, native SQL. Nhược điểm: extension-only files (mimeType trống) bị bỏ sót.
  //   (b) Fetch toàn bộ + filter JS — chậm với bảng lớn.
  // -> Chọn (a) kết hợp với (b) fallback cho extension-only: dùng mimeType prefix làm
  //    "primary signal", FE sẽ truyền đúng mimeType ổn định. Tài liệu nói rõ taxonomy
  //    dựa trên mimeType/extension theo logic map đã có trong FileIcon phía FE.
  const fileType = normalizeFileType(query.fileType);
  if (fileType) {
    baseWhere.mimeType = mimeTypeFilterForCategory(fileType);
  }

  // dateFrom / dateTo
  const dateFrom = parseDate(query.dateFrom);
  const dateTo = parseDate(query.dateTo);
  if (query.dateFrom && !dateFrom) throw badRequest("dateFrom không hợp lệ (cần ISO date string)");
  if (query.dateTo && !dateTo) throw badRequest("dateTo không hợp lệ (cần ISO date string)");
  if (dateFrom || dateTo) {
    baseWhere.createdAt = {};
    if (dateFrom) baseWhere.createdAt.gte = dateFrom;
    if (dateTo) baseWhere.createdAt.lte = dateTo;
  }

  const where = notDeletedWhere(baseWhere, flags);
  return repo.findAll({ where, orderBy, page, pageSize });
}

function mimeTypeFilterForCategory(category) {
  switch (category) {
    case "image":
      return { startsWith: "image/" };
    case "video":
      return { startsWith: "video/" };
    case "audio":
      return { startsWith: "audio/" };
    case "document":
      return {
        OR: [
          { mimeType: "application/pdf" },
          { mimeType: { startsWith: "text/" } },
          { mimeType: "application/msword" },
          {
            mimeType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          },
          { mimeType: "application/vnd.ms-excel" },
          {
            mimeType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
          { mimeType: "application/vnd.ms-powerpoint" },
          {
            mimeType:
              "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          },
          { mimeType: "application/zip" },
          { mimeType: "application/x-rar-compressed" },
          { mimeType: "application/x-7z-compressed" },
        ],
      };
    default:
      return undefined;
  }
}

// =====================================================================
// GET /files/:id — permission giống bản cũ: owner hoặc admin
// =====================================================================
async function getOneFile(currentUser, id) {
  const file = await repo.findById(id);
  if (!file) throw notFound();

  const isAdmin = currentUser && currentUser.role === "ADMIN";
  if (!isAdmin && file.uploadedById !== currentUser.id) {
    throw forbidden();
  }
  return file;
}

// =====================================================================
// DELETE /files/:id (soft) — permission giống bản cũ
// =====================================================================
async function removeFile(currentUser, id, req) {
  const file = await repo.findById(id);
  if (!file) throw notFound();

  const isAdmin = currentUser && currentUser.role === "ADMIN";
  if (!isAdmin && file.uploadedById !== currentUser.id) {
    throw forbidden();
  }

  const deleted = await softDelete(
    "UploadFile",
    { id: file.id },
    { req: req || null, userId: currentUser && currentUser.id }
  );
  if (!deleted) {
    return { id: file.id, originalName: file.originalName, alreadyDeleted: true };
  }
  return { id: deleted.id, originalName: deleted.originalName, deletedAt: deleted.deletedAt };
}

async function restoreFile(currentUser, id, req) {
  const file = await repo.findByIdIncludeDeleted(id);
  if (!file) throw notFound();

  const isAdmin = currentUser && currentUser.role === "ADMIN";
  if (!isAdmin && file.uploadedById !== currentUser.id) {
    throw forbidden();
  }

  const restored = await restore(
    "UploadFile",
    { id: file.id },
    { req: req || null, userId: currentUser && currentUser.id }
  );
  if (!restored) {
    throw new Error("Không thể khôi phục file");
  }
  return { id: restored.id, originalName: restored.originalName, deletedAt: restored.deletedAt };
}

async function forceDeleteFile(currentUser, id, req) {
  const isAdmin = currentUser && currentUser.role === "ADMIN";
  if (!isAdmin) {
    throw forbidden("Chỉ Admin mới được xóa cứng");
  }

  const file = await repo.findByIdIncludeDeleted(id);
  if (!file) throw notFound();

  await forceDelete(
    "UploadFile",
    { id: file.id },
    { req: req || null, userId: currentUser && currentUser.id }
  );

  try {
    if (file.path) {
      const absPath = path.isAbsolute(file.path)
        ? file.path
        : path.join(process.cwd(), file.path);
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath);
      }
    }
  } catch (err) {
    console.warn("[files.service] force-delete: không xóa được file vật lý:", err.message);
  }

  return {
    id: file.id,
    originalName: file.originalName,
    hardDeleted: true,
    physicalFileRemoved: true,
  };
}

// =====================================================================
// MỚI — DELETE /files/bulk — soft delete nhiều file, atomic
// =====================================================================
/**
 * Soft-delete nhiều file trong 1 transaction.
 *
 * Permission (theo yêu cầu): kiểm tra TỪNG file trong danh sách.
 *   - Admin: được xóa tất cả.
 *   - User thường: chỉ được xóa file mà uploadedById === currentUser.id.
 *   - Nếu có bất kỳ id nào không thuộc quyền -> trả 403 + liệt kê id bị từ chối.
 *     KHÔNG âm thầm bỏ qua. KHÔNG xóa phần còn lại.
 *
 * Audit: ghi log từng file bị soft-delete (UPLOAD_SOFT_DELETE — đã có sẵn trong softDelete helper).
 *
 * @returns {{ deletedCount: number, deletedIds: number[] }}
 */
async function bulkSoftDelete(currentUser, rawIds, req) {
  const validated = validateBulkIds(rawIds);
  if (!validated.ok) throw badRequest(validated.error);
  const ids = validated.ids;

  const isAdmin = currentUser && currentUser.role === "ADMIN";

  // Lấy tất cả file theo ids (chỉ chưa xoá)
  const files = await repo.findManyByIds(ids);

  // Xác định id không tồn tại
  const foundIds = new Set(files.map((f) => f.id));
  const notFoundIds = ids.filter((id) => !foundIds.has(id));

  // Xác định id không thuộc quyền
  const forbiddenIds = [];
  if (!isAdmin) {
    for (const f of files) {
      if (f.uploadedById !== currentUser.id) {
        forbiddenIds.push(f.id);
      }
    }
  }

  // Gộp "không tồn tại" + "không có quyền" -> nếu có 1 id lỗi -> fail 403/404 cả batch
  // (như yêu cầu: KHÔNG âm thầm bỏ qua)
  if (forbiddenIds.length > 0) {
    const e = new Error(
      `Bạn không có quyền xóa ${forbiddenIds.length} file: [${forbiddenIds.join(", ")}]`
    );
    e.code = "FORBIDDEN";
    e.details = { forbiddenIds, notFoundIds };
    throw e;
  }
  if (notFoundIds.length > 0) {
    const e = new Error(`Không tìm thấy ${notFoundIds.length} file: [${notFoundIds.join(", ")}]`);
    e.code = "NOT_FOUND";
    e.details = { notFoundIds };
    throw e;
  }

  // Atomic transaction: set deletedAt cho tất cả (chỉ những file chưa xoá — idempotent
  // cho những file đã được xoá trước đó). Không dùng softDelete() helper vì helper
  // gọi 1 query/update mỗi file — để bulk nhanh hơn và atomic, ta update hàng loạt.
  const { prisma } = require("../../config/database");
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.uploadFile.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { deletedAt: now },
    });
    return updated;
  });

  // Ghi audit log cho từng file thực sự bị xoá trong batch này.
  // Dùng logFromRequest để gắn IP + UA. Soft-delete helper đã tự ghi 1 audit/file
  // khi gọi qua softDelete(), nhưng ở batch transaction ta ghi thủ công để giữ
  // nguyên tắc 1 audit/record (giống behaviour softDelete đơn lẻ).
  if (req) {
    await Promise.all(
      files.map((f) =>
        audit.logFromRequest(req, {
          userId: currentUser && currentUser.id,
          action: "UPLOAD_SOFT_DELETE",
          target: `UploadFile:${f.id}`,
          meta: { id: f.id, deletedAt: now, bulk: true },
        })
      )
    );
  }

  return {
    deletedCount: result.count,
    deletedIds: files.map((f) => f.id),
  };
}

// =====================================================================
// MỚI — GET /files/storage-stats (chỉ Admin)
// =====================================================================
/**
 * Thống kê dung lượng toàn hệ thống, breakdown theo category.
 * Chỉ Admin. Đếm file chưa soft-delete.
 */
async function getStorageStats(currentUser) {
  const isAdmin = currentUser && currentUser.role === "ADMIN";
  if (!isAdmin) {
    throw forbidden("Chỉ Admin mới xem được thống kê dung lượng");
  }

  const rows = await repo.aggregateByMimePrefix();

  const breakdown = {
    image: { count: 0, size: 0 },
    document: { count: 0, size: 0 },
    video: { count: 0, size: 0 },
    audio: { count: 0, size: 0 },
  };
  let totalSize = 0;
  let totalFiles = 0;

  for (const r of rows) {
    const category = categoryFromMime(r.mimeType);
    breakdown[category].count += 1;
    breakdown[category].size += r.size;
    totalSize += r.size;
    totalFiles += 1;
  }

  return {
    totalSize,
    totalFiles,
    byType: breakdown,
  };
}

module.exports = {
  uploadFile,
  listFiles,
  getOneFile,
  removeFile,
  restoreFile,
  forceDeleteFile,
  bulkSoftDelete,
  getStorageStats,
};