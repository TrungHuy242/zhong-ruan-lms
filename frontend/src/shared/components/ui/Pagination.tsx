import { Button } from "./Button";
import styles from "./Pagination.module.css";

export interface PaginationProps {
  /** Trang hiện tại (1-based). */
  currentPage: number;
  /** Tổng số trang. Nếu <= 1 → không render gì. */
  totalPages: number;
  onPageChange: (page: number) => void;
}

function classNames(
  ...values: Array<string | false | undefined | null>
): string {
  return values.filter(Boolean).join(" ");
}

/**
 * Build dãy item hiển thị với rút gọn "...":
 *   totalPages=20, current=6 → [1, "...", 4, 5, 6, 7, 8, "...", 20]
 *   totalPages≤7 → hiện hết.
 */
function buildPageItems(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items: (number | "...")[] = [];
  // Luôn hiện trang 1 và total.
  items.push(1);

  const windowStart = Math.max(2, current - 1);
  const windowEnd = Math.min(total - 1, current + 1);

  if (windowStart > 2) items.push("...");

  for (let p = windowStart; p <= windowEnd; p++) items.push(p);

  if (windowEnd < total - 1) items.push("...");

  items.push(total);

  return items;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;
  const items = buildPageItems(safePage, totalPages);

  return (
    <nav className={styles.nav} aria-label="Phân trang">
      <Button
        variant="secondary"
        size="sm"
        disabled={!canPrev}
        onClick={() => onPageChange(safePage - 1)}
        aria-label="Trang trước"
      >
        ‹ Trước
      </Button>

      <ul className={styles.list}>
        {items.map((item, idx) => {
          if (item === "...") {
            return (
              <li key={`dots-${idx}`} className={styles.dots} aria-hidden="true">
                …
              </li>
            );
          }
          const isActive = item === safePage;
          return (
            <li key={item}>
              <button
                type="button"
                className={classNames(
                  styles.item,
                  isActive && styles.active
                )}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            </li>
          );
        })}
      </ul>

      <Button
        variant="secondary"
        size="sm"
        disabled={!canNext}
        onClick={() => onPageChange(safePage + 1)}
        aria-label="Trang sau"
      >
        Sau ›
      </Button>
    </nav>
  );
}
