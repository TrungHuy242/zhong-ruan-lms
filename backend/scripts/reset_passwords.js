require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });
(async () => {
  const hash = await bcrypt.hash("123456", 10);
  for (const email of ["admin@zhongruan.com", "teacher@zhongruan.com"]) {
    await p.user.upsert({
      where: { email },
      update: { passwordHash: hash },
      create: {
        email,
        fullName: email.split("@")[0],
        passwordHash: hash,
        role: email.startsWith("admin") ? "ADMIN" : "TEACHER",
      },
    });
    console.log("reset " + email);
  }
  await p.$disconnect();
})();