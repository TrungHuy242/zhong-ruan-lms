/**
 * useInfiniteScroll — hook generic dùng IntersectionObserver theo dõi 1
 * sentinel element ở cuối danh sách. Khi sentinel vào viewport sẽ gọi
 * `onLoadMore` để consumer tự load trang tiếp theo.
 *
 * Tính năng:
 *   - Chống trigger chồng lặp qua `isLoading` prop.
 *   - Cleanup observer khi unmount.
 *   - Không gọi khi `hasMore === false`.
 *   - Có thể dùng `rootMargin` để prefetch trước khi sentinel vào viewport.
 *
 * Ví dụ:
 *   const sentinelRef = useInfiniteScroll({
 *     onLoadMore: () => loadNextPage(),
 *     isLoading: loadingMore,
 *     hasMore: items.length < total,
 *   });
 *   return (
 *     <>
 *       {items.map(...)}
 *       <div ref={sentinelRef} />
 *     </>
 *   );
 */
import { useEffect, useRef } from "react";

export interface UseInfiniteScrollOptions {
  /** Callback khi sentinel vào viewport. */
  onLoadMore: () => void;
  /** Đang trong quá trình load — chặn trigger thêm. */
  isLoading?: boolean;
  /** Còn dữ liệu để load không — không trigger khi hết. */
  hasMore?: boolean;
  /** rootMargin cho IntersectionObserver (mặc định "0px"). */
  rootMargin?: string;
  /**
   * Disable hoàn toàn (VD khi đang đổi filter, chưa muốn load tiếp).
   * Mặc định false.
   */
  disabled?: boolean;
}

export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseInfiniteScrollOptions
): React.RefObject<T> {
  const { onLoadMore, isLoading, hasMore, rootMargin, disabled } = options;
  const ref = useRef<T>(null);

  // Dùng ref cho callback để onLoadMore thay đổi identity không reset observer.
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (disabled) return;
    const node = ref.current;
    if (!node) return;

    if (!hasMore) return;

    // Fallback khi IntersectionObserver không có sẵn (rất hiếm gặp trong browser hiện đại).
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) return;
        if (isLoading) return;
        onLoadMoreRef.current();
      },
      {
        rootMargin: rootMargin ?? "0px",
        threshold: 0,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isLoading, hasMore, rootMargin, disabled]);

  return ref;
}