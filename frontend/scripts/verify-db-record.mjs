// scripts/verify-db-record.mjs
// Verify E2E contact record persistence by:
// 1. Submitting via POST (real backend) → get record id
// 2. Querying via Prisma through a temp .cjs script in backend/

import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

const submitResult = await fetch("http://127.0.0.1:5000/api/public/contact-requests", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fullName: "DB Verify " + Date.now(),
    phone: "0901234567",
    email: `db_verify_${Date.now()}@example.com`,
    message: "Verify record persists in DB after Puppeteer E2E submit.",
  }),
});

const submitBody = await submitResult.json();
console.log("POST RESPONSE:", submitResult.status, JSON.stringify(submitBody, null, 2));

if (!submitBody?.data?.contact?.id) {
  console.log("Failed to submit, aborting DB check.");
  process.exit(1);
}

const recordId = submitBody.data.contact.id;
console.log(`\nRecord created: ${recordId}`);

// Write a temp .cjs script in backend dir to query Prisma
const tmpScript = path.join("d:/TrungHuy/ZhoungRuan/zhong-ruan-lms/backend", `.tmp-verify-${Date.now()}.cjs`);
const scriptBody = `const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  try {
    const c = await prisma.contactRequest.findUnique({
      where: { id: ${JSON.stringify(recordId)} },
    });
    if (c) {
      console.log("DB RECORD FOUND:");
      console.log(JSON.stringify({
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        email: c.email,
        message: (c.message || "").slice(0, 80),
        status: c.status,
        createdAt: c.createdAt,
        deletedAt: c.deletedAt,
        deletedById: c.deletedById,
      }, null, 2));
    } else {
      console.log("DB RECORD NOT FOUND");
    }
  } catch (e) {
    console.error("Prisma error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
`;

await writeFile(tmpScript, scriptBody);

try {
  const { stdout, stderr } = await execAsync(`cd "d:/TrungHuy/ZhoungRuan/zhong-ruan-lms/backend" && node ${JSON.stringify(tmpScript)}`);
  console.log("\nDB QUERY OUTPUT:");
  console.log(stdout);
  if (stderr) console.error("STDERR:", stderr);
} finally {
  await unlink(tmpScript).catch(() => {});
}
