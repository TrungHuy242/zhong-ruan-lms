/**
 * FileFilterPanel — bộ lọc nâng cao cho FileManagerPage.
 *
 * 4 field:
 *   - fileType: image | document | video | audio | all
 *   - uploaderId: chọn user (lấy từ listUsers, drop-down tên)
 *   - dateFrom, dateTo: input type="date"
 *
 * Tương tự UserFilterPanel — controlled, parent quản lý values + onChange.
 */
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../shared/components/ui";
import {
  FILE_API_CATEGORIES,
  FILE_CATEGORY_LABELS,
  type FileApiCategory,
} from "../constants/file.constants";
import type { User } from "../../users/services/userApi";
import { listUsers } from "../../users/services/userApi";
import { ChevronDown, X as XIcon } from "lucide-react";
import styles from "./FileFilterPanel.module.css";

export interface FileAdvancedFilterValues {
  fileType: "all" | FileApiCategory;
  uploaderId: number | null;
  dateFrom: string; // "YYYY-MM-DD"
  dateTo: string;   // "YYYY-MM-DD"
}

export const EMPTY_FILE_FILTERS: FileAdvancedFilterValues = {
  fileType: "all",
  uploaderId: null,
  dateFrom: "",
  dateTo: "",
};

export interface FileFilterPanelProps {
  open: boolean;
  values: FileAdvancedFilterValues;
  onChange: (next: FileAdvancedFilterValues) => void;
  onClear: () => void;
  /** Lấy user cho dropdown "Người upload". */
  isAdmin: boolean;
}

export function FileFilterPanel({
  open,
  values,
  onChange,
  onClear,
  isAdmin,
}: FileFilterPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Chỉ Admin mới có quyền filter theo uploader (user thường bị BE tự filter về chính mình).
  // Tải list user 1 lần khi panel mở.
  useEffect(() => {
    if (!open || !isAdmin) return;
    let cancelled = false;
    async function load() {
      setLoadingUsers(true);
      try {
        const result = await listUsers({ limit: 50 });
        if (cancelled) return;
        const list = Array.isArray(result.users) ? result.users : [];
        const active = list.filter((u) => !u.deletedAt);
        active.sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
        setUsers(active);
      } catch {
        // Bỏ qua — user thấy dropdown trống.
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, isAdmin]);

  function update<K extends keyof FileAdvancedFilterValues>(
    key: K,
    val: FileAdvancedFilterValues[K]
  ) {
    onChange({ ...values, [key]: val });
  }

  const hasActive =
    values.fileType !== "all" ||
    values.uploaderId !== null ||
    Boolean(values.dateFrom) ||
    Boolean(values.dateTo);

  const userOptions = useMemo(
    () =>
      users.map((u) => ({
        value: u.id,
        label: `${u.fullName} (${u.email})`,
      })),
    [users]
  );

  return (
    <div
      className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
      aria-hidden={!open}
    >
      {open ? (
        <div className={styles.body}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span className={styles.label}>Loại file</span>
              <div className={styles.chips}>
                <button
                  type="button"
                  className={`${styles.chip} ${
                    values.fileType === "all" ? styles.chipActive : ""
                  }`}
                  onClick={() => update("fileType", "all")}
                >
                  Tất cả
                </button>
                {FILE_API_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`${styles.chip} ${
                      values.fileType === cat ? styles.chipActive : ""
                    }`}
                    onClick={() => update("fileType", cat)}
                  >
                    {FILE_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </label>

            {isAdmin ? (
              <label className={styles.field}>
                <span className={styles.label}>Người upload</span>
                <div className={styles.selectWrap}>
                  <select
                    className={styles.select}
                    value={values.uploaderId ?? ""}
                    onChange={(e) =>
                      update(
                        "uploaderId",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  >
                    <option value="">
                      {loadingUsers ? "Đang tải..." : "Tất cả"}
                    </option>
                    {userOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className={styles.selectIcon} />
                  {values.uploaderId !== null ? (
                    <button
                      type="button"
                      className={styles.clearInputBtn}
                      aria-label="Xoá người upload"
                      onClick={() => update("uploaderId", null)}
                    >
                      <XIcon size={14} />
                    </button>
                  ) : null}
                </div>
              </label>
            ) : null}

            <label className={styles.field}>
              <span className={styles.label}>Từ ngày</span>
              <input
                type="date"
                className={styles.dateInput}
                value={values.dateFrom}
                onChange={(e) => update("dateFrom", e.target.value)}
                max={values.dateTo || undefined}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Đến ngày</span>
              <input
                type="date"
                className={styles.dateInput}
                value={values.dateTo}
                onChange={(e) => update("dateTo", e.target.value)}
                min={values.dateFrom || undefined}
              />
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