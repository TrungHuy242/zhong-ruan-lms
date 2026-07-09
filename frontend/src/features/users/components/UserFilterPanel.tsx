/**
 * UserFilterPanel — bộ lọc nâng cao (tách riêng khỏi ô search chính).
 *
 * Khi mở: 4 field riêng biệt (Tên/Email/Role/Status) gửi qua param `name/email/role/status`
 * của BE. Khi đóng: chỉ ô search chính (param `keyword`) được dùng.
 *
 * Theo yêu cầu: Filter Panel THAY THẾ hoàn toàn ô search chính khi đang mở
 * (tránh xung đột logic filter). Prop `disableMainSearch` được parent quản lý.
 */
import { ChangeEvent } from "react";
import { Button } from "../../../shared/components/ui";
import type { UserRole, UserStatus } from "../types/user.types";
import { ChevronDown, X as XIcon } from "lucide-react";
import styles from "./UserFilterPanel.module.css";

export type RoleFilter = "ALL" | UserRole;
export type StatusFilter = "ALL" | UserStatus;

export interface UserAdvancedFilterValues {
  name: string;
  email: string;
  role: RoleFilter;
  status: StatusFilter;
}

export const EMPTY_ADVANCED_FILTERS: UserAdvancedFilterValues = {
  name: "",
  email: "",
  role: "ALL",
  status: "ALL",
};

export interface UserFilterPanelProps {
  open: boolean;
  values: UserAdvancedFilterValues;
  onChange: (next: UserAdvancedFilterValues) => void;
  onClear: () => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Quản trị viên" },
  { value: "TEACHER", label: "Giáo viên" },
  { value: "STUDENT", label: "Học viên" },
];

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
  { value: "SUSPENDED", label: "Bị đình chỉ" },
];

export function UserFilterPanel({
  open,
  values,
  onChange,
  onClear,
}: UserFilterPanelProps) {
  function update<K extends keyof UserAdvancedFilterValues>(
    key: K,
    val: UserAdvancedFilterValues[K]
  ) {
    onChange({ ...values, [key]: val });
  }

  // Field có giá trị → đánh dấu panel "đang lọc"
  const hasActive =
    Boolean(values.name) ||
    Boolean(values.email) ||
    values.role !== "ALL" ||
    values.status !== "ALL";

  return (
    <div
      className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
      aria-hidden={!open}
    >
      {open ? (
        <div className={styles.body}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Tên</span>
              <div className={styles.inputWrap}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Tìm theo họ tên..."
                  value={values.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    update("name", e.target.value)
                  }
                />
                {values.name ? (
                  <button
                    type="button"
                    className={styles.clearInputBtn}
                    aria-label="Xoá tên"
                    onClick={() => update("name", "")}
                  >
                    <XIcon size={14} />
                  </button>
                ) : null}
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <div className={styles.inputWrap}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Tìm theo email..."
                  value={values.email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    update("email", e.target.value)
                  }
                />
                {values.email ? (
                  <button
                    type="button"
                    className={styles.clearInputBtn}
                    aria-label="Xoá email"
                    onClick={() => update("email", "")}
                  >
                    <XIcon size={14} />
                  </button>
                ) : null}
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Vai trò</span>
              <select
                className={styles.select}
                value={values.role}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  update("role", e.target.value as RoleFilter)
                }
              >
                <option value="ALL">Tất cả</option>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Trạng thái</span>
              <select
                className={styles.select}
                value={values.status}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  update("status", e.target.value as StatusFilter)
                }
              >
                <option value="ALL">Tất cả</option>
                {STATUS_OPTIONS.map((opt) => (
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

/* ChevronDown import is referenced to keep icon library parity with Page */
void ChevronDown;