/**
 * ContactInfo — Khối thông tin liên hệ tĩnh nằm bên phải form trên trang /lien-he.
 *
 * Dùng data test hiện tại — đánh dấu TODO để thay bằng thông tin trung tâm thật
 * trước khi công ty duyệt bản chính thức. Icon dùng lucide-react.
 */
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import styles from "./ContactInfo.module.css";

interface ContactItem {
  Icon: typeof MapPin;
  label: string;
  // Hai kiểu hiển thị:
  // - "text"  : đoạn văn (address, địa chỉ dài).
  // - "link"  : link có thể click → tel:/mailto:/external href.
  variant: "text" | "link";
  value: string;
  href?: string;
  external?: boolean;
}

const ITEMS: ContactItem[] = [
  {
    Icon: MapPin,
    label: "Địa chỉ",
    variant: "text",
    value: "110 Lê Sỹ, Hòa Xuân, Thành phố Đà Nẵng",
  },
  {
    Icon: Phone,
    label: "Số điện thoại",
    variant: "link",
    value: "0795 508 242",
    href: "tel:0795508242",
  },
  {
    Icon: Mail,
    label: "Email",
    variant: "link",
    value: "huytruong061004@gmail.com",
    href: "mailto:huytruong061004@gmail.com",
  },
  {
    Icon: MessageCircle,
    label: "Zalo",
    variant: "link",
    value: "0795 508 242",
    href: "https://zalo.me/0795508242",
    external: true,
  },
];

export function ContactInfo() {
  return (
    <aside className={styles.panel} aria-label="Thông tin liên hệ trung tâm">
      <h2 className={styles.title}>Thông tin trung tâm</h2>
      <p className={styles.lead}>
        Liên hệ trực tiếp qua hotline, email hoặc Zalo — chúng tôi phản hồi trong
        vòng 24 giờ làm việc.
      </p>

      <ul className={styles.list}>
        {ITEMS.map(({ Icon, label, variant, value, href, external }) => (
          <li key={label} className={styles.item}>
            <span className={styles.iconWrap} aria-hidden="true">
              <Icon size={20} />
            </span>
            <div className={styles.text}>
              <span className={styles.label}>{label}</span>
              {variant === "link" && href ? (
                <a
                  className={styles.valueLink}
                  href={href}
                  {...(external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {value}
                </a>
              ) : (
                <span className={styles.value}>{value}</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* TODO: Thay bằng thông tin liên hệ thật của trung tâm trước khi
          công ty duyệt bản chính thức — đây hiện là data test. */}
      <p className={styles.todoNote}>
        TODO: Cập nhật địa chỉ / hotline / email thật của trung tâm trước khi go-live.
      </p>
    </aside>
  );
}
