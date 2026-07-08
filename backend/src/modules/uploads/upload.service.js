const fs = require("fs");
const path = require("path");
const repo = require("./upload.repository");
const { UPLOAD_DIR } = require("../../middlewares/upload.middleware");

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
async function listFiles(currentUser, query = {}) {
  const isAdmin = currentUser && currentUser.role === "ADMIN";
  const uploadedById = isAdmin ? null : currentUser.id;

  const page = query.page ? Number(query.page) : 1;
  const pageSize = query.pageSize ? Number(query.pageSize) : 20;

  if (Number.isNaN(page) || page < 1) throw badRequest("page phải là số nguyên dương");
  if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
    throw badRequest("pageSize phải từ 1 đến 100");
  }

  return repo.findAll({ uploadedById, page, pageSize });
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

// DELETE /files/:id  — xoá cả file vật lý + bản ghi
async function removeFile(currentUser, id) {
  const file = await repo.findById(id);
  if (!file) throw notFound();

  const isAdmin = currentUser && currentUser.role === "ADMIN";
  if (!isAdmin && file.uploadedById !== currentUser.id) {
    throw forbidden();
  }

  // Xoá file vật lý trước (nếu không tồn tại trên disk thì bỏ qua, vẫn xoá DB)
  try {
    const absPath = path.isAbsolute(file.path)
      ? file.path
      : path.join(UPLOAD_DIR, path.basename(file.path));
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  } catch (err) {
    // Không block xoá DB nếu xoá file vật lý lỗi
    console.warn("[upload.service] không xoá được file vật lý:", err.message);
  }

  await repo.remove(file.id);
  return { id: file.id, originalName: file.originalName };
}

module.exports = {
  uploadFile,
  listFiles,
  getOneFile,
  removeFile,
};