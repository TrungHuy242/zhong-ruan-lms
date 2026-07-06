require("dotenv").config();
const bcrypt = require("bcrypt");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient, Role } = require("@prisma/client");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: { email: "admin@zhongruan.com" },
    update: {},
    create: {
      fullName: "Admin Zhong Ruan",
      email: "admin@zhongruan.com",
      phone: "0900000001",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "teacher@zhongruan.com" },
    update: {},
    create: {
      fullName: "Giáo viên Demo",
      email: "teacher@zhongruan.com",
      phone: "0900000002",
      passwordHash,
      role: Role.TEACHER,
    },
  });

  await prisma.user.upsert({
    where: { email: "student@zhongruan.com" },
    update: {},
    create: {
      fullName: "Học viên Demo",
      email: "student@zhongruan.com",
      phone: "0900000003",
      passwordHash,
      role: Role.STUDENT,
    },
  });
}

main()
  .then(async () => {
    console.log("Seed completed");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });