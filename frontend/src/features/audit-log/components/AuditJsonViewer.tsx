import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import styles from "./AuditJsonViewer.module.css";

export interface AuditJsonViewerProps {
  /** Dữ liệu JSON. Nếu null/undefined → render "Không có dữ liệu". */
  data: unknown;
  /** Title hiển thị phía trên (VD: "Dữ liệu trước"). Optional. */
  title?: string;
  /** Số dòng tối đa collapse mặc định. Mặc định 30. Set 0 để disable collapse. */
  collapseLines?: number;
  /** Class thêm cho wrapper. */
  className?: string;
}

function classNames(...values: Array<string | false | undefined | null>): string {
  return values.filter(Boolean).join(" ");
}

/** Pretty-print an toàn — fallback string nếu có circular. */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    try {
      return String(value);
    } catch {
      return "<không thể hiển thị>";
    }
  }
}

/** Đếm số dòng của pretty-printed text. */
function countLines(text: string): number {
  if (!text) return 0;
  return text.split("\n").length;
}

/**
 * AuditJsonViewer — hiển thị JSON đẹp (pretty print) với:
 *   - Header (title + Copy button)
 *   - <pre> với monospace font + scroll
 *   - Auto-collapse nếu vượt quá N dòng (mặc định 30) + nút "Xem thêm/Thu gọn"
 *   - Copy button dùng navigator.clipboard; feedback "Đã sao chép" 2s
 *
 * Không phụ thuộc thư viện JSON viewer bên ngoài — đơn giản, đủ dùng cho audit log.
 */
export function AuditJsonViewer({
  data,
  title,
  collapseLines = 30,
  className,
}: AuditJsonViewerProps) {
  const text = useMemo(() => safeStringify(data), [data]);
  const lineCount = useMemo(() => countLines(text), [text]);
  const canCollapse = collapseLines > 0 && lineCount > collapseLines;

  const [expanded, setExpanded] = useState(!canCollapse);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset state khi data thay đổi (mở lại modal với log khác).
    setExpanded(!canCollapse);
    setCopied(false);
  }, [text, canCollapse]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  async function handleCopy() {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback cho trình duyệt cũ
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Bỏ qua — UI vẫn hiển thị text để user copy thủ công.
    }
  }

  if (data === null || data === undefined) {
    return (
      <div className={classNames(styles.wrapper, styles.empty, className)}>
        {title ? <span className={styles.title}>{title}</span> : null}
        <p className={styles.placeholder}>Không có dữ liệu</p>
      </div>
    );
  }

  // Lấy 1 slice đầu nếu collapse và chưa expanded.
  const displayText = canCollapse && !expanded
    ? text.split("\n").slice(0, collapseLines).join("\n") + "\n…"
    : text;

  return (
    <div className={classNames(styles.wrapper, className)}>
      {(title || text) ? (
        <header className={styles.header}>
          {title ? <span className={styles.title}>{title}</span> : <span />}
          {text ? (
            <button
              type="button"
              className={classNames(styles.copyBtn, copied && styles.copyBtnDone)}
              onClick={handleCopy}
              aria-label={copied ? "Đã sao chép" : "Sao chép JSON"}
              title={copied ? "Đã sao chép" : "Sao chép JSON"}
            >
              {copied ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  <span>Đã sao chép</span>
                </>
              ) : (
                <>
                  <Copy size={14} aria-hidden="true" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          ) : null}
        </header>
      ) : null}
      <pre className={styles.code} tabIndex={0}>
        {displayText}
      </pre>
      {canCollapse ? (
        <button
          type="button"
          className={styles.expandBtn}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? "Thu gọn"
            : `Xem thêm (còn ${lineCount - collapseLines} dòng)`}
        </button>
      ) : null}
    </div>
  );
}