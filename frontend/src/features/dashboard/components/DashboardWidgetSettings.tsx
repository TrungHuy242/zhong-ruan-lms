import { useEffect, useRef, useState } from "react";
import { Settings2 } from "lucide-react";
import {
  ALL_DASHBOARD_WIDGETS,
  WIDGET_LABELS,
  type DashboardWidgetKey,
  type UseDashboardWidgetsResult,
} from "../hooks/useDashboardWidgets";
import styles from "./DashboardWidgetSettings.module.css";

export interface DashboardWidgetSettingsProps {
  /** Hook result từ useDashboardWidgets. */
  widgets: UseDashboardWidgetsResult;
}

/**
 * DashboardWidgetSettings — nút dropdown bật/tắt từng widget.
 *
 * Click icon ⚙ → popover checkbox → tick/bỏ tick widget muốn hiện/ẩn.
 * Click ngoài popover → đóng.
 */
export function DashboardWidgetSettings({ widgets }: DashboardWidgetSettingsProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const enabledCount = ALL_DASHBOARD_WIDGETS.filter(
    (k) => widgets.enabled[k]
  ).length;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Tùy chỉnh widget Dashboard"
      >
        <Settings2 size={14} aria-hidden="true" />
        <span>Tùy chỉnh</span>
        <span className={styles.badge} aria-hidden="true">
          {enabledCount}/{ALL_DASHBOARD_WIDGETS.length}
        </span>
      </button>
      {open ? (
        <div role="menu" className={styles.popover}>
          <div className={styles.header}>Hiển thị widget</div>
          {ALL_DASHBOARD_WIDGETS.map((key: DashboardWidgetKey) => (
            <label key={key} className={styles.item}>
              <input
                type="checkbox"
                checked={widgets.enabled[key]}
                onChange={() => widgets.toggle(key)}
              />
              <span>{WIDGET_LABELS[key]}</span>
            </label>
          ))}
          <button
            type="button"
            className={styles.reset}
            onClick={() => widgets.reset()}
          >
            Khôi phục mặc định
          </button>
        </div>
      ) : null}
    </div>
  );
}