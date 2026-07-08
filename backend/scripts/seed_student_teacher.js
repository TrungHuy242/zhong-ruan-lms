require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });
(async () => {
  const hash = await bcrypt.hash("123456", 10);
  const users = [
    { email: "student@zhongruan.com", fullName: "Student Zhong Ruan", role: "STUDENT", phone: "0900000003" },
    { email: "teacher@zhongruan.com", fullName: "Teacher Zhong Ruan", role: "TEACHER", phone: "0900000002" },
  ];
  for (const u of users) {
    await p.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, status: "ACTIVE" },
      create: { ...u, passwordHash: hash, status: "ACTIVE" },
    });
    console.log("seeded/reset " + u.email);
  }
  await p.$disconnect();
})();
