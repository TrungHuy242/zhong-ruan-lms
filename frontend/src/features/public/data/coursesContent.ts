/**
 * coursesContent.ts — nguồn dữ liệu DUY NHẤT cho các khóa học.
 *
 * HomePage và CoursesListPage + CourseDetailPage cùng import từ đây,
 * tránh 2 nơi có data khác nhau.
 *
 * Mỗi khóa gồm:
 *   - slug, name, level (rút gọn cho HomePage)
 *   - shortDescription (rút gọn), fullDescription (chi tiết cho trang detail)
 *   - price, lessons, durationLabel, targetAudience
 *   - roadmap: timeline các giai đoạn học
 *   - outcomes: danh sách đầu ra sau khóa
 *   - faq: câu hỏi riêng của khóa (tuỳ chọn)
 *   - seo: title + description riêng cho từng slug (SEO theo từ khóa)
 */

export interface RoadmapItem {
  /** Tên giai đoạn (VD: "Giai đoạn 1 — Nền tảng Pinyin") */
  stage: string;
  /** Số buổi học trong giai đoạn */
  sessions: string;
  /** Mô tả ngắn nội dung giai đoạn */
  description: string;
}

export interface CourseFaq {
  id: number;
  question: string;
  answer: string;
}

export interface Course {
  slug: string;
  name: string;
  level: string;
  shortDescription: string;
  fullDescription: string;
  price: string;
  priceNote?: string;
  lessons: number;
  durationLabel: string;
  targetAudience: string;
  outcomes: string[];
  roadmap: RoadmapItem[];
  faq?: CourseFaq[];
  seo: {
    title: string;
    description: string;
  };
}

export const coursesContent: Course[] = [
  {
    slug: "hsk-1-2",
    name: "HSK Sơ cấp (HSK 1-2)",
    level: "Sơ cấp",
    shortDescription:
      "Dành cho người mới bắt đầu hoặc đã mất gốc. Nền tảng vững chắc từ bảng chữ cái, phiên âm Pinyin đến giao tiếp cơ bản.",
    fullDescription:
      "Khóa HSK 1-2 được thiết kế dành cho người hoàn toàn mới bắt đầu tiếng Trung hoặc đã học lâu nhưng mất gốc. Chương trình đi từ bảng chữ cái Hán tự, phiên âm Pinyin, ngữ pháp cơ bản, đến giao tiếp hằng ngày. Mỗi buổi học 90 phút qua video call với giảng viên Thạc sĩ, kèm bài tập và bài kiểm tra đánh giá năng lực sau mỗi giai đoạn. Sau khóa, học viên có nền tảng vững chắc để tiếp tục HSK 3-4.",
    price: "Từ 90.000đ/buổi",
    priceNote: "Học phí trọn khóa 48 buổi: 4.000.000đ (giảm 8% so với học lẻ).",
    lessons: 48,
    durationLabel: "Khoảng 6 tháng",
    targetAudience:
      "Người chưa từng học tiếng Trung hoặc đã học nhưng mất gốc, muốn xây lại nền tảng từ đầu.",
    outcomes: [
      "Đọc thành thạo 300 từ vựng HSK 1-2 và 150 chữ Hán phổ biến nhất.",
      "Giao tiếp được các tình huống cơ bản: chào hỏi, giới thiệu bản thân, mua sắm, hỏi đường.",
      "Viết được câu đơn giản bằng chữ Hán và phiên âm Pinyin chuẩn.",
      "Nghe hiểu các đoạn hội thoại ngắn 1-2 phút với tốc độ chậm.",
      "Sẵn sàng thi đậu HSK 2 với điểm số 180/200 trở lên.",
    ],
    roadmap: [
      {
        stage: "Giai đoạn 1 — Nền tảng Pinyin",
        sessions: "Buổi 1-8",
        description:
          "Bảng chữ cái Hán tự, 4 thanh điệu, cách phát âm Pinyin chuẩn, luyện tập thanh điệu với giảng viên sửa trực tiếp.",
      },
      {
        stage: "Giai đoạn 2 — Từ vựng & ngữ pháp HSK 1",
        sessions: "Buổi 9-24",
        description:
          "150 từ vựng HSK 1, ngữ pháp cơ bản (是, 有, 的, 吗...), giao tiếp chào hỏi và giới thiệu bản thân.",
      },
      {
        stage: "Giai đoạn 3 — Mở rộng HSK 2",
        sessions: "Buổi 25-40",
        description:
          "Thêm 150 từ vựng HSK 2, ngữ pháp nâng cao hơn, tình huống giao tiếp thực tế: mua sắm, nhà hàng, hỏi đường.",
      },
      {
        stage: "Giai đoạn 4 — Luyện thi & đánh giá",
        sessions: "Buổi 41-48",
        description:
          "Luyện đề thi HSK 2 chính thức, mô phỏng phỏng vấn, kiểm tra cuối khóa và đánh giá năng lực.",
      },
    ],
    faq: [
      {
        id: 1,
        question: "Tôi chưa biết gì về tiếng Trung có theo được không?",
        answer:
          "Hoàn toàn được. Khóa này thiết kế cho người từ con số 0, không yêu cầu kiến thức nền. Giảng viên sẽ bắt đầu từ bảng chữ cái.",
      },
      {
        id: 2,
        question: "Học xong có đủ trình độ đi du học Trung Quốc không?",
        answer:
          "Để đi du học chính khóa, bạn cần tối thiểu HSK 4. Sau khóa HSK 1-2, bạn có nền tảng để tiếp tục HSK 3-4 ngay tại Zhong Ruan.",
      },
      {
        id: 3,
        question: "Có lịch học cố định hay linh hoạt?",
        answer:
          "Linh hoạt. Bạn chọn ca học (sáng/chiều/tối) theo lịch cá nhân, đổi lịch trước 3 giờ không mất phí.",
      },
    ],
    seo: {
      title:
        "Khóa học HSK 1-2 — Tiếng Trung Sơ Cấp Cho Người Mất Gốc | Zhong Ruan",
      description:
        "Lộ trình HSK 1-2 dành cho người mới bắt đầu, mất gốc tiếng Trung. Học phí từ 90.000đ/buổi, giáo viên Thạc sĩ/Tiến sĩ, học thử miễn phí.",
    },
  },
  {
    slug: "hsk-3-4",
    name: "HSK Trung cấp (HSK 3-4)",
    level: "Trung cấp",
    shortDescription:
      "Củng cố giao tiếp, mở rộng từ vựng, chuẩn bị thi chứng chỉ HSK. Phù hợp với người đã có nền tảng HSK 1-2.",
    fullDescription:
      "Khóa HSK 3-4 dành cho học viên đã hoàn thành nền tảng sơ cấp và muốn nâng cao năng lực giao tiếp, đọc hiểu văn bản dài, viết đoạn văn ngắn. Chương trình tập trung vào 600 từ vựng HSK 3-4, ngữ pháp nâng cao (câu phức, thành ngữ thông dụng), và luyện thi theo format HSK chính thức. Phù hợp với người mục tiêu du học, làm việc tại doanh nghiệp Trung Quốc hoặc đạt chứng chỉ quốc tế.",
    price: "Từ 110.000đ/buổi",
    priceNote: "Học phí trọn khóa 64 buổi: 6.400.000đ (giảm 10% so với học lẻ).",
    lessons: 64,
    durationLabel: "Khoảng 8 tháng",
    targetAudience:
      "Học viên đã hoàn thành HSK 1-2 hoặc có trình độ tương đương, muốn nâng cao để thi chứng chỉ quốc tế hoặc phục vụ công việc.",
    outcomes: [
      "Sử dụng thành thạo 600 từ vựng HSK 3-4 và đọc hiểu 300 chữ Hán bổ sung.",
      "Giao tiếp trôi chảy về các chủ đề: công việc, du lịch, sức khỏe, văn hóa.",
      "Viết đoạn văn 200-300 chữ Hán, email công việc cơ bản.",
      "Đọc hiểu bài báo ngắn, tin nhắn, thông báo chính thức.",
      "Sẵn sàng thi đậu HSK 4 với điểm số 200/300 trở lên — đủ điều kiện du học nhiều chương trình tiếng Trung.",
    ],
    roadmap: [
      {
        stage: "Giai đoạn 1 — Từ vựng HSK 3",
        sessions: "Buổi 1-16",
        description:
          "300 từ vựng HSK 3, ngữ pháp câu phức cơ bản, luyện đọc hiểu đoạn văn ngắn.",
      },
      {
        stage: "Giai đoạn 2 — Từ vựng HSK 4",
        sessions: "Buổi 17-32",
        description:
          "300 từ vựng HSK 4, ngữ pháp nâng cao (thành ngữ, cấu trúc so sánh), viết đoạn văn ngắn.",
      },
      {
        stage: "Giai đoạn 3 — Giao tiếp nâng cao",
        sessions: "Buổi 33-48",
        description:
          "Thảo luận chủ đề thực tế (công việc, du lịch, văn hóa), thuyết trình ngắn bằng tiếng Trung.",
      },
      {
        stage: "Giai đoạn 4 — Luyện thi HSK 4",
        sessions: "Buổi 49-64",
        description:
          "Luyện đề thi HSK 4 theo format chính thức, mô phỏng thi thử, đánh giá năng lực trước kỳ thi.",
      },
    ],
    faq: [
      {
        id: 1,
        question: "Trình độ tôi khoảng HSK 2 có học được HSK 3-4 không?",
        answer:
          "Có. Giảng viên sẽ đánh giá năng lực đầu vào và bổ sung kiến thức nền nếu cần trong 2-3 buổi đầu.",
      },
      {
        id: 2,
        question: "Sau khóa này có đủ điều kiện du học Trung Quốc không?",
        answer:
          "HSK 4 là yêu cầu phổ biến cho chương trình dự bị đại học. Nhiều trường còn yêu cầu HSK 5 — bạn có thể tiếp tục HSK 5-6.",
      },
      {
        id: 3,
        question: "Có hỗ trợ luyện thi chứng chỉ không?",
        answer:
          "Có. 16 buổi cuối chuyên luyện thi, có đề mô phỏng và chấm theo tiêu chí HSK chính thức.",
      },
    ],
    seo: {
      title:
        "Khóa học HSK 3-4 — Tiếng Trung Trung Cấp, Chuẩn Bị Thi Chứng Chỉ | Zhong Ruan",
      description:
        "Lộ trình HSK 3-4 củng cố giao tiếp, luyện thi chứng chỉ quốc tế. Học phí từ 110.000đ/buổi, giảng viên Thạc sĩ, học thử miễn phí.",
    },
  },
  {
    slug: "hsk-5-6",
    name: "HSK Cao cấp (HSK 5-6)",
    level: "Cao cấp",
    shortDescription:
      "Luyện thi chuyên sâu, mục tiêu du học, công việc hoặc dịch thuật chuyên nghiệp. Giảng viên Tiến sĩ trực tiếp hướng dẫn.",
    fullDescription:
      "Khóa HSK 5-6 là cấp độ cao nhất, dành cho học viên đã hoàn thành HSK 4 hoặc có trình độ tương đương, muốn đạt trình độ ngôn ngữ thành thạo phục vụ du học chuyên ngành, công việc biên phiên dịch, hoặc nghiên cứu học thuật. Chương trình tập trung vào 1.500 từ vựng HSK 5-6, văn viết học thuật, đọc hiểu văn bản dài, nghe hiểu tốc độ nhanh. Giảng viên Tiến sĩ Ngôn ngữ học trực tiếp hướng dẫn.",
    price: "Từ 130.000đ/buổi",
    priceNote: "Học phí trọn khóa 80 buổi: 9.600.000đ (giảm 12% so với học lẻ).",
    lessons: 80,
    durationLabel: "Khoảng 10 tháng",
    targetAudience:
      "Học viên đã đạt HSK 4, muốn nâng cao để phục vụ mục tiêu du học chuyên ngành, công việc chuyên môn hoặc nghiên cứu học thuật.",
    outcomes: [
      "Sử dụng thành thạo 2.500 từ vựng HSK 1-6 và 1.200 chữ Hán phổ biến.",
      "Đọc hiểu báo chí, văn bản học thuật, văn học cổ điển đơn giản.",
      "Viết bài luận 500-800 chữ Hán, email công việc phức tạp, báo cáo.",
      "Nghe hiểu tin tức, bài giảng, hội thoại tốc độ tự nhiên.",
      "Đạt HSK 5 (≥180/300) hoặc HSK 6 (≥180/300) — mở ra cơ hội học bổng, làm việc tại các tập đoàn lớn.",
    ],
    roadmap: [
      {
        stage: "Giai đoạn 1 — Nền tảng HSK 5",
        sessions: "Buổi 1-20",
        description:
          "900 từ vựng HSK 5, ngữ pháp văn viết, đọc hiểu văn bản dài 800-1500 chữ.",
      },
      {
        stage: "Giai đoạn 2 — Nâng cao HSK 6",
        sessions: "Buổi 21-40",
        description:
          "600 từ vựng HSK 6, thành ngữ Hán ngữ, văn phong học thuật, viết bài luận.",
      },
      {
        stage: "Giai đoạn 3 — Nghe & nói chuyên sâu",
        sessions: "Buổi 41-60",
        description:
          "Nghe tin tức, podcast, thuyết trình học thuật. Thảo luận chuyên đề bằng tiếng Trung.",
      },
      {
        stage: "Giai đoạn 4 — Luyện thi HSK 5/6",
        sessions: "Buổi 61-80",
        description:
          "Luyện đề theo format chính thức, mô phỏng thi 3 lần, đánh giá và tư vấn lộ trình cá nhân.",
      },
    ],
    faq: [
      {
        id: 1,
        question: "Giảng viên dạy HSK 5-6 có trình độ thế nào?",
        answer:
          "Giảng viên là Tiến sĩ Ngôn ngữ học hoặc Thạc sĩ với chứng chỉ HSK 6 và kinh nghiệm giảng dạy trên 8 năm.",
      },
      {
        id: 2,
        question: "Có thể chọn chỉ thi HSK 5 (không cần HSK 6) không?",
        answer:
          "Có. Sau khoảng 50 buổi, học viên đã đủ năng lực thi HSK 5. Bạn có thể dừng lại hoặc tiếp tục đến HSK 6.",
      },
      {
        id: 3,
        question: "Học xong có thể làm biên phiên dịch được không?",
        answer:
          "HSK 6 là nền tảng cần thiết nhưng cần thêm thực hành chuyên ngành. Zhong Ruan có khóa luyện dịch chuyên sâu sau HSK 6 — vui lòng liên hệ để được tư vấn.",
      },
    ],
    seo: {
      title:
        "Khóa học HSK 5-6 — Tiếng Trung Cao Cấp Cho Du Học & Công Việc | Zhong Ruan",
      description:
        "Lộ trình HSK 5-6 chuyên sâu, giảng viên Tiến sĩ. Mục tiêu du học chuyên ngành, biên phiên dịch. Học phí từ 130.000đ/buổi, học thử miễn phí.",
    },
  },
];

/**
 * Helper: tìm course theo slug.
 */
export function getCourseBySlug(slug: string): Course | undefined {
  return coursesContent.find((c) => c.slug === slug);
}

/**
 * Helper: lấy danh sách slug hợp lệ — dùng cho prerender, sitemap, route guard.
 */
export function getCourseSlugs(): string[] {
  return coursesContent.map((c) => c.slug);
}

/**
 * Helper: trả về danh sách CourseItem rút gọn cho HomePage / CourseCard.
 * Đảm bảo HomePage và CoursesListPage dùng cùng nguồn data.
 */
export interface CourseSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: string;
  level: string;
  lessons: number;
  to: string;
}

export function getCourseSummaries(): CourseSummary[] {
  return coursesContent.map((c) => ({
    id: c.slug,
    slug: c.slug,
    name: c.name,
    description: c.shortDescription,
    price: c.price,
    level: c.level,
    lessons: c.lessons,
    to: `/khoa-hoc/${c.slug}`,
  }));
}