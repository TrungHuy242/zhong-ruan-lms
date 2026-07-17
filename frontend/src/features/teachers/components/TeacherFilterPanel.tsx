/**
 * TeacherFilterPanel — bộ lọc nâng cao cho trang Quản lý giảng viên.
 *
 * Khi mở: 4 field riêng (Họ tên / Chức danh / Nổi bật / Xuất bản) gửi qua
 * param `fullName/title/isFeatured/isPublished` của BE. Khi đóng: chỉ ô
 * search chính (`keyword`) được dùng.
 *
 * Tái sử dụng pattern từ UserFilterPanel để UX đồng nhất giữa các module quản lý.
 */
import { ChangeEvent } from "react";
import { Button } from "../../../shared/components/ui";
import { X as XIcon } from "lucide-react";
import type { TeacherAdvancedFilterValues } from "../types/teacher.types";
import styles from "./TeacherFilterPanel.module.css";

export interface TeacherFilterPanelProps {
  open: boolean;
  values: TeacherAdvancedFilterValues;
  onChange: (next: TeacherAdvancedFilterValues) => void;
  onClear: () => void;
}

const FEATURED_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "true", label: "Có" },
  { value: "false", label: "Không" },
] as const;

const PUBLISHED_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "true", label: "Đã xuất bản" },
  { value: "false", label: "Đã ẩn" },
] as const;

export function TeacherFilterPanel({
  open,
  values,
  onChange,
  onClear,
}: TeacherFilterPanelProps) {
  function update<K extends keyof TeacherAdvancedFilterValues>(
    key: K,
    val: TeacherAdvancedFilterValues[K]
  ) {
    onChange({ ...values, [key]: val });
  }

  const hasActive =
    Boolean(values.fullName) ||
    Boolean(values.title) ||
    values.isFeatured !== "ALL" ||
    values.isPublished !== "ALL";

  return (
    <div
      className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
      aria-hidden={!open}
    >
      {open ? (
        <div className={styles.body}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Họ tên</span>
              <div className={styles.inputWrap}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Tìm theo họ tên..."
                  value={values.fullName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    update("fullName", e.target.value)
                  }
                />
                {values.fullName ? (
                  <button
                    type="button"
                    className={styles.clearInputBtn}
                    aria-label="Xoá họ tên"
                    onClick={() => update("fullName", "")}
                  >
                    <XIcon size={14} />
                  </button>
                ) : null}
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Chức danh</span>
              <div className={styles.inputWrap}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="VD: Thạc sĩ Ngôn ngữ Trung Quốc..."
                  value={values.title}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    update("title", e.target.value)
                  }
                />
                {values.title ? (
                  <button
                    type="button"
                    className={styles.clearInputBtn}
                    aria-label="Xoá chức danh"
                    onClick={() => update("title", "")}
                  >
                    <XIcon size={14} />
                  </button>
                ) : null}
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Nổi bật</span>
              <select
                className={styles.select}
                value={values.isFeatured}
                onChange={(e) =>
                  update("isFeatured", e.target.value as TeacherAdvancedFilterValues["isFeatured"])
                }
              >
                {FEATURED_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Trạng thái xuất bản</span>
              <select
                className={styles.select}
                value={values.isPublished}
                onChange={(e) =>
                  update("isPublished", e.target.value as TeacherAdvancedFilterValues["isPublished"])
                }
              >
                {PUBLISHED_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {hasActive ? (
            <div className={styles.footer}>
              <Button variant="ghost" size="sm" onClick={onClear}>
                Xoá bộ lọc nâng cao
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}