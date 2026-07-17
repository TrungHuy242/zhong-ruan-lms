/**
 * ImagePlaceholder — khối placeholder cho ảnh chưa có.
 *
 * Dùng cho ảnh giảng viên, lớp học, testimonial khi chưa có ảnh thật.
 * KHÔNG dùng ảnh stock internet (dính bản quyền, không phải ảnh thật).
 *
 * Khi có ảnh thật: chỉ cần thay component này bằng <img> là layout giữ nguyên.
 */
import { ImageIcon } from "lucide-react";
import styles from "./ImagePlaceholder.module.css";

export interface ImagePlaceholderProps {
  /** Label mô tả loại ảnh. VD: "giảng viên", "lớp học", "học viên" */
  label: string;
  /** Tỷ lệ khung ảnh. Mặc định 4/3 — giữ nguyên khi thay ảnh thật vào. */
  aspectRatio?: "4/3" | "1/1" | "16/9" | "3/4";
  /** ClassName tùy chỉnh */
  className?: string;
}

export function ImagePlaceholder({
  label,
  aspectRatio = "4/3",
  className,
}: ImagePlaceholderProps) {
  return (
    <div
      className={`${styles.wrapper} ${styles[aspectRatio.replace("/", "")]} ${className ?? ""}`}
      role="img"
      aria-label={`Hình ảnh ${label} — chờ cập nhật`}
      title={`Hình ảnh ${label} — chờ cập nhật`}
    >
      <div className={styles.inner}>
        <ImageIcon size={32} strokeWidth={1.5} className={styles.icon} />
        <span className={styles.label}>Ảnh {label}</span>
        <span className={styles.subLabel}>— chờ cập nhật</span>
      </div>
    </div>
  );
}
