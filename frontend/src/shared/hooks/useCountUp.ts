/**
 * useCountUp — animation đếm số khi giá trị thay đổi.
 *
 * Dùng requestAnimationFrame để nội suy từ `prev` → `value` trong `duration` ms.
 * Không phụ thuộc thư viện animation nào.
 *
 * Return: giá trị số hiện tại đang được animate. Khi unmount hoặc value đổi,
 * animation reset về giá trị cũ rồi chạy lại từ đầu.
 *
 * Ví dụ:
 *   const animated = useCountUp(totalUsers, 800);
 *   return <span>{animated.toLocaleString("vi-VN")}</span>;
 */
import { useEffect, useRef, useState } from "react";

export interface UseCountUpOptions {
  /** Thời gian animation (ms). Mặc định 800. */
  duration?: number;
  /**
   * Hàm easing. Mặc định easeOutCubic (mượt, giảm tốc về cuối).
   * easeOutCubic: 1 - (1 - t)^3
   */
  easing?: (t: number) => number;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export function useCountUp(
  value: number,
  { duration = 800, easing = easeOutCubic }: UseCountUpOptions = {}
): number {
  const [display, setDisplay] = useState<number>(value);
  const fromRef = useRef<number>(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Giá trị đích mới.
    const to = value;
    const from = fromRef.current;
    if (from === to) return;

    // Reset nếu đang có animation cũ.
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easing(t);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Kết thúc animation → đặt lại "from" = to để lần đổi sau không bị giật.
        fromRef.current = to;
        rafRef.current = null;
        setDisplay(to);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    // Cleanup khi value đổi tiếp hoặc component unmount.
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Lưu lại điểm hiện tại để animation tiếp theo không bị giật.
      fromRef.current = display;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  // Cleanup khi unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return display;
}