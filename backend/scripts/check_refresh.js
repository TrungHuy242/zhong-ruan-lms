require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });
p.user.findUnique({
  where: { email: "student@zhongruan.com" },
  select: { refreshTokenHash: true, refreshTokenExpiresAt: true, resetToken: true, resetTokenExpiresAt: true },
}).then(u => {
  console.log(JSON.stringify(u, null, 2));
  return p.$disconnect();
});