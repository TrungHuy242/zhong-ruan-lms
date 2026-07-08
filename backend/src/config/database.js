/**
 * database.js — Khởi tạo Prisma Client với extension soft-delete.
 *
 * Export:
 *  - prisma            : client extended, auto-filter deletedAt: null cho 3 model
 *                        (user/notification/uploadFile). Dùng cho mọi API code.
 *  - prismaInternal    : client thuần (KHÔNG extension), dùng nội bộ cho
 *                        softDelete/restore/forceDelete cần thấy cả record đã xóa.
 *
 * Lưu ý: Mọi module hiện tại `require("../config/database")` vẫn nhận được `prisma`
 * như cũ (vì `module.exports = prisma` ở cuối file).
 */

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { buildSoftDeleteExtension } = require("../utils/prismaSoftDelete");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const baseClient = new PrismaClient({ adapter });

// Public client: auto-filter
const prisma = baseClient.$extends(buildSoftDeleteExtension());

// Internal client: KHÔNG filter, dùng cho softDelete helper
const prismaInternal = baseClient;

module.exports = prisma;
module.exports.prismaInternal = prismaInternal;
