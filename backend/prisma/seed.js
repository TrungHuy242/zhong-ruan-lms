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

  await seedPricingPlans();
}

/**
 * Seed cho PricingPlan — 4 gói học phí mẫu.
 *
 * ⚠️  GIÁ TẠM DỰA TRÊN THÔNG TIN CÔNG KHAI 90k/buổi —
 *    CẦN XÁC NHẬN LẠI GIÁ CHÍNH XÁC TỪNG GÓI
 *    QUA ADMIN UI TRƯỚC KHI PUBLIC THẬT.
 */
async function seedPricingPlans() {
  const plans = [
    {
      name: "HSK Sơ cấp (HSK 1-2) — Lớp nhóm",
      classType: "GROUP",
      price: 90000,
      priceUnit: "buổi",
      originalPrice: null,
      description: "Khóa học HSK cấp độ 1-2 dành cho người mới bắt đầu, tập trung ngữ pháp và từ vựng cơ bản.",
      features: ["Tặng giáo trình độc quyền", "Học thử miễn phí 2 buổi", "Sĩ số tối đa 6 học viên"],
      courseSlug: "hsk-1-2",
      isFeatured: false,
      isPublished: true,
      displayOrder: 1,
    },
    {
      name: "HSK Trung cấp (HSK 3-4) — Lớp nhóm",
      classType: "GROUP",
      price: 90000,
      priceUnit: "buổi",
      originalPrice: null,
      description: "Nâng cao năng lực HSK 3-4, mở rộng từ vựng và kỹ năng giao tiếp thực tế.",
      features: ["Tặng giáo trình độc quyền", "Học thử miễn phí 2 buổi", "Sĩ số tối đa 6 học viên"],
      courseSlug: "hsk-3-4",
      isFeatured: true,
      isPublished: true,
      displayOrder: 2,
    },
    {
      name: "HSK Cao cấp (HSK 5-6) — Lớp nhóm",
      classType: "GROUP",
      price: 90000,
      priceUnit: "buổi",
      originalPrice: null,
      description: "Chuẩn bị thi HSK 5-6 với lộ trình học tập chuyên sâu, luyện đề chuyên biệt.",
      features: ["Tặng giáo trình độc quyền", "Học thử miễn phí 2 buổi", "Sĩ số tối đa 6 học viên"],
      courseSlug: "hsk-5-6",
      isFeatured: false,
      isPublished: true,
      displayOrder: 3,
    },
    {
      name: "Học 1 kèm 1 — Mọi cấp độ",
      classType: "PRIVATE",
      price: 90000,
      priceUnit: "buổi",
      originalPrice: null,
      description: "Giáo viên riêng theo sát từng học viên, lịch học hoàn toàn linh hoạt theo nhu cầu cá nhân.",
      features: [
        "Giáo viên riêng theo sát",
        "Lịch học linh hoạt",
        "Đổi lịch trước 3 giờ không mất phí",
      ],
      courseSlug: null,
      isFeatured: false,
      isPublished: true,
      displayOrder: 4,
    },
  ];

  for (const planData of plans) {
    // Upsert theo name+classType (đủ unique cho demo).
    const existing = await prisma.pricingPlan.findFirst({
      where: { name: planData.name, classType: planData.classType, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      await prisma.pricingPlan.update({
        where: { id: existing.id },
        data: planData,
      });
    } else {
      await prisma.pricingPlan.create({ data: planData });
    }
  }
  console.log(`Seeded ${plans.length} pricing plans`);
}