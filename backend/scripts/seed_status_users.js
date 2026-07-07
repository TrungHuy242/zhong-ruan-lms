require("dotenv").config();
const { PrismaClient, UserStatus } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });
(async () => {
  // Tạo 2 user test
  await p.user.upsert({
    where: { email: "inactive_user@x.com" },
    update: { status: UserStatus.INACTIVE },
    create: {
      fullName: "Inactive",
      email: "inactive_user@x.com",
      passwordHash: "x",
      role: "STUDENT",
      status: UserStatus.INACTIVE,
    },
  });
  await p.user.upsert({
    where: { email: "suspended_user@x.com" },
    update: { status: UserStatus.SUSPENDED },
    create: {
      fullName: "Suspended",
      email: "suspended_user@x.com",
      passwordHash: "x",
      role: "STUDENT",
      status: UserStatus.SUSPENDED,
    },
  });
  // Đảm bảo student active
  await p.user.update({
    where: { email: "student@zhongruan.com" },
    data: { status: UserStatus.ACTIVE, resetToken: null, resetTokenExpiresAt: null },
  });
  console.log("seeded");
  await p.$disconnect();
})();