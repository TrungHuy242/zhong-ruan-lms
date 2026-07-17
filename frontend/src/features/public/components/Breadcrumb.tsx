/**
 * Breadcrumb — điều hướng phân cấp cho trang public.
 *
 * Tái dùng được cho các trang Giảng viên / Bảng giá sau này.
 * Last item là trang hiện tại — KHÔNG link, đánh dấu aria-current="page".
 */
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import styles from "./Breadcrumb.module.css";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={styles.nav}>
      <ol className={styles.list}>
        <li className={styles.item}>
          <Link to="/" className={styles.link} aria-label="Trang chủ">
            <Home size={14} strokeWidth={2} aria-hidden="true" />
          </Link>
        </li>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className={styles.item}>
              <ChevronRight
                size={14}
                strokeWidth={2}
                className={styles.separator}
                aria-hidden="true"
              />
              {isLast || !item.to ? (
                <span className={styles.current} aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className={styles.link}>
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}