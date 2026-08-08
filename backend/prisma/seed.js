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
  await seedEnrollmentSchedules();
  await seedTestimonials();
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

/**
 * Seed cho EnrollmentSchedule — block "Lịch khai giảng" hiển thị trên trang public.
 *
 * Singleton-style: Admin có thể tạo nhiều bản (để dự phòng đổi theo từng đợt/tuần),
 * nhưng Public chỉ lấy đúng 1 bản published có displayOrder thấp nhất.
 * Seed 1 bản mẫu theo nội dung banner cũ của trung tâm.
 *
 * ⚠️  Data thật từ banner cũ của trung tâm — xác nhận lại số hotline còn đúng không
 *     trước khi lên production (đã ghi trong CLAUDE.md mục 4).
 */
async function seedEnrollmentSchedules() {
  const enrollmentSchedule = {
    title: "Lịch khai giảng mỗi tuần",
    coursesEnrolling: [
      "Sơ cấp (0-HSK2)",
      "Trung cấp 1 (HSK2-HSK3)",
      "Trung cấp 2 (HSK3-HSK4)",
      "Cao cấp (HSK4-HSK6)",
      "Lớp trẻ em (YCT)",
      "Lớp chuyên giao tiếp",
      "Lớp kèm 1-1 (lộ trình theo nhu cầu)",
    ],
    morningTimes: "8h30 - 10h00 · 10h15 - 11h45",
    afternoonTimes: "14h00 - 15h30 · 15h45 - 17h15",
    eveningTimes: "19h00 - 20h30 · 20h45 - 22h15",
    scheduleGroupA: "Thứ 2 - 4 - 6",
    scheduleGroupB: "Thứ 3 - 5 - 7",
    note: "Riêng các lớp kèm 1-1 có thể học linh hoạt theo nhu cầu",
    tagline: "Tuyển sinh liên tục trong tuần",
    ctaText: "Đăng ký ngay",
    ctaLink: "/register",
    // Hotline trung tâm — xác nhận lại trước khi lên production.
    phoneNumbers: ["0979949145", "0788577720", "0564707979"],
    isPublished: true,
    displayOrder: 0,
  };

  // Upsert theo title+isPublished (giữ demo idempotent: mỗi lần re-seed không tạo trùng).
  const existing = await prisma.enrollmentSchedule.findFirst({
    where: { title: enrollmentSchedule.title, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    await prisma.enrollmentSchedule.update({
      where: { id: existing.id },
      data: enrollmentSchedule,
    });
  } else {
    await prisma.enrollmentSchedule.create({ data: enrollmentSchedule });
  }

  console.log(`Seeded 1 enrollment schedule`);
}

/**
 * Seed cho Testimonial — feedback học viên hiển thị ở Trang chủ.
 *
 * 8 feedback thật (giữ nguyên văn trích dẫn, đầy đủ họ tên theo xác nhận đã có đồng ý).
 * 3 cái đầu tiên isFeatured: true (dùng làm mặc định hiện ở Trang chủ).
 *
 * ⚠️  Data đã có xác nhận đồng ý từ học viên — KHÔNG tự ý thêm/sửa nội dung
 *     hoặc đổi tên. Nếu cần cập nhật → phải hỏi lại.
 */
async function seedTestimonials() {
  const testimonials = [
    {
      studentName: "Minh HSSV",
      courseInfo: null,
      content: "Cô dễ thương, dạy chậm, nhiệt tình và dễ hiểu",
      rating: 5,
      source: "Facebook Messenger",
      isFeatured: true,
      isPublished: true,
      displayOrder: 1,
    },
    {
      studentName: "Mai Nga",
      courseInfo: "TC1",
      content: "Giảng dạy nhiệt tình, luôn giải đáp thắc mắc cho học sinh. Ngoài bài học còn được biết thêm nhiều từ mới khác. Về làm đề HSK thì đã thành thạo, làm khá tốt",
      rating: 5,
      source: "Facebook Messenger",
      isFeatured: true,
      isPublished: true,
      displayOrder: 2,
    },
    {
      studentName: "Nguyễn Trọng Hân",
      courseInfo: null,
      content: "Sau khóa học trình độ Hán ngữ được nâng cao hơn. Từ vựng và ngữ pháp cũng tốt hơn nhiều. Phương pháp dạy của giáo viên khá ổn, trung tâm theo sát lớp và học viên",
      rating: 5,
      source: "Facebook Messenger",
      isFeatured: true,
      isPublished: true,
      displayOrder: 3,
    },
    {
      studentName: "Nguyễn Ngọc Như Phương",
      courseInfo: null,
      content: "Cô dạy rất dễ hiểu và tốc độ phù hợp. Khi hỏi về các từ ngoài bài học cô đều trả lời tận tình và giải thích dễ hiểu",
      rating: 5,
      source: "Facebook Messenger",
      isFeatured: false,
      isPublished: true,
      displayOrder: 4,
    },
    {
      studentName: "Nguyễn Thanh Thảo",
      courseInfo: null,
      content: "Hài lòng về cách dạy của cô, tuy học tiếng Trung đã lâu nhưng phát âm còn nhiều chỗ sai, cô chỉnh lại rất tận tình, giải thích rất chi tiết",
      rating: 5,
      source: "Facebook Messenger",
      isFeatured: false,
      isPublished: true,
      displayOrder: 5,
    },
    {
      studentName: "Nguyễn Hồ Nguyệt Như",
      courseInfo: null,
      content: "Cô dạy rất nhiệt tình và vui vẻ. Cô chỉnh phát âm rất kỹ và dạy thêm vốn từ mở rộng, liên kết với các tình huống thực tiễn để áp dụng trong giao tiếp và đi làm",
      rating: 5,
      source: "Facebook Messenger",
      isFeatured: false,
      isPublished: true,
      displayOrder: 6,
    },
    {
      studentName: "Nguyệt Hằng",
      courseInfo: null,
      content: "Sau khóa học kỹ năng phản xạ nói tiếng Trung nhanh và tốt hơn rồi. Cô dạy xen kẽ cả 2 giáo trình nên vừa được luyện nói vừa luyện được ngữ pháp, nhớ nhanh hơn",
      rating: 5,
      source: "Facebook Messenger",
      isFeatured: false,
      isPublished: true,
      displayOrder: 7,
    },
    {
      studentName: "Nguyễn Ngọc Thu Ngân",
      courseInfo: null,
      content: "Cô giáo nhiệt tình lắm, lúc học hay sau khi học xong đều quan tâm tới học sinh từng xíu. Sau khi học cải thiện được giao tiếp rất nhiều so với ban đầu",
      rating: 5,
      source: "Facebook Messenger",
      isFeatured: false,
      isPublished: true,
      displayOrder: 8,
    },
  ];

  for (const t of testimonials) {
    // Upsert theo studentName (đủ unique cho demo).
    const existing = await prisma.testimonial.findFirst({
      where: { studentName: t.studentName, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      await prisma.testimonial.update({
        where: { id: existing.id },
        data: t,
      });
    } else {
      await prisma.testimonial.create({ data: t });
    }
  }
  console.log(`Seeded ${testimonials.length} testimonials`);
}

main()
  .catch((e) => { console.error("Seed error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());