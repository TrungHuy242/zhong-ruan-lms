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

  console.log("Seeding database...");

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
  await seedBanners();
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

async function seedBanners() {
  const now = new Date();
  const banners = [
    {
      title: "Ưu đãi mùa khai giảng — Giảm 20% học phí",
      subtitle: "Đăng ký sớm trong tháng 7 để nhận ưu đãi giảm 20% cho tất cả các khóa học nhóm.",
      imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1400&q=80",
      ctaText: "Đăng ký ngay",
      ctaLink: "/register",
      badgeText: "Ưu đãi",
      startDate: null,
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      isPublished: true,
      displayOrder: 1,
    },
    {
      title: "Học thử miễn phí 2 buổi đầu tiên",
      subtitle: "Trải nghiệm phương pháp giảng dạy của giảng viên Thạc sĩ — không cam kết, không ràng buộc.",
      imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1400&q=80",
      ctaText: "Đặt lịch học thử",
      ctaLink: "/khoa-hoc",
      badgeText: "Học thử",
      startDate: null,
      endDate: null,
      isPublished: true,
      displayOrder: 2,
    },
    {
      title: "Lớp luyện thi HSK — Khai giảng tháng 8",
      subtitle: "Lộ trình 3 tháng chuyên sâu, giảng viên có chứng chỉ HSK 6, tỷ lệ đỗ 94%.",
      imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1400&q=80",
      ctaText: "Xem lộ trình",
      ctaLink: "/khoa-hoc/hsk-5-6",
      badgeText: "Khai giảng",
      startDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 2, 0),
      isPublished: true,
      displayOrder: 3,
    },
  ];

  for (const bannerData of banners) {
    const existing = await prisma.banner.findFirst({
      where: { title: bannerData.title },
      select: { id: true },
    });
    if (existing) {
      await prisma.banner.update({
        where: { id: existing.id },
        data: bannerData,
      });
    } else {
      await prisma.banner.create({ data: bannerData });
    }
  }
  console.log(`Seeded ${banners.length} banners`);

  console.log("Database seeding complete.");
}

main()
  .catch((e) => { console.error("Seed error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());