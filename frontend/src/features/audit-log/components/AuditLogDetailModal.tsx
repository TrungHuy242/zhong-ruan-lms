import { useEffect, useState } from "react";
import { Button, Modal } from "../../../shared/components/ui";
import { AuditActionBadge } from "./AuditActionBadge";
import { AuditJsonViewer } from "./AuditJsonViewer";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_MODULE_LABELS,
  formatAuditDateTime,
  getAuditLog,
  getModuleTargetPath,
  parseAuditTarget,
  type AuditLog,
} from "../services/auditLogApi";
import { useNavigate } from "react-router-dom";
import { Calendar, ExternalLink, Globe, Network, User as UserIcon } from "lucide-react";
import styles from "./AuditLogDetailModal.module.css";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giáo viên",
  STUDENT: "Học viên",
};

function classNames(...values: Array<string | false | undefined | null>): string {
  return values.filter(Boolean).join(" ");
}

export interface AuditLogDetailModalProps {
  open: boolean;
  log: AuditLog | null;
  onClose: () => void;
}

/**
 * Trích Before/After từ meta:
 *   - `meta.before` (nếu có)  → Before
 *   - `meta.after`  (nếu có)  → After
 *   - `meta.snapshot` (cho soft-delete/restore) → After (best-effort)
 *
 * Nếu không có field nào → fallback render toàn bộ `meta` (Backward-compat
 * cho mọi action log hiện có).
 */
function extractBeforeAfter(meta: AuditLog["meta"]): {
  before: unknown;
  after: unknown;
  fallback: unknown | null;
} {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return { before: undefined, after: undefined, fallback: null };
  }
  const m = meta as Record<string, unknown>;
  if ("before" in m || "after" in m) {
    return {
      before: "before" in m ? m.before : undefined,
      after: "after" in m ? m.after : undefined,
      fallback: null,
    };
  }
  if ("snapshot" in m) {
    // Các log soft-delete/restore lưu snapshot vào `after` để hiển thị diff gọn.
    return { before: undefined, after: m.snapshot, fallback: null };
  }
  return { before: undefined, after: undefined, fallback: meta };
}

/**
 * Modal chi tiết Audit Log (nâng cấp).
 *
 * Cấu trúc mới:
 *   1. Header: badge action + label action + action code
 *   2. Thông tin User (avatar, tên, email, role, ID)
 *   3. Module + đối tượng (target parse) + nút "Xem đối tượng" nếu có route
 *   4. Thời gian + IP + User-Agent
 *   5. Before/After (parse từ meta nếu có) — dùng AuditJsonViewer (pretty + Copy)
 *   6. Meta khác (nếu có, ngoài before/after) — cũng dùng JsonViewer
 *
 * - Nhận `log` từ list (UX click vào row → modal mở ngay).
 * - Song song fetch `GET /:id` để lấy bản đầy đủ meta.
 * - Fallback về `log` từ list nếu detail fail/404.
 * - BE đã redact `meta` ở cả list và detail → không lộ field nhạy cảm.
 */
export function AuditLogDetailModal({
  open,
  log,
  onClose,
}: AuditLogDetailModalProps) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !log) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getAuditLog(log.id)
      .then((res) => {
        if (cancelled) return;
        setDetail(res);
      })
      .catch(() => {
        if (cancelled) return;
        setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, log?.id]);

  const view = detail ?? log;

  if (!view) {
    return (
      <Modal open={open} onClose={onClose} title="Chi tiết nhật ký" size="lg">
        <p className={styles.placeholder}>Không có dữ liệu</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </Modal>
    );
  }

  const actionLabel =
    AUDIT_ACTION_LABELS[view.action as keyof typeof AUDIT_ACTION_LABELS] ?? view.action;

  const actor = view.user;
  const target = parseAuditTarget(view.target);
  const moduleLabel = target
    ? AUDIT_MODULE_LABELS[target.module] ?? target.module
    : null;
  const targetPath = target ? getModuleTargetPath(target.module, target.id) : null;

  const { before, after, fallback } = extractBeforeAfter(view.meta);

  function handleViewTarget() {
    if (targetPath) navigate(targetPath);
  }

  return (
    <Modal open={open} onClose={onClose} title="Chi tiết nhật ký" size="lg">
      <div className={styles.body}>
        {/* ===== Action header ===== */}
        <section className={classNames(styles.section, styles.actionHeader)}>
          <div className={styles.actionHeaderLeft}>
            <AuditActionBadge action={view.action} />
            <span className={styles.actionLabel}>{actionLabel}</span>
            <code className={styles.actionCode}>{view.action}</code>
          </div>
        </section>

        {/* ===== User ===== */}
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <UserIcon size={14} aria-hidden="true" /> Người thực hiện
          </h4>
          {actor ? (
            <div className={styles.actor}>
              <span className={styles.avatar}>
                {actor.fullName
                  .trim()
                  .split(/\s+/)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <div className={styles.actorInfo}>
                <span className={styles.actorName}>{actor.fullName}</span>
                <span className={styles.actorEmail}>{actor.email}</span>
                <span className={styles.actorMeta}>
                  ID: {actor.id} ·{" "}
                  {ROLE_LABELS[actor.role] ?? actor.role}
                </span>
              </div>
            </div>
          ) : (
            <p className={styles.placeholder}>
              Không có thông tin người thực hiện
              {view.userId != null ? ` (ID: ${view.userId})` : ""}
            </p>
          )}
        </section>

        {/* ===== Module + Target ===== */}
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Network size={14} aria-hidden="true" /> Module &amp; Đối tượng
          </h4>
          <div className={styles.targetRow}>
            <div className={styles.targetBlock}>
              {moduleLabel ? (
                <span className={styles.targetModuleBadge}>{moduleLabel}</span>
              ) : null}
              <span className={styles.targetValue}>
                {view.target ?? (
                  <span className={styles.dim}>Không có đối tượng cụ thể</span>
                )}
              </span>
            </div>
            {targetPath ? (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ExternalLink size={14} />}
                onClick={handleViewTarget}
              >
                Xem đối tượng
              </Button>
            ) : null}
          </div>
        </section>

        {/* ===== Time + IP + UA ===== */}
        <section className={classNames(styles.section, styles.metaGridSection)}>
          <div className={styles.metaItem}>
            <h4 className={styles.sectionTitle}>
              <Calendar size={14} aria-hidden="true" /> Thời gian
            </h4>
            <p className={styles.value}>{formatAuditDateTime(view.createdAt)}</p>
          </div>
          {view.ip ? (
            <div className={styles.metaItem}>
              <h4 className={styles.sectionTitle}>
                <Globe size={14} aria-hidden="true" /> Địa chỉ IP
              </h4>
              <p className={styles.value}>{view.ip}</p>
            </div>
          ) : null}
          {view.userAgent ? (
            <div className={classNames(styles.metaItem, styles.metaItemFull)}>
              <h4 className={styles.sectionTitle}>User-Agent</h4>
              <p className={[styles.value, styles.userAgent].join(" ")}>
                {view.userAgent}
              </p>
            </div>
          ) : null}
        </section>

        {/* ===== Loading hint ===== */}
        {loading && !detail ? (
          <p className={styles.loadingHint}>Đang tải chi tiết...</p>
        ) : null}

        {/* ===== Before / After ===== */}
        {(before !== undefined || after !== undefined) ? (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Trước / Sau</h4>
            <div className={styles.diffGrid}>
              <AuditJsonViewer data={before} title="Trước (Before)" />
              <AuditJsonViewer data={after} title="Sau (After)" />
            </div>
          </section>
        ) : null}

        {/* ===== Meta fallback (khi không có before/after) ===== */}
        {fallback ? (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Dữ liệu chi tiết (meta)</h4>
            <AuditJsonViewer data={fallback} title="Meta" />
          </section>
        ) : null}
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
}