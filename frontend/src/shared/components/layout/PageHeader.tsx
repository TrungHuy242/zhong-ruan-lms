/**
 * PageHeader — header chuẩn cho FormPage / detail page / create page.
 *
 * Tách ra từ AdminLayout (chỉ chứa Sidebar + top bar). PageHeader dùng
 * TRONG nội dung trang — hiển thị breadcrumb + title + nút back + actions.
 *
 * Hallmark stamp:
 *   macrostructure: form-led · genre: modern-minimal · theme: design-system-locked
 *   tone: utilitarian · shape: admin-radius-control 8px · shadow: admin-shadow-control 0.08
 *   font: Be Vietnam Pro only (single-font admin shell)
 *
 * Designed for 8 states:
 *   - default / hover (button) / focus-visible (button) / active / disabled / loading / error / success
 */

import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./PageHeader.module.css";

export interface BreadcrumbItem {
  label: string;
  /** Nếu có → render thành Link; nếu không → render text-only (current page). */
  to?: string;
}

export interface PageHeaderProps {
  /** Tiêu đề chính của trang (VD: "Thêm giảng viên", "Sửa user #12"). */
  title: string;
  /** Mô tả phụ dưới title (optional, hỗ trợ chuỗi dài). */
  description?: string;
  /**
   * Breadcrumb hiển thị phía trên title (VD: Quản lý > Thêm mới).
   * Không truyền → không hiển thị breadcrumb.
   * LUÔN là absolute path (không dùng relative).
   */
  breadcrumb?: BreadcrumbItem[];
  /**
   * Nút "Quay lại" — nếu có sẽ hiển thị bên trái title.
   * Nhận callback từ parent (parent tự handle navigate(-1) hoặc location cụ thể).
   */
  onBack?: () => void;
  /**
   * Actions bên phải title (VD: nút "Xem trên trang chủ" hoặc nút phụ).
   * Đặt ngoài StickyFooter — đây là action ngay tại header.
   */
  actions?: React.ReactNode;
  /** Loading state — disable nút back + actions. */
  loading?: boolean;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  onBack,
  actions,
  loading = false,
}: PageHeaderProps) {
  return (
    <header className={styles.header} aria-labelledby="page-header-title">
      {/* Breadcrumb — chỉ render khi có */}
      {breadcrumb && breadcrumb.length > 0 ? (
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
          <ol className={styles.breadcrumbList}>
            {breadcrumb.map((item, idx) => {
              const isLast = idx === breadcrumb.length - 1;
              return (
                <li key={`${item.label}-${idx}`} className={styles.breadcrumbItem}>
                  {item.to && !isLast ? (
                    <Link to={item.to} className={styles.breadcrumbLink}>
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className={styles.breadcrumbCurrent}
                      aria-current={isLast ? "page" : undefined}
                    >
                      {item.label}
                    </span>
                  )}
                  {!isLast ? (
                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                      className={styles.breadcrumbSeparator}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      {/* Title row */}
      <div className={styles.titleRow}>
        <div className={styles.titleLeft}>
          {onBack ? (
            <button
              type="button"
              className={styles.backBtn}
              onClick={onBack}
              disabled={loading}
              aria-label="Quay lại"
            >
              <ChevronLeft size={18} aria-hidden="true" />
              <span className={styles.backLabel}>Quay lại</span>
            </button>
          ) : null}
          <div className={styles.titleBlock}>
            <h1 id="page-header-title" className={styles.title}>
              {title}
            </h1>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
        </div>

        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </header>
  );
}

export default PageHeader;
