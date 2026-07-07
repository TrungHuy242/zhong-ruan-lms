require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const crypto = require("crypto");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });
(async () => {
  // Login mới lấy refresh token mới + set hash + set expiresAt = past
  const login = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@zhongruan.com", password: "newpass123" }),
  });
  const data = await login.json();
  const refreshToken = data.data.refreshToken;
  const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const past = new Date(Date.now() - 60 * 1000);
  await p.user.update({
    where: { email: "student@zhongruan.com" },
    data: { refreshTokenHash: hash, refreshTokenExpiresAt: past },
  });
  console.log("REFRESH=" + refreshToken);
  console.log("EXPIRES=" + past.toISOString());
  await p.$disconnect();
})();