/**
 * SearchResultGroup — Section kết quả cho 1 module (Users / Notifications / Files / Settings).
 *
 * Mục đích: gom logic chung cho mỗi nhóm kết quả tìm kiếm — header (badge + count),
 * body (Table có sẵn + skeleton + empty), footer (tổng + pagination).
 *
 * Component này chỉ render UI; columns + data + pagination đều từ parent truyền vào
 * (mỗi module có cấu trúc cột khác nhau → không thể hard-code chung trong component).
 *
 * Lưu ý: SearchResultGroup không xử lý highlight trực tiếp — parent đã wrap sẵn
 * trong `columns` qua helper `highlight(text, keyword)` (xem GlobalSearchPage).
 */
import { ReactNode } from "react";
import { Card, Pagination, Table } from "../../../shared/components/ui";
import type { TableColumn } from "../../../shared/components/ui";
import { SearchX } from "lucide-react";
import styles from "./SearchResultGroup.module.css";

export interface SearchResultGroupProps<T extends { id: number }> {
  /** Icon badge tone (CSS class). */
  tone: string;
  /** Tiêu đề nhóm (VD: "Người dùng"). */
  title: string;
  /** Icon nhỏ đặt trước title (JSX). */
  icon: ReactNode;
  /** Block paginated từ BE (items, total, page, limit). */
  block: { items: T[]; total: number; page: number; limit: number } | undefined;
  /** Loading cho lần fetch đầu tiên. */
  loading: boolean;
  /** Page hiện tại (chỉ dùng khi pagination). */
  page: number;
  /** Callback đổi trang. */
  onPageChange: (p: number) => void;
  /** Columns đã được build sẵn (đã highlight bên trong). */
  columns: TableColumn<T>[];
  /** Row key cho Table. */
  rowKey: (row: T) => string | number;
  /** Từ khoá đang áp dụng (chỉ dùng cho empty hint). */
  keywordApplied: string;
  /** Empty hint khi không có kết quả trong nhóm này. */
  emptyHint?: string;
  /**
   * Ẩn pagination — dùng cho type=all (BE trả limit cứng 5/module,
   * không phân trang theo từng nhóm).
   */
  hidePagination?: boolean;
}

export function SearchResultGroup<T extends { id: number }>({
  tone,
  title,
  icon,
  block,
  loading,
  page,
  onPageChange,
  columns,
  rowKey,
  keywordApplied,
  emptyHint,
  hidePagination,
}: SearchResultGroupProps<T>) {
  const items = block?.items ?? [];
  const total = block?.total ?? 0;
  const totalPages = total > 0 && block && block.limit > 0
    ? Math.max(1, Math.ceil(total / block.limit))
    : 1;

  return (
    <Card padding="md" className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <span className={[styles.badge, tone].join(" ")}>
            {icon}
            {title}
          </span>
          <span className={styles.sectionCount}>
            {total > 0
              ? `${total} kết quả`
              : loading
                ? "Đang tải..."
                : "Không có kết quả"}
          </span>
        </h2>
      </div>

      <Table
        columns={columns}
        data={items}
        loading={loading}
        skeletonRows={4}
        rowKey={rowKey}
        emptyState={
          <div className={styles.sectionEmpty}>
            <SearchX size={32} aria-hidden="true" />
            <p className={styles.emptyTitle}>
              {emptyHint ?? `Không có kết quả ${title.toLowerCase()} cho "${keywordApplied}"`}
            </p>
            {emptyHint ? null : (
              <p className={styles.emptyHint}>
                Thử mở rộng phạm vi tìm kiếm hoặc đổi từ khoá khác.
              </p>
            )}
          </div>
        }
      />

      {total > 0 && !hidePagination ? (
        <div className={styles.sectionFooter}>
          <span className={styles.totalLabel}>
            Hiển thị <b>{items.length}</b> / <b>{total}</b> bản ghi
          </span>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      ) : null}
    </Card>
  );
}