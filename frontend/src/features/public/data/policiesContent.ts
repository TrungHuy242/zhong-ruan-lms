/**
 * policiesContent.ts — nội dung tĩnh cho section Chính sách trên trang Bảng giá.
 *
 * Tách riêng khỏi JSX để sau này sửa nội dung mà không cần đụng component code.
 */

export interface PolicyItem {
  icon: "refresh" | "archive" | "calendar";
  title: string;
  description: string;
}

export const policiesContent: PolicyItem[] = [
  {
    icon: "refresh",
    title: "Hoàn học phí 100%",
    description:
      "Nếu học không hiệu quả theo đúng cam kết đầu vào, hoàn lại toàn bộ học phí đã đóng.",
  },
  {
    icon: "archive",
    title: "Bảo lưu không thời hạn",
    description:
      "Có thể tạm dừng học vì lý do cá nhân và quay lại học tiếp bất cứ lúc nào, không giới hạn thời gian bảo lưu.",
  },
  {
    icon: "calendar",
    title: "Đổi lịch linh hoạt",
    description:
      "Báo trước tối thiểu 3 giờ để đổi lịch học mà không mất phí.",
  },
];
