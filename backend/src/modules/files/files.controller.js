const filesService = require("./files.service");
const audit = require("../audit/audit.service");
const path = require("path");
const fs = require("fs");
const archiver = require("archiver");

// Map error.code -> HTTP status (chia sẻ giữa các handler)
function statusFromError(error) {
  let status = 400;
  if (error.code === "NOT_FOUND") status = 404;
  else if (error.code === "FORBIDDEN") status = 403;
  return status;
}

// =====================================================================
// CRUD đơn lẻ — giữ nguyên response shape (backward compatible)
// =====================================================================
async function upload(req, res) {
  try {
    const file = await filesService.uploadFile(req.user.id, req.file);
    res.status(201).json({
      message: "Upload file thành công",
      data: { file },
    });
  } catch (error) {
    console.error("[files.controller] upload error:", error && error.message ? error.message : error);
    res.status(400).json({
      message: error.message || "Lỗi upload",
    });
  }
}

async function list(req, res) {
  try {
    const result = await filesService.listFiles(req.user, req.query);
    res.json({
      message: "Lấy danh sách file thành công",
      data: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      },
    });
  } catch (error) {
    res.status(statusFromError(error)).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

async function getOne(req, res) {
  try {
    const file = await filesService.getOneFile(req.user, req.params.id);
    res.json({
      message: "Lấy thông tin file thành công",
      data: { file },
    });
  } catch (error) {
    res.status(statusFromError(error)).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

async function remove(req, res) {
  try {
    const result = await filesService.removeFile(req.user, req.params.id, req);
    res.json({
      message: "Đã chuyển file vào thùng rác (soft delete, file vật lý vẫn còn)",
      data: result,
    });
  } catch (error) {
    res.status(statusFromError(error)).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

async function restore(req, res) {
  try {
    const result = await filesService.restoreFile(req.user, req.params.id, req);
    res.json({
      message: "Khôi phục file thành công",
      data: result,
    });
  } catch (error) {
    res.status(statusFromError(error)).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

async function forceRemove(req, res) {
  try {
    const result = await filesService.forceDeleteFile(req.user, req.params.id, req);
    res.json({
      message: "Đã xóa cứng file khỏi database và xóa file vật lý trên disk",
      data: result,
    });
  } catch (error) {
    res.status(statusFromError(error)).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

// =====================================================================
// MỚI — DELETE /files/bulk
// =====================================================================
async function bulkRemove(req, res) {
  try {
    const result = await filesService.bulkSoftDelete(req.user, req.body && req.body.ids, req);
    res.json({
      message: `Đã chuyển ${result.deletedCount} file vào thùng rác`,
      data: result,
    });
  } catch (error) {
    const status = statusFromError(error);
    const payload = {
      message: error.message || "Lỗi hệ thống",
    };
    if (error.details) payload.details = error.details;
    res.status(status).json(payload);
  }
}

// =====================================================================
// MỚI — GET /files/storage-stats (chỉ Admin)
// =====================================================================
async function storageStats(req, res) {
  try {
    const stats = await filesService.getStorageStats(req.user);
    res.json({
      message: "Lấy thống kê dung lượng thành công",
      data: stats,
    });
  } catch (error) {
    res.status(statusFromError(error)).json({
      message: error.message || "Lỗi hệ thống",
    });
  }
}

// =====================================================================
// MỚI — POST /files/bulk-download (stream zip)
// =====================================================================
/**
 * Giới hạn bulk-download: 50 file / 500MB tổng — trả 400 sớm nếu vượt.
 * Nếu không có file hợp lệ (sau khi check permission) -> 404.
 */
const BULK_DOWNLOAD_MAX_FILES = 50;
const BULK_DOWNLOAD_MAX_TOTAL_BYTES = 500 * 1024 * 1024;

async function bulkDownload(req, res) {
  const ids = req.body && req.body.ids;
  const filesServiceModule = require("./files.service");
  const repo = require("./files.repository");
  const { validateBulkIds } = require("./files.helpers");

  // === Validate input ===
  const validated = validateBulkIds(ids);
  if (!validated.ok) {
    return res.status(400).json({ message: validated.error });
  }

  const isAdmin = req.user && req.user.role === "ADMIN";

  // === Fetch files (chỉ chưa xoá) ===
  const files = await repo.findManyByIds(validated.ids);

  // Permission check từng file
  const allowed = [];
  const forbiddenIds = [];
  const notFoundIds = validated.ids.filter(
    (id) => !files.some((f) => f.id === id)
  );

  for (const f of files) {
    if (!isAdmin && f.uploadedById !== req.user.id) {
      forbiddenIds.push(f.id);
    } else {
      allowed.push(f);
    }
  }

  if (forbiddenIds.length > 0) {
    return res.status(403).json({
      message: `Bạn không có quyền tải ${forbiddenIds.length} file: [${forbiddenIds.join(", ")}]`,
      details: { forbiddenIds },
    });
  }
  if (notFoundIds.length > 0) {
    return res.status(404).json({
      message: `Không tìm thấy ${notFoundIds.length} file: [${notFoundIds.join(", ")}]`,
      details: { notFoundIds },
    });
  }
  if (allowed.length === 0) {
    return res.status(404).json({ message: "Không có file nào hợp lệ để tải" });
  }

  // === Giới hạn số file + tổng dung lượng (chặn sớm TRƯỚC khi stream) ===
  if (allowed.length > BULK_DOWNLOAD_MAX_FILES) {
    return res.status(400).json({
      message: `Chỉ được tải tối đa ${BULK_DOWNLOAD_MAX_FILES} file mỗi lần (đang chọn ${allowed.length})`,
    });
  }
  const totalBytes = allowed.reduce((sum, f) => sum + (f.size || 0), 0);
  if (totalBytes > BULK_DOWNLOAD_MAX_TOTAL_BYTES) {
    return res.status(400).json({
      message: `Tổng dung lượng vượt giới hạn ${(BULK_DOWNLOAD_MAX_TOTAL_BYTES / 1024 / 1024).toFixed(0)} MB (đang chọn ${(totalBytes / 1024 / 1024).toFixed(1)} MB)`,
    });
  }

  // === Stream zip ===
  // Tên file zip gốc: files_<timestamp>.zip
  const zipName = `files_${Date.now()}.zip`;
  res.attachment(zipName);
  // Stream zip level 9 (max compression)
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.on("warning", (err) => {
    // archiver có thể bắn warning (vd: ENOENT) mà không throw — log thôi.
    if (err.code === "ENOENT") {
      console.warn("[files.controller] bulk-download: missing file skipped:", err.path);
    } else {
      console.warn("[files.controller] bulk-download archiver warning:", err && err.message ? err.message : err);
    }
  });

  archive.on("error", (err) => {
    // Lỗi nghiêm trọng: response có thể đã gửi headers rồi -> không trả JSON được.
    // Chỉ log + ngắt stream. Client sẽ thấy download bị cắt giữa chừng.
    console.error("[files.controller] bulk-download archiver error:", err && err.message ? err.message : err);
    try {
      res.end();
    } catch (_) {
      // ignore
    }
  });

  // Track missing files TRƯỚC khi pipe để có thể set header X-Missing-Files sớm
  // (một khi archive đã pipe xong, response flush headers — không set lại được).
  const missingFiles = [];
  for (const f of allowed) {
    if (!f.path) {
      missingFiles.push({ id: f.id, originalName: f.originalName, reason: "no_path" });
      continue;
    }
    const absPath = path.isAbsolute(f.path) ? f.path : path.join(process.cwd(), f.path);
    try {
      if (!fs.existsSync(absPath)) {
        missingFiles.push({ id: f.id, originalName: f.originalName, reason: "file_not_found" });
        console.warn(
          `[files.controller] bulk-download: file vật lý không tồn tại (id=${f.id}, path=${absPath}) — bỏ qua`
        );
      }
    } catch (err) {
      missingFiles.push({ id: f.id, originalName: f.originalName, reason: "check_error" });
      console.warn(
        `[files.controller] bulk-download: lỗi kiểm tra file (id=${f.id}):`,
        err && err.message ? err.message : err
      );
    }
  }

  // Set X-Missing-Files TRƯỚC khi pipe — response chưa flush headers.
  if (missingFiles.length > 0) {
    res.setHeader("X-Missing-Files", JSON.stringify(missingFiles));
  }

  archive.pipe(res);

  // Add các file thực sự tồn tại vào archive (stream từ disk, không load memory).
  for (const f of allowed) {
    if (missingFiles.some((m) => m.id === f.id)) continue;
    const absPath = path.isAbsolute(f.path) ? f.path : path.join(process.cwd(), f.path);
    archive.file(absPath, { name: f.originalName || `file_${f.id}` });
  }

  // Audit log (tổng hợp — không log từng file vì có thể tới 50 file, gây spam)
  if (req) {
    await audit.logFromRequest(req, {
      userId: req.user && req.user.id,
      action: "UPLOAD_BULK_DOWNLOAD",
      target: "UploadFile",
      meta: {
        requestedIds: validated.ids,
        downloadedIds: allowed.map((f) => f.id),
        missingFiles,
        totalBytes,
        fileCount: allowed.length,
      },
    });
  }

  try {
    await archive.finalize();
  } catch (err) {
    // archive.finalize có thể ném nếu pipe bị đóng giữa chừng. Log + để response tự kết thúc.
    console.error("[files.controller] bulk-download finalize error:", err && err.message ? err.message : err);
  }
}

module.exports = {
  upload,
  list,
  getOne,
  remove,
  restore,
  forceRemove,
  bulkRemove,
  storageStats,
  bulkDownload,
};