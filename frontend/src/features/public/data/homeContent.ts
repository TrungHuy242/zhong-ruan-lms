/**
 * homeContent.ts — toàn bộ text/data cho HomePage.
 *
 * Tách riêng khỏi JSX để sau này sửa nội dung mà không cần đụng component code.
 * Mọi text đều dùng tiếng Việt có dấu.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

export interface UspItem {
  icon: "shield-check" | "archive" | "video" | "gift";
  title: string;
  description: string;
}

export interface CourseItem {
  id: string;
  name: string;
  description: string;
  price: string;
  level: string;
  lessons: number;
  to: string;
}

export interface TeacherItem {
  name: string;
  title: string;
  experience: string;
  isVerified: boolean;
}

export interface TestimonialItem {
  id: number;
  name: string;
  level: string;
  avatarInitials: string;
  rating: number;
  content: string;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

// =============================================================================
// HERO
// =============================================================================

export const heroContent = {
  badge: "Học thử miễn phí",
  headline:
    "Học Tiếng Trung Online Cùng Giảng Viên Thạc Sĩ, Tiến Sĩ — Từ Mất Gốc Đến HSK 6",
  subheadline:
    "Hơn 10.000 học viên tin chọn. Cam kết hoàn học phí 100% nếu không hiệu quả. Học thử miễn phí trước khi đăng ký.",
  ctaPrimary: {
    label: "Đăng ký học thử miễn phí",
    to: "/register",
  },
  ctaSecondary: {
    label: "Xem khóa học",
    to: "/khoa-hoc",
  },
};

// =============================================================================
// STATS COUNTER
// =============================================================================

export const statsContent = [
  { value: 10000, suffix: "+", label: "Học viên đã đào tạo" },
  { value: 100, suffix: "+", label: "Giảng viên Thạc sĩ/Tiến sĩ" },
  { value: 99, suffix: "%", label: "Học viên đạt đầu ra cam kết" },
  { value: 6, suffix: "", label: "Học viên tối đa mỗi lớp" },
];

// =============================================================================
// USP / CAM KẾT
// =============================================================================

export const uspContent: UspItem[] = [
  {
    icon: "shield-check" as const,
    title: "Hoàn học phí 100%",
    description:
      "Nếu học không hiệu quả theo cam kết ban đầu, chúng tôi hoàn lại 100% học phí.",
  },
  {
    icon: "archive" as const,
    title: "Bảo lưu không thời hạn",
    description:
      "Linh hoạt thời gian học theo lịch cá nhân. Bảo lưu không giới hạn, không phí phát sinh.",
  },
  {
    icon: "video" as const,
    title: "100% giáo viên dạy trực tiếp",
    description:
      "Tương tác qua video call thật với giảng viên, không học qua video quay sẵn.",
  },
  {
    icon: "gift" as const,
    title: "Tặng trọn bộ giáo trình + video ôn tập",
    description:
      "Tài liệu độc quyền kèm theo khóa học, cập nhật trọn đời mà không phát sinh chi phí.",
  },
];

// =============================================================================
// KHÓA HỌC NỔI BẬT
// =============================================================================

export const featuredCoursesContent = [
  {
    id: "hsk-1-2",
    name: "HSK Sơ cấp (HSK 1-2)",
    description:
      "Dành cho người mới bắt đầu hoặc đã mất gốc. Nền tảng vững chắc từ bảng chữ cái, phiên âm Pinyin đến giao tiếp cơ bản.",
    price: "Từ 90.000đ/buổi",
    level: "Sơ cấp",
    lessons: 48,
    to: "/khoa-hoc",
  },
  {
    id: "hsk-3-4",
    name: "HSK Trung cấp (HSK 3-4)",
    description:
      "Củng cố giao tiếp, mở rộng từ vựng, chuẩn bị thi chứng chỉ HSK. Phù hợp với người đã có nền tảng HSK 1-2.",
    price: "Từ 110.000đ/buổi",
    level: "Trung cấp",
    lessons: 64,
    to: "/khoa-hoc",
  },
  {
    id: "hsk-5-6",
    name: "HSK Cao cấp (HSK 5-6)",
    description:
      "Luyện thi chuyên sâu, mục tiêu du học, công việc hoặc dịch thuật chuyên nghiệp. Giảng viên Tiến sĩ trực tiếp hướng dẫn.",
    price: "Từ 130.000đ/buổi",
    level: "Cao cấp",
    lessons: 80,
    to: "/khoa-hoc",
  },
];

// =============================================================================
// GIẢNG VIÊN
// =============================================================================

// TODO: xác nhận lại học vị và kinh nghiệm thực tế
export const teachersContent = [
  {
    name: "Cô Thọ",
    title: "Thạc sĩ Ngôn ngữ học",
    experience: "10+ năm giảng dạy tiếng Trung",
    isVerified: true,
  },
  {
    name: "Cô Hương",
    title: "Thạc sĩ Sư phạm quốc tế",
    experience: "8+ năm, chuyên gia HSK 1-4",
    isVerified: true,
  },
  {
    name: "Cô Thảo",
    title: "Thạc sĩ Ngôn ngữ học",
    experience: "6+ năm giảng dạy, IELTS 8.0",
    isVerified: true,
  },
  {
    name: "Thầy Minh",
    title: "Tiến sĩ Ngôn ngữ học",
    experience: "// TODO: xác nhận kinh nghiệm",
    isVerified: false,
  },
];

// =============================================================================
// TESTIMONIAL — PLACEHOLDER
// =============================================================================

// TODO: thay bằng review thật từ Facebook/Google Review
// Mỗi placeholder ghi rõ "chờ cập nhật" để không nhầm với data thật
export const testimonialsContent = [
  {
    id: 1,
    name: "[Tên học viên — chờ cập nhật]",
    level: "HSK 2",
    avatarInitials: "?",
    rating: 5,
    content:
      "[Placeholder — chờ cập nhật review thật từ học viên đã hoàn thành khóa học.]",
  },
  {
    id: 2,
    name: "[Tên học viên — chờ cập nhật]",
    level: "HSK 4",
    avatarInitials: "?",
    rating: 5,
    content:
      "[Placeholder — chờ cập nhật review thật từ học viên đã hoàn thành khóa học.]",
  },
  {
    id: 3,
    name: "[Tên học viên — chờ cập nhật]",
    level: "HSK 3",
    avatarInitials: "?",
    rating: 5,
    content:
      "[Placeholder — chờ cập nhật review thật từ học viên đã hoàn thành khóa học.]",
  },
];

// =============================================================================
// FAQ
// =============================================================================

export const faqContent = [
  {
    id: 1,
    question: "Học thử miễn phí như thế nào?",
    answer:
      "Bạn đăng ký tài khoản, chọn 'Học thử miễn phí', chúng tôi sẽ liên hệ để sắp xếp 1 buổi học thử 45 phút với giảng viên. Không cần thanh toán, không ràng buộc.",
  },
  {
    id: 2,
    question: "Nếu học không hiệu quả có được hoàn học phí không?",
    answer:
      "Có. Chúng tôi cam kết hoàn 100% học phí nếu sau 1 tháng học mà kết quả không đạt như cam kết ban đầu. Điều kiện cụ thể được ghi rõ trong hợp đồng đăng ký.",
  },
  {
    id: 3,
    question: "Lớp học tối đa bao nhiêu học viên?",
    answer:
      "Mỗi lớp tối đa 6 học viên để đảm bảo chất lượng tương tác. Giảng viên có thể theo dõi sát từng em, sửa phát âm và hỗ trợ cá nhân.",
  },
  {
    id: 4,
    question: "Tôi mất gốc hoàn toàn có học được không?",
    answer:
      "Hoàn toàn có. Khóa HSK 1 được thiết kế dành cho người chưa biết gì tiếng Trung, bắt đầu từ bảng chữ cái, phiên âm Pinyin, rồi đến từ vựng và ngữ pháp cơ bản. Có giảng viên hỗ trợ riêng từ đầu.",
  },
  {
    id: 5,
    question: "Có thể đổi lịch học không?",
    answer:
      "Có. Bạn có thể đổi lịch trước 3 giờ so với giờ học mà không mất phí. Nếu thông báo trước dưới 3 giờ, vui lòng liên hệ giảng viên để sắp xếp bù.",
  },
  {
    id: 6,
    question: "Học xong có thi HSK được luôn không?",
    answer:
      "Có. Chương trình được thiết kế sát với format đề thi HSK chính thức. Giảng viên sẽ hướng dẫn đăng ký thi và luyện đề trước kỳ thi. Học viên thường đạt kết quả cao hơn mục tiêu đề ra.",
  },
];

// =============================================================================
// CTA BANNER
// =============================================================================

export const ctaBannerContent = {
  headline: "Bắt Đầu Hành Trình Chinh Phục Tiếng Trung Ngay Hôm Nay",
  ctaLabel: "Đăng ký học thử miễn phí",
  ctaTo: "/register",
};
