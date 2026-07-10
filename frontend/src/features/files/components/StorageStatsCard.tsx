/**
 * StorageStatsCard — chỉ Admin: card đầu trang FileManagerPage hiển thị
 * tổng dung lượng + breakdown theo category.
 *
 * Call GET /files/storage-stats. BE trả shape:
 *   { totalSize, totalFiles, byType: { image: {count,size}, ... } }
 *
 * UI: progress bar tổng + 4 bar con với màu khác nhau + counts.
 */
import { useEffect, useState } from "react";
import { Database, Loader2, RefreshCw } from "lucide-react";
import { Button } from "../../../shared/components/ui";
import { getStorageStats, type FileStorageStats } from "../services/fileApi";
import {
  FILE_API_CATEGORIES,
  FILE_CATEGORY_LABELS,
  FILE_CATEGORY_COLOR_VAR,
  type FileApiCategory,
} from "../constants/file.constants";
import styles from "./StorageStatsCard.module.css";

export interface StorageStatsCardProps {
  /** Refresh trigger — khi đổi 1 số chỉnh ở parent, có thể tăng prop này. */
  refreshKey?: number;
  /** Có đang ở chế độ Admin hay không — nếu không thì ẩn cả card. */
  isAdmin: boolean;
}

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(gb < 10 ? 2 : 1)} GB`;
}

function formatPercent(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function StorageStatsCard({ refreshKey = 0, isAdmin }: StorageStatsCardProps) {
  const [stats, setStats] = useState<FileStorageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getStorageStats();
        if (cancelled) return;
        setStats(data);
      } catch (err) {
        if (cancelled) return;
        // Non-admin: BE trả 403 — bỏ qua silent.
        if (err && typeof err === "object" && "status" in err && (err as { status?: number }).status === 403) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Không tải được thống kê dung lượng";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, refreshKey]);

  if (!isAdmin) return null;

  // Loading state lần đầu
  if (loading && !stats) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <Database size={18} aria-hidden="true" />
            <h3 className={styles.title}>Dung lượng lưu trữ</h3>
          </div>
        </div>
        <div className={styles.skeleton}>
          <Loader2 size={18} className={styles.spinIcon} aria-hidden="true" />
          <span>Đang tải thống kê...</span>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <Database size={18} aria-hidden="true" />
            <h3 className={styles.title}>Dung lượng lưu trữ</h3>
          </div>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Database size={18} aria-hidden="true" />
          <h3 className={styles.title}>Dung lượng lưu trữ</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<RefreshCw size={14} />}
          onClick={() => {
            // Force refresh bằng cách gọi lại hook trigger
            setStats(null);
            // Không tăng refreshKey (parent quản lý); thay vào đó setLoading=true và re-fetch
            setLoading(true);
            setError(null);
            (async () => {
              try {
                const data = await getStorageStats();
                setStats(data);
              } catch (err) {
                const message =
                  err instanceof Error ? err.message : "Không tải được thống kê";
                setError(message);
              } finally {
                setLoading(false);
              }
            })();
          }}
          disabled={loading}
          aria-label="Làm mới thống kê dung lượng"
        >
          Làm mới
        </Button>
      </div>

      <div className={styles.summary}>
        <div className={styles.totalBlock}>
          <span className={styles.totalLabel}>Tổng dung lượng</span>
          <span className={styles.totalValue}>{formatSize(stats.totalSize)}</span>
        </div>
        <div className={styles.totalBlock}>
          <span className={styles.totalLabel}>Tổng số file</span>
          <span className={styles.totalValue}>
            {stats.totalFiles.toLocaleString("vi-VN")}
          </span>
        </div>
      </div>

      <div className={styles.bars}>
        {FILE_API_CATEGORIES.map((cat) => {
          const bucket = stats.byType[cat];
          const pct =
            stats.totalSize > 0
              ? Math.min(100, (bucket.size / stats.totalSize) * 100)
              : 0;
          return (
            <div key={cat} className={styles.bar}>
              <div className={styles.barLabelGroup}>
                <span
                  className={styles.barLabel}
                  style={{ color: FILE_CATEGORY_COLOR_VAR[cat] as string }}
                >
                  {FILE_CATEGORY_LABELS[cat as FileApiCategory]}
                </span>
                <span className={styles.barMeta}>
                  {bucket.count.toLocaleString("vi-VN")} file ·{" "}
                  {formatSize(bucket.size)} ({formatPercent(bucket.size, stats.totalSize)})
                </span>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: FILE_CATEGORY_COLOR_VAR[cat] as string,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}