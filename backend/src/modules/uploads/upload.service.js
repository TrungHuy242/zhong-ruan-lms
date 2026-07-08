const repo = require("./upload.repository");
const { softDelete, restore, forceDelete } = require("../../utils/softDelete");
const { notDeletedWhere, parseFlags } = require("../../utils/softQuery");
const fs = require("fs");
const path = require("path");

// Tạo lỗi có gắn .code để controller map status
function notFound() {
  const e = new Error("Không tìm thấy file");
  e.code = "NOT_FOUND";
  return e;
}

function forbidden() {
  const e = new Error("Bạn không có quyền thao tác file này");
  e.code = "FORBIDDEN";
  return e;
}

function badRequest(message) {
  const e = new Error(message);
  e.code = "BAD_REQUEST";
  return e;
}

// POST /upload
// file là object multer đã được middleware xử lý: { originalname, mimetype, size, path, storedName, safeOriginalName }
async function uploadFile(currentUserId, file) {
  if (!file) throw badRequest("Thiếu file upload");

  return repo.create({
    originalName: file.safeOriginalName || file.originalname,
    storedName: file.storedName,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path, // multer đã lưu trên disk xong mới vào đây
    uploadedById: currentUserId,
  });
}

// GET /files
async function listFiles(currentUser, query) {
  query = query || {};
  const isAdmin = currentUser && currentUser.role === "ADMIN";
  const uploadedById = isAdmin ? null : currentUser.id;

  const page = query.page ? Number(query.page) : 1;
  const pageSize = query.pageSize ? Number(query.pageSize) : 20;

  if (Number.isNaN(page) || page < 1) throw badRequest("page phải là số nguyên dương");
  if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
    throw badRequest("pageSize phải từ 1 đến 100");
  }

  const flags = parseFlags(query);
  const baseWhere = {};
  if (uploadedById != null) baseWhere.uploadedById = Number(uploadedById);
  const where = notDeletedWhere(baseWhere, flags);

  return repo.findAll({ where: where, page: page, pageSize: pageSize });
}

// GET /files/:id
async function getOneFile(currentUser, id) {
  const file = await repo.findById(id);
  if (!file) throw notFound();

  const isAdmin = currentUser && currentUser.role === "ADMIN";
  if (!isAdmin && file.uploadedById !== currentUser.id) {
    throw forbidden();
  }

  return file;
}

// DELETE /files/:id  — soft-delete (giữ file vật lý, có thể restore)
async function removeFile(currentUser, id, req) {
  const file = await repo.findById(id);
  if (!file) throw notFound();

  const isAdmin = currentUser && currentUser.role === "ADMIN";
  if (!isAdmin && file.uploadedById !== currentUser.id) {
    throw forbidden();
  }

  // Soft-delete: KHÔNG xoá file vật lý (giữ để có thể restore hoặc admin xem sau)
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

/**
 * Khôi phục file đã bị soft-delete.
 * - Admin: khôi phục bất kỳ
 * - User thường: chỉ khôi phục file của chính mình
 */
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

/**
 * Xóa cứng file: xóa cả bản ghi DB lẫn file vật lý trên disk. Chỉ Admin.
 */
async function forceDeleteFile(currentUser, id, req) {
  const isAdmin = currentUser && currentUser.role === "ADMIN";
  if (!isAdmin) {
    throw forbidden();
  }

  const file = await repo.findByIdIncludeDeleted(id);
  if (!file) throw notFound();

  await forceDelete(
    "UploadFile",
    { id: file.id },
    { req: req || null, userId: currentUser && currentUser.id }
  );

  // Cố gắng xóa file vật lý (không rollback nếu lỗi — DB record đã sạch)
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
    console.warn("[upload.service] force-delete: không xóa được file vật lý:", err.message);
  }

  return { id: file.id, originalName: file.originalName, hardDeleted: true, physicalFileRemoved: true };
}

module.exports = {
  uploadFile,
  listFiles,
  getOneFile,
  removeFile,
  restoreFile,
  forceDeleteFile,
};