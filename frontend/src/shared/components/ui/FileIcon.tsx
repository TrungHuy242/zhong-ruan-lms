import {
  File as FileDefault,
  FileImage,
  FileText,
  type LucideProps,
} from "lucide-react";
import { getFileKind, type FileKind } from "../../validation/fileValidation";
import styles from "./FileIcon.module.css";

const KIND_TO_ICON: Record<FileKind, React.ComponentType<LucideProps>> = {
  image: FileImage,
  pdf: FileText,
  word: FileText,
  other: FileDefault,
};

/**
 * FileIcon — hiển thị icon đại diện loại file (ảnh/PDF/Word/video/audio/...).
 *
 * Component GENERIC, dùng lại cho module File Manager, Avatar, Tài liệu
 * học tập, Ảnh khóa học…
 *
 * Tự nhận diện loại qua extension (ưu tiên) hoặc mimeType.
 * Có thể truyền `kind` thẳng để tắt auto-detect.
 */
export interface FileIconProps {
  /** Tên file — dùng để detect extension. */
  filename?: string;
  /** MIME type — fallback nếu không có filename. */
  mimeType?: string;
  /** Ép loại, bỏ qua auto-detect. */
  kind?: FileKind;
  /** Kích thước icon (px). Mặc định 20. */
  size?: number;
  /** Class thêm (VD để đổi màu nền). */
  className?: string;
}

export function FileIcon({
  filename,
  mimeType,
  kind,
  size = 20,
  className,
}: FileIconProps) {
  const source = filename || mimeType || "";
  const resolvedKind = kind ?? getFileKind(source);
  const Icon = KIND_TO_ICON[resolvedKind] ?? FileDefault;
  return (
    <span
      className={[styles.wrapper, styles[resolvedKind] ?? "", className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <Icon size={size} />
    </span>
  );
}