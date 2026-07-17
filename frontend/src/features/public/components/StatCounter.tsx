/**
 * StatCounter — số liệu với animation count-up khi vào viewport.
 *
 * Chỉ chạy animation khi section được scroll tới (IntersectionObserver).
 * Không chạy ngay lúc load nếu đang ở phía dưới trang.
 */
import { useEffect, useRef, useState } from "react";
import { useCountUp } from "../../../shared/hooks/useCountUp";
import styles from "./StatCounter.module.css";

export interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

interface StatCounterProps {
  stats: StatItem[];
}

export function StatCounter({ stats }: StatCounterProps) {
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.grid}>
      {stats.map((stat, i) => (
        <StatItem key={i} stat={stat} started={started} />
      ))}
    </div>
  );
}

function StatItem({ stat, started }: StatItemProps) {
  const animated = useCountUp(started ? stat.value : 0, { duration: 1200 });

  return (
    <div className={styles.item}>
      <span className={styles.value}>
        {animated.toLocaleString("vi-VN")}
        <span className={styles.suffix}>{stat.suffix}</span>
      </span>
      <span className={styles.label}>{stat.label}</span>
    </div>
  );
}

interface StatItemProps {
  stat: StatItem;
  started: boolean;
}
