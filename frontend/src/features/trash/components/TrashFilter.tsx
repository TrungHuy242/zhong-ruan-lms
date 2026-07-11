/**
 * TrashFilter — toolbar filter cho Trash Manager.
 *
 * Controlled (dumb) component — chỉ render UI và emit event qua `onChange`
 * (filter cố định) + `onSearchChange` (search raw, debounce ở page cha).
 *
 * Filter gồm:
 *   - Module (4 module + "Tất cả")
 *   - Người xoá (dropdown user từ BE — dùng listUsers với includeDeleted=false)
 *   - Từ ngày / Đến ngày (date range)
 *   - Keyword (search có debounce ở page cha)
 *
 * Không tự quản lý debounce search → page cha chịu trách nhiệm searchApplied.
 *
 * Tái sử dụng token trong AuditFilter.module.css cho visual đồng bộ; mỗi
 * feature có CSS module riêng (để Fast Refresh ổn định) nhưng share biến.
 */
import { ChangeEvent } from "react";
import { Input } from "../../../shared/components/ui";
import { TRASH_MODULES, TRASH_MODULE_LABELS } from "../constants/trash.constants";
import type { TrashModule } from "../types/trash.types";
import type { TrashItemV2 } from "../types/trash.types";
import type { UserOption } from "./UserOption";
import { Calendar, Filter, Search, User as UserIcon, X as XIcon } from "lucide-react";
import styles from "./TrashFilter.module.css";

/**
 * TrashFilterValues — shape filter controlled cho TrashFilter.
 * `keyword` là giá trị raw (controlled); `keywordApplied` là giá trị đã qua
 * debounce để gọi API — page cha quản lý, không truyền vào đây.
 *
 * `module` dùng "all" thay vì "" để phân biệt "không lọc" với `null` cho rõ ràng.
 */
export interface TrashFilterValues {
  module: TrashModule | "all";
  deletedById: "" | number;
  from: string;
  to: string;
  keyword: string;
}

export const EMPTY_TRASH_FILTERS: TrashFilterValues = {
  module: "all",
  deletedById: "",
  from: "",
  to: "",
  keyword: "",
};

export interface TrashFilterProps {
  values: TrashFilterValues;
  onChange: (next: TrashFilterValues) => void;
  /**
   * Dropdown người xoá — caller tự load từ listUsers (xem AuditFilter làm mẫu).
   * Filter không cần biết loadUsers() từ đâu → tránh duplicate logic.
   */
  users: UserOption[];
  usersLoading?: boolean;
  /**
   * Trigger mỗi khi user gõ vào ô search (debounce ở page cha).
   * Không truyền → filter vẫn hoạt động nhưng không báo raw → page sẽ set
   * keyword == keywordApplied ngay (không có UX debounce).
   */
  onSearchChange?: (raw: string) => void;
  onClearSearch?: () => void;
}

/**
 * Helpers — lấy ID cho cột "Người xoá" từ 1 TrashItem (dùng trong quick-jump
 * nếu cần). Hiện tại không dùng trong component nhưng export để tái sử dụng.
 */
export function trashItemActorId(it: TrashItemV2): number | null {
  return it.deletedBy?.id ?? it.deletedById ?? null;
}

export function TrashFilter({
  values,
  onChange,
  users,
  usersLoading,
  onSearchChange,
  onClearSearch,
}: TrashFilterProps) {
  function handleSearchInput(e: ChangeEvent<HTMLInputElement>) {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    } else {
      onChange({ ...values, keyword: e.target.value });
    }
  }
  function handleModuleChange(e: ChangeEvent<HTMLSelectElement>) {
    onChange({ ...values, module: e.target.value as TrashModule | "all" });
  }
  function handleDeletedByChange(e: ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    onChange({ ...values, deletedById: val ? Number(val) : "" });
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
          placeholder="Tìm theo tên, email, tiêu đề, tên tệp hoặc key cấu hình..."
          value={values.keyword}
          onChange={handleSearchInput}
          leftIcon={<Search size={16} aria-hidden="true" />}
          rightIcon={values.keyword ? <XIcon size={14} aria-hidden="true" /> : undefined}
          onRightIconClick={values.keyword ? onClearSearch : undefined}
        />
      </div>

      <label className={styles.filterLabel}>
        <span className={styles.filterLabelTitle}>
          <Filter size={12} aria-hidden="true" /> Module
        </span>
        <select
          className={styles.select}
          value={values.module}
          onChange={handleModuleChange}
        >
          <option value="all">Tất cả</option>
          {TRASH_MODULES.map((m) => (
            <option key={m} value={m}>
              {TRASH_MODULE_LABELS[m]}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.filterLabel}>
        <span className={styles.filterLabelTitle}>
          <UserIcon size={12} aria-hidden="true" /> Người xoá
        </span>
        <select
          className={styles.select}
          value={values.deletedById === "" ? "" : String(values.deletedById)}
          onChange={handleDeletedByChange}
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
        <span className={styles.filterLabelTitle}>
          <Calendar size={12} aria-hidden="true" /> Từ ngày
        </span>
        <input
          type="date"
          className={styles.dateInput}
          value={values.from}
          onChange={handleFromChange}
          max={values.to || undefined}
        />
      </label>

      <label className={styles.filterLabel}>
        <span className={styles.filterLabelTitle}>
          <Calendar size={12} aria-hidden="true" /> Đến ngày
        </span>
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
