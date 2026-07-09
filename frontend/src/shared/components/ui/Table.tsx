import { ReactNode } from "react";
import styles from "./Table.module.css";

export interface TableColumn<T> {
  /** Khóa duy nhất — dùng làm React key cho header/cell. */
  key: string;
  /** Nhãn header. */
  header: ReactNode;
  /**
   * Render cell. Mặc định truy xuất `row[key as keyof T]` (an toàn với T extends object).
   * Truyền nếu cần format đặc biệt (badge, ngày, action dropdown...).
   */
  render?: (row: T) => ReactNode;
  /** Căn lề cell — mặc định left. */
  align?: "left" | "center" | "right";
  /** Bề rộng tối thiểu, hữu ích cho table cuộn ngang trên mobile. */
  minWidth?: number;
  /** Class bổ sung riêng cho cột (VD sticky, nowrap...). */
  cellClassName?: string;
  /**
   * Cột này có sort được không (chỉ có tác dụng khi `sortable=true` ở Table).
   * Mặc định false — nếu cần sort phải khai báo field key trùng tên với prop dữ liệu.
   */
  sortable?: boolean;
}

export type SortOrder = "asc" | "desc";

export interface SortConfig {
  /** Key cột đang sort — phải trùng với TableColumn.key của cột đó. */
  key: string;
  order: SortOrder;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  /** Mỗi dòng lấy id để làm React key; mặc định thử `row.id`. */
  rowKey?: (row: T) => string | number;
  loading?: boolean;
  /**
   * Số dòng skeleton render khi loading. Mặc định 5.
   * Khi loading=true → bảng vẫn render header + N dòng skeleton thay vì spinner.
   */
  skeletonRows?: number;
  /** Render khi data rỗng và không loading. */
  emptyState?: ReactNode;
  /** Class trên <tr> của mỗi row — hữu ích để tô mờ row đã xóa. */
  rowClassName?: (row: T) => string | undefined;
  /** Class trên thẻ <tbody>. */
  tbodyClassName?: string;

  // ===== Mở rộng (backward compatible — mặc định tắt) =====

  /**
   * Bật chế độ chọn nhiều row: thêm cột checkbox đầu tiên + checkbox "select all" ở header.
   * Mặc định false — không ảnh hưởng các trang không dùng (Notification/Audit/File/Trash).
   */
  selectable?: boolean;
  /** Danh sách id đang được chọn (controlled). */
  selectedIds?: Array<string | number>;
  /** Callback khi user toggle chọn 1 row hoặc select-all. */
  onSelectedChange?: (selectedIds: Array<string | number>) => void;
  /** Lấy id từ row cho checkbox — mặc định dùng `rowKey` hoặc `row.id`. */
  selectableKey?: (row: T) => string | number;

  /**
   * Bật sort theo cột. Click header của cột có `sortable=true` để toggle asc/desc.
   * Khi bật, bắt buộc truyền `sortConfig` + `onSortChange` (controlled).
   */
  sortable?: boolean;
  /** Cấu hình sort hiện tại — controlled. */
  sortConfig?: SortConfig;
  /** Callback khi user click đổi sort (toggle order hoặc đổi cột). */
  onSortChange?: (next: SortConfig) => void;

  /**
   * Bỏ qua các cột có key nằm trong danh sách này (ẩn cột). Dùng với hook
   * `useTableColumns` để cho phép user ẩn/hiện cột qua dropdown.
   */
  hiddenColumnKeys?: string[];
}

function classNames(
  ...values: Array<string | false | undefined | null>
): string {
  return values.filter(Boolean).join(" ");
}

export function Table<T extends { id?: string | number }>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 5,
  emptyState,
  rowClassName,
  tbodyClassName,
  // new props
  selectable = false,
  selectedIds = [],
  onSelectedChange,
  selectableKey,
  sortable = false,
  sortConfig,
  onSortChange,
  hiddenColumnKeys = [],
}: TableProps<T>) {
  const getKey = (row: T, idx: number): string | number => {
    if (rowKey) return rowKey(row);
    return row.id ?? idx;
  };
  const getSelectableId = (row: T, idx: number): string | number => {
    if (selectableKey) return selectableKey(row);
    return getKey(row, idx);
  };

  // Lọc cột theo hiddenColumnKeys (giữ nguyên thứ tự khai báo).
  const visibleColumns = columns.filter((c) => !hiddenColumnKeys.includes(c.key));

  const showSkeleton = loading;
  const showEmpty = !loading && data.length === 0;

  // ===== Select all logic =====
  const dataIds = data.map((row, idx) => getSelectableId(row, idx));
  const selectedSet = new Set(selectedIds);
  const allSelected = dataIds.length > 0 && dataIds.every((id) => selectedSet.has(id));
  const someSelected = dataIds.some((id) => selectedSet.has(id)) && !allSelected;

  function toggleAll() {
    if (!onSelectedChange) return;
    if (allSelected) {
      // Bỏ chọn toàn bộ các id đang hiển thị
      onSelectedChange(selectedIds.filter((id) => !dataIds.includes(id)));
    } else {
      // Chọn tất cả id đang hiển thị (giữ id ở trang khác nếu đã chọn trước đó)
      const merged = Array.from(new Set([...selectedIds, ...dataIds]));
      onSelectedChange(merged);
    }
  }

  function toggleRow(id: string | number) {
    if (!onSelectedChange) return;
    if (selectedSet.has(id)) {
      onSelectedChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectedChange([...selectedIds, id]);
    }
  }

  // ===== Sort handler =====
  function handleSortClick(col: TableColumn<T>) {
    if (!sortable || !col.sortable || !onSortChange || !sortConfig) return;
    if (sortConfig.key === col.key) {
      // Toggle asc <-> desc
      onSortChange({
        key: col.key,
        order: sortConfig.order === "asc" ? "desc" : "asc",
      });
    } else {
      // Chuyển sang cột mới, default asc
      onSortChange({ key: col.key, order: "asc" });
    }
  }

  // Tổng số cột hiển thị (cho colSpan của empty/skeleton row)
  const totalColCount = visibleColumns.length + (selectable ? 1 : 0);

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {selectable ? (
              <th
                className={classNames(styles.th, styles.checkboxCell)}
                style={{ width: 40 }}
              >
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả user đang hiển thị"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  disabled={loading || data.length === 0}
                />
              </th>
            ) : null}
            {visibleColumns.map((col) => {
              const isSortableCol = sortable && col.sortable;
              const isActiveSort = isSortableCol && sortConfig?.key === col.key;
              return (
                <th
                  key={col.key}
                  className={classNames(
                    styles.th,
                    col.align && styles[`align_${col.align}`],
                    isSortableCol && styles.thSortable,
                    isActiveSort && styles.thSorted,
                    col.cellClassName
                  )}
                  style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                  onClick={isSortableCol ? () => handleSortClick(col) : undefined}
                  role={isSortableCol ? "button" : undefined}
                  aria-sort={
                    isActiveSort
                      ? sortConfig?.order === "asc"
                        ? "ascending"
                        : "descending"
                      : isSortableCol
                      ? "none"
                      : undefined
                  }
                  tabIndex={isSortableCol ? 0 : undefined}
                  onKeyDown={
                    isSortableCol
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSortClick(col);
                          }
                        }
                      : undefined
                  }
                >
                  <span className={styles.thInner}>
                    <span>{col.header}</span>
                    {isSortableCol ? (
                      <span className={styles.sortIcon} aria-hidden="true">
                        {isActiveSort ? (
                          sortConfig?.order === "asc" ? (
                            <ChevronUpIcon />
                          ) : (
                            <ChevronDownIcon />
                          )
                        ) : (
                          <ChevronBothIcon />
                        )}
                      </span>
                    ) : null}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className={tbodyClassName}>
          {showSkeleton
            ? Array.from({ length: skeletonRows }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className={styles.skeletonRow}>
                  {selectable ? (
                    <td className={classNames(styles.td, styles.checkboxCell)}>
                      <span className={styles.skeletonLine} />
                    </td>
                  ) : null}
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      className={classNames(
                        styles.td,
                        col.align && styles[`align_${col.align}`],
                        col.cellClassName
                      )}
                    >
                      <span className={styles.skeletonLine} />
                    </td>
                  ))}
                </tr>
              ))
            : showEmpty
            ? (
              <tr>
                <td
                  className={styles.emptyCell}
                  colSpan={totalColCount}
                >
                  {emptyState ?? "Không có dữ liệu"}
                </td>
              </tr>
            )
            : data.map((row, idx) => {
                const id = getSelectableId(row, idx);
                const isSelected = selectable && selectedSet.has(id);
                return (
                  <tr
                    key={getKey(row, idx)}
                    className={classNames(
                      styles.row,
                      isSelected && styles.rowSelected,
                      rowClassName ? rowClassName(row) : undefined
                    )}
                  >
                    {selectable ? (
                      <td className={classNames(styles.td, styles.checkboxCell)}>
                        <input
                          type="checkbox"
                          aria-label={`Chọn user ${(row as Record<string, unknown>).fullName ?? id}`}
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                        />
                      </td>
                    ) : null}
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={classNames(
                          styles.td,
                          col.align && styles[`align_${col.align}`],
                          col.cellClassName
                        )}
                      >
                        {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as ReactNode}
                      </td>
                    ))}
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}

/* ===== Inline icons cho sort header (gọn, không phụ thuộc thư viện) ===== */
function ChevronUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronBothIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ opacity: 0.4 }}>
      <path d="M8 9l4-4 4 4M8 15l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}