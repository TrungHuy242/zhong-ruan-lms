/**
 * Helper script: apply a SQL migration file via Prisma client $executeRawUnsafe.
 * Bypass `prisma migrate dev` để tránh conflict với migrations cũ đã drift.
 *
 * Cách dùng:
 *   node scripts/run-migration.js prisma/migrations/XXXX/migration.sql
 */
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const fs = require("fs");
const path = require("path");

(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node scripts/run-migration.js <path-to-sql-file>");
    process.exit(1);
  }
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    console.error("File not found:", abs);
    process.exit(1);
  }
  const sql = fs.readFileSync(abs, "utf8");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$executeRawUnsafe(sql);
    console.log("✓ Applied:", path.basename(file));
  } catch (err) {
    console.error("✗ Failed:", err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();