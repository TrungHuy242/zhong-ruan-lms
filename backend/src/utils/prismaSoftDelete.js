/**
 * prismaSoftDelete.js — Prisma Client Extension (Prisma 7+) tự động ẩn record đã xóa mềm.
 *
 * Thay thế cho `prisma.$use()` đã bị xoá từ Prisma 7.
 * Áp dụng cho 3 model: User, Notification, UploadFile.
 *
 * Quy tắc:
 *  - Mặc định: MỌI truy vấn read (findUnique/findFirst/findMany/count/aggregate/groupBy)
 *    đều tự động thêm `deletedAt: null` vào `args.where`.
 *  - Tôn trọng: Nếu `args.where` đã chỉ định `deletedAt` (vd: `not: null` để xem thùng rác)
 *    thì KHÔNG ghi đè.
 *  - Write operations (create/update/delete) KHÔNG bị ảnh hưởng.
 *
 * ⚠️ Nếu code cần truy cập record đã xóa (vd: trong softDelete/restore/forceDelete helper),
 * hãy dùng `prismaInternal` từ `config/database.js` thay vì client mặc định.
 */

const SOFT_DELETE_MODELS = new Set(["User", "Notification", "UploadFile", "Setting"]);

const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

function buildSoftDeleteExtension() {
  return {
    name: "soft-delete-filter",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Chỉ áp dụng cho 3 model soft-delete
          if (!SOFT_DELETE_MODELS.has(model)) {
            return query(args);
          }

          // Write op: bỏ qua (giữ nguyên)
          if (!READ_OPERATIONS.has(operation)) {
            return query(args);
          }

          const a = args || {};
          const where = a.where || {};

          // Nếu dev đã chỉ định deletedAt → tôn trọng
          if ("deletedAt" in where) {
            return query(args);
          }

          // Mặc định: chèn deletedAt: null
          return query({ ...a, where: { ...where, deletedAt: null } });
        },
      },
    },
  };
}

module.exports = {
  buildSoftDeleteExtension,
  SOFT_DELETE_MODELS,
};
