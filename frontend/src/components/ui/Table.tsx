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
}: TableProps<T>) {
  const getKey = (row: T, idx: number): string | number => {
    if (rowKey) return rowKey(row);
    return row.id ?? idx;
  };

  const showSkeleton = loading;
  const showEmpty = !loading && data.length === 0;

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={classNames(
                  styles.th,
                  col.align && styles[`align_${col.align}`],
                  col.cellClassName
                )}
                style={col.minWidth ? { minWidth: col.minWidth } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className={tbodyClassName}>
          {showSkeleton
            ? Array.from({ length: skeletonRows }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className={styles.skeletonRow}>
                  {columns.map((col) => (
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
                  colSpan={columns.length}
                >
                  {emptyState ?? "Không có dữ liệu"}
                </td>
              </tr>
            )
            : data.map((row, idx) => (
                <tr
                  key={getKey(row, idx)}
                  className={classNames(
                    styles.row,
                    rowClassName ? rowClassName(row) : undefined
                  )}
                >
                  {columns.map((col) => (
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
              ))}
        </tbody>
      </table>
    </div>
  );
}
