require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });
(async () => {
  for (const email of ["suspended_user@x.com", "inactive_user@x.com"]) {
    const u = await p.user.findUnique({
      where: { email },
      select: { email: true, status: true, resetToken: true, resetTokenExpiresAt: true },
    });
    console.log(JSON.stringify(u));
  }
  await p.$disconnect();
})();