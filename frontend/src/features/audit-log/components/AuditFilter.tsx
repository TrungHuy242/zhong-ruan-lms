import { ChangeEvent } from "react";
import { Input } from "../../../shared/components/ui";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
  AUDIT_MODULES,
  AUDIT_MODULE_LABELS,
} from "../constants/audit.constants";
import type {
  AuditAction,
  AuditLog,
  AuditModule,
} from "../services/auditLogApi";
import { Search, X as XIcon } from "lucide-react";
import styles from "./AuditFilter.module.css";

export interface AuditFilterValues {
  search: string;
  action: "" | AuditAction;
  userId: "" | number;
  module: "" | AuditModule;
  from: string;
  to: string;
}

export const EMPTY_AUDIT_FILTERS: AuditFilterValues = {
  search: "",
  action: "",
  userId: "",
  module: "",
  from: "",
  to: "",
};

export interface UserOption {
  id: number | string;
  fullName: string;
  email: string;
}

export interface AuditFilterProps {
  values: AuditFilterValues;
  onChange: (next: AuditFilterValues) => void;
  /** Dropdown người dùng — đã sort theo tên, loại đã xoá mềm. */
  users: UserOption[];
  usersLoading?: boolean;
  /**
   * Trigger mỗi khi user gõ vào ô search (debounce ở page cha).
   * Component này gọi onChange ngay để page cha quản lý debounce + applied.
   */
  onSearchChange?: (raw: string) => void;
  onClearSearch?: () => void;
}

/**
 * AuditFilter — UI lọc audit log.
 *
 * Component này **dumb** (controlled): chỉ render UI và emit event qua `onChange`
 * mỗi khi user đổi filter. Đồng bộ URL + debounce search đặt ở page cha.
 *
 * Lý do tách riêng:
 *   - Tránh page chính quá tải (file đã lớn).
 *   - Có thể tái sử dụng nếu sau này muốn hiển thị filter ở sidebar hoặc modal.
 */
export function AuditFilter({
  values,
  onChange,
  users,
  usersLoading,
  onSearchChange,
  onClearSearch,
}: AuditFilterProps) {
  function handleSearchInput(e: ChangeEvent<HTMLInputElement>) {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    } else {
      onChange({ ...values, search: e.target.value });
    }
  }
  function handleActionChange(e: ChangeEvent<HTMLSelectElement>) {
    onChange({ ...values, action: e.target.value as "" | AuditAction });
  }
  function handleUserChange(e: ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    onChange({ ...values, userId: val ? Number(val) : "" });
  }
  function handleModuleChange(e: ChangeEvent<HTMLSelectElement>) {
    onChange({ ...values, module: e.target.value as "" | AuditModule });
  }
  function handleFromChange(e: ChangeEvent<HTMLInputElement>) {
    onChange({ ...values, from: e.target.value });
  }
  function handleToChange(e: ChangeEvent<HTMLInputElement>) {
    onChange({ ...values, to: e.target.value });
  }

  return (
    <div className={styles.toolbar}>
      <div className={styles.searchWrap}>
        <Input
          placeholder="Tìm theo tên, email, hành động, mô tả đối tượng..."
          value={values.search}
          onChange={handleSearchInput}
          leftIcon={<Search size={16} />}
          rightIcon={values.search ? <XIcon size={14} /> : undefined}
          onRightIconClick={values.search ? onClearSearch : undefined}
        />
      </div>

      <label className={styles.filterLabel}>
        <span>Hành động</span>
        <select
          className={styles.select}
          value={values.action}
          onChange={handleActionChange}
        >
          <option value="">Tất cả</option>
          {AUDIT_ACTIONS.map((act) => (
            <option key={act} value={act}>
              {AUDIT_ACTION_LABELS[act]}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.filterLabel}>
        <span>Người thực hiện</span>
        <select
          className={styles.select}
          value={values.userId === "" ? "" : String(values.userId)}
          onChange={handleUserChange}
          disabled={usersLoading}
        >
          <option value="">Tất cả</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.fullName} ({u.email})
            </option>
          ))}
        </select>
      </label>

      <label className={styles.filterLabel}>
        <span>Module</span>
        <select
          className={styles.select}
          value={values.module}
          onChange={handleModuleChange}
        >
          <option value="">Tất cả</option>
          {AUDIT_MODULES.map((m) => (
            <option key={m} value={m}>
              {AUDIT_MODULE_LABELS[m]}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.filterLabel}>
        <span>Từ ngày</span>
        <input
          type="date"
          className={styles.dateInput}
          value={values.from}
          onChange={handleFromChange}
          max={values.to || undefined}
        />
      </label>

      <label className={styles.filterLabel}>
        <span>Đến ngày</span>
        <input
          type="date"
          className={styles.dateInput}
          value={values.to}
          onChange={handleToChange}
          min={values.from || undefined}
        />
      </label>
    </div>
  );
}

// Re-export để type khác dùng nếu cần.
export type { AuditLog };