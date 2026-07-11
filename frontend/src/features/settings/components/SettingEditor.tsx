/**
 * SettingEditor — Quick-edit component cho 1 setting.
 *
 * Render control dựa trên `kind` (ValueKind) suy ra từ value:
 *   - boolean  → Switch
 *   - number   → Input type=number
 *   - json     → read-only pre (khuyến nghị mở modal để sửa)
 *   - longText → Textarea (rows=3)
 *   - text     → Input type=text
 *
 * Có 2 chế độ:
 *   - "inline": edit + Save/Cancel buttons (mặc định)
 *   - "switch": auto-save on toggle (chỉ dùng cho boolean)
 *
 * Props:
 *   - value: raw string hiện tại
 *   - onSave(newValue: string): Promise<void> — parent xử lý gọi API
 *   - readOnly?: disable toàn bộ (cho non-ADMIN)
 */

import { useEffect, useState } from "react";
import { Check, X as XIcon } from "lucide-react";
import {
  booleanToValue,
  detectValueKind,
  valueToBoolean,
  type ValueKind,
} from "../services/settingApi";
import styles from "./SettingEditor.module.css";

export interface SettingEditorProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  readOnly?: boolean;
  /** Khi kind là json, render pre read-only + nút "Mở modal". */
  onRequestFullEdit?: () => void;
}

export function SettingEditor({
  value,
  onSave,
  readOnly = false,
  onRequestFullEdit,
}: SettingEditorProps) {
  const kind: ValueKind = detectValueKind(value);

  // Auto-save mode cho boolean: toggle switch → save ngay.
  if (kind === "boolean") {
    return (
      <BooleanEditor value={value} onSave={onSave} readOnly={readOnly} />
    );
  }

  // JSON: read-only + yêu cầu mở modal để sửa (an toàn, tránh hỏng cấu trúc).
  if (kind === "json") {
    return (
      <div className={styles.wrapper}>
        <pre className={styles.jsonBox} title="JSON — mở modal để sửa">{value}</pre>
        {!readOnly && onRequestFullEdit ? (
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onRequestFullEdit}
            title="Mở modal để sửa"
            aria-label="Mở modal để sửa JSON"
          >
            <span style={{ fontSize: 11, fontWeight: 600 }}>Sửa</span>
          </button>
        ) : null}
      </div>
    );
  }

  // Inline edit cho text/number/longText.
  return (
    <InlineEditor value={value} kind={kind} onSave={onSave} readOnly={readOnly} />
  );
}

// ===== BooleanEditor =====

function BooleanEditor({
  value,
  onSave,
  readOnly,
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
  readOnly: boolean;
}) {
  const [checked, setChecked] = useState<boolean>(valueToBoolean(value));
  const [saving, setSaving] = useState(false);

  // Đồng bộ khi value prop thay đổi từ bên ngoài (refresh sau save).
  useEffect(() => {
    setChecked(valueToBoolean(value));
  }, [value]);

  async function handleToggle(next: boolean) {
    if (readOnly || saving) return;
    setChecked(next);
    setSaving(true);
    try {
      await onSave(booleanToValue(next));
    } catch {
      // rollback khi fail
      setChecked(valueToBoolean(value));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      <label className={styles.switch} title={checked ? "Bật" : "Tắt"}>
        <input
          type="checkbox"
          checked={checked}
          disabled={readOnly || saving}
          onChange={(e) => handleToggle(e.target.checked)}
          aria-label="Toggle giá trị boolean"
        />
        <span className={styles.switchTrack}>
          <span className={styles.switchThumb} />
        </span>
      </label>
      <span className={styles.switchLabel}>
        {saving ? "Đang lưu…" : checked ? "true" : "false"}
      </span>
    </div>
  );
}

// ===== InlineEditor (text/number/longText) =====

function InlineEditor({
  value,
  kind,
  onSave,
  readOnly,
}: {
  value: string;
  kind: "number" | "longText" | "text";
  onSave: (v: string) => Promise<void>;
  readOnly: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset draft khi value đổi từ bên ngoài (vd sau save thành công, refresh).
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const dirty = draft !== value;
  const empty = draft.trim() === "";

  function handleEdit() {
    if (readOnly) return;
    setEditing(true);
  }

  function handleCancel() {
    setDraft(value);
    setEditing(false);
  }

  async function handleSave() {
    if (saving) return;
    if (kind === "number") {
      // Đảm bảo là số hợp lệ trước khi gọi API
      if (!/^-?\d+(\.\d+)?$/.test(draft.trim())) return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      // giữ nguyên draft, parent sẽ hiện error alert
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (kind === "longText") return; // textarea để Ctrl+Enter
    if (e.key === "Enter") {
      e.preventDefault();
      if (dirty && !empty) void handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (dirty && !empty) void handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  }

  if (!editing) {
    // Display mode
    return (
      <div className={styles.wrapper}>
        {kind === "longText" ? (
          <span
            className={styles.valueReadonly}
            title={value}
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {value}
          </span>
        ) : (
          <span className={styles.valueReadonly} title={value}>
            {value}
          </span>
        )}
        {!readOnly ? (
          <button
            type="button"
            className={styles.iconBtn}
            onClick={handleEdit}
            title="Chỉnh sửa nhanh"
            aria-label="Chỉnh sửa nhanh"
          >
            <span style={{ fontSize: 11, fontWeight: 600 }}>Sửa</span>
          </button>
        ) : null}
      </div>
    );
  }

  // Edit mode
  return (
    <div className={styles.wrapper}>
      {kind === "longText" ? (
        <textarea
          className={styles.textarea}
          rows={3}
          value={draft}
          autoFocus
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleTextareaKeyDown}
        />
      ) : (
        <input
          className={styles.input}
          type={kind === "number" ? "number" : "text"}
          value={draft}
          autoFocus
          disabled={saving}
          step={kind === "number" ? "any" : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={[styles.iconBtn, styles.iconBtnSave].join(" ")}
          onClick={handleSave}
          disabled={saving || !dirty || empty}
          title="Lưu (Enter)"
          aria-label="Lưu"
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          className={[styles.iconBtn, styles.iconBtnCancel].join(" ")}
          onClick={handleCancel}
          disabled={saving}
          title="Huỷ (Esc)"
          aria-label="Huỷ"
        >
          <XIcon size={14} />
        </button>
      </div>
    </div>
  );
}