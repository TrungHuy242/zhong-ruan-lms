const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

// Đường dẫn thư mục uploads (tuyệt đối, tránh lỗi khi chạy từ thư mục khác)
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

// Tự tạo thư mục nếu chưa tồn tại (phòng trường hợp dev xóa nhầm)
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Danh sách đuôi file và MIME type được phép
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Cấu hình nơi lưu + cách đặt tên file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // Tên gốc an toàn (chỉ lấy basename, bỏ path)
    const safeOriginal = path.basename(file.originalname);

    // Tên lưu trên disk: <timestamp>-<random>.<ext> để tránh trùng
    const unique = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(safeOriginal).toLowerCase();
    const storedName = `${Date.now()}-${unique}${ext}`;

    // Gắn lại vào file để controller/service dùng
    file.storedName = storedName;
    file.safeOriginalName = safeOriginal;

    cb(null, storedName);
  },
});

// Hàm lọc file: kiểm tra MIME + extension
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Định dạng file "${ext}" không được phép. Chỉ chấp nhận: jpg, jpeg, png, pdf, doc, docx`));
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`MIME type "${file.mimetype}" không được phép`));
  }

  cb(null, true);
}

// Khởi tạo multer với cấu hình trên
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // mỗi request 1 file (mở rộng sau nếu cần nhiều file)
  },
});

module.exports = {
  upload,
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
};