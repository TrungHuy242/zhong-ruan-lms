require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });
(async () => {
  // set resetToken to a known hash with past expiry for student@zhongruan.com
  const crypto = require("crypto");
  const fakeRaw = crypto.randomBytes(32).toString("hex");
  const fakeHash = crypto.createHash("sha256").update(fakeRaw).digest("hex");
  const past = new Date(Date.now() - 60 * 1000);
  await p.user.update({
    where: { email: "student@zhongruan.com" },
    data: { resetToken: fakeHash, resetTokenExpiresAt: past },
  });
  console.log("FAKE_RAW=" + fakeRaw);
  console.log("FAKE_HASH=" + fakeHash);
  console.log("EXPIRES=" + past.toISOString());
  await p.$disconnect();
})();