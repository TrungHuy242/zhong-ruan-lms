/**
 * TrashDetailModal — modal chi tiết 1 bản ghi trong thùng rác.
 *
 * Sections:
 *   1. Module badge + label (tiêu đề)
 *   2. ID (key cấu hình nếu settings, hoặc id số)
 *   3. Người tạo (creator — User của record)
 *   4. Người xoá (deletedBy) — có thể trùng creator
 *   5. Thời gian tạo + thời gian xoá
 *   6. Thông tin dữ liệu trước khi xoá (snapshot) — pretty JSON qua AuditJsonViewer
 *
 * API flow:
 *   - Nhận `item` (từ list) để hiển thị title ngay tức thì.
 *   - Song song fetch `GET /trash/:module/detail/:idOrKey` để lấy snapshot đầy đủ.
 *   - Loading state hiển thị skeleton cho phần snapshot.
 *   - Lỗi fetch → fallback về item list (không block UI).
 */
import { useEffect, useState } from "react";
import { Modal } from "../../../shared/components/ui";
import { AuditJsonViewer } from "../../audit-log/components/AuditJsonViewer";
import { TRASH_MODULE_LABELS } from "../constants/trash.constants";
import { getTrashDetail, type TrashDetail, type TrashItemV2 } from "../services/trashApi";
import {
  Bell,
  Calendar,
  CalendarClock,
  FileText,
  KeyRound,
  Settings as SettingsIcon,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import styles from "./TrashDetailModal.module.css";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Quản trị viên",
  TEACHER: "Giảng viên",
  STUDENT: "Học viên",
};

const MODULE_ICON: Record<string, React.ReactNode> = {
  users: <UserIcon size={14} aria-hidden="true" />,
  notifications: <Bell size={14} aria-hidden="true" />,
  files: <FileText size={14} aria-hidden="true" />,
  settings: <SettingsIcon size={14} aria-hidden="true" />,
};

function classNames(...values: Array<string | false | undefined | null>): string {
  return values.filter(Boolean).join(" ");
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function actorInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).map((w) => w[0]).filter(Boolean);
  return (parts.slice(0, 2).join("") || "?").toUpperCase();
}

export interface TrashDetailModalProps {
  open: boolean;
  /** Item từ danh sách — dùng để hiển thị title ngay, fallback khi detail fail. */
  item: TrashItemV2 | null;
  onClose: () => void;
}

export function TrashDetailModal({ open, item, onClose }: TrashDetailModalProps) {
  const [detail, setDetail] = useState<TrashDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) {
      setDetail(null);
      setErrorMsg(null);
      return;
    }
    let cancelled = false;
    const lookup = item.module === "settings" ? (item.key ?? String(item.id)) : item.id;
    setLoading(true);
    setErrorMsg(null);
    getTrashDetail(item.module, lookup)
      .then((res) => {
        if (cancelled) return;
        setDetail(res);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "Không tải được chi tiết";
        setErrorMsg(msg);
        setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, item?.module, item?.id, item?.key]);

  // Compose view: ưu tiên `detail` (đầy đủ + snapshot + creator), fallback về `item`.
  const view = detail ?? item;
  const moduleLabel = view ? TRASH_MODULE_LABELS[view.module] : "";
  const itemId = view
    ? view.module === "settings"
      ? view.key ?? `#${view.id}`
      : `#${view.id}`
    : "—";

  return (
    <Modal open={open} onClose={onClose} title="Chi tiết bản ghi đã xoá" size="lg">
      {view ? (
        <div className={styles.body}>
          {/* ===== Header — module + label ===== */}
          <section className={styles.headerSection}>
            <div className={styles.headerLeft}>
              <span className={classNames(styles.moduleBadge, styles[`badge_${view.module}`])}>
                {MODULE_ICON[view.module]}
                {moduleLabel}
              </span>
              <span className={styles.label}>{view.label}</span>
            </div>
          </section>

          {/* ===== Meta grid (ID, người tạo, người xoá, thời gian) ===== */}
          <section className={styles.metaGrid}>
            {/* Module */}
            <div className={styles.metaItem}>
              <h4 className={styles.sectionTitle}>
                <FileText size={14} aria-hidden="true" /> Module
              </h4>
              <p className={styles.value}>{moduleLabel}</p>
            </div>

            {/* ID (key cho settings) */}
            <div className={styles.metaItem}>
              <h4 className={styles.sectionTitle}>
                <KeyRound size={14} aria-hidden="true" />{" "}
                {view.module === "settings" ? "Key cấu hình" : "ID bản ghi"}
              </h4>
              <p className={classNames(styles.value, styles.mono)}>{itemId}</p>
            </div>

            {/* Người tạo */}
            <div className={styles.metaItem}>
              <h4 className={styles.sectionTitle}>
                <UserIcon size={14} aria-hidden="true" /> Người tạo
              </h4>
              {detail?.creator ? (
                <div className={styles.actor}>
                  <span className={styles.avatar}>{actorInitials(detail.creator.fullName)}</span>
                  <div className={styles.actorInfo}>
                    <span className={styles.actorName}>{detail.creator.fullName}</span>
                    <span className={styles.actorEmail}>{detail.creator.email}</span>
                    <span className={styles.actorMeta}>
                      ID: {detail.creator.id} ·{" "}
                      {ROLE_LABEL[detail.creator.role] ?? detail.creator.role}
                    </span>
                  </div>
                </div>
              ) : (
                <p className={styles.placeholder}>
                  {loading ? "Đang tải..." : "Không có thông tin người tạo"}
                </p>
              )}
            </div>

            {/* Người xoá */}
            <div className={styles.metaItem}>
              <h4 className={styles.sectionTitle}>
                <Trash2 size={14} aria-hidden="true" /> Người xoá
              </h4>
              {view.deletedBy ? (
                <div className={styles.actor}>
                  <span className={classNames(styles.avatar, styles.avatarDanger)}>
                    {actorInitials(view.deletedBy.fullName)}
                  </span>
                  <div className={styles.actorInfo}>
                    <span className={styles.actorName}>{view.deletedBy.fullName}</span>
                    <span className={styles.actorEmail}>{view.deletedBy.email}</span>
                    <span className={styles.actorMeta}>
                      ID: {view.deletedBy.id} ·{" "}
                      {ROLE_LABEL[view.deletedBy.role] ?? view.deletedBy.role}
                    </span>
                  </div>
                </div>
              ) : (
                <p className={styles.placeholder}>
                  Không rõ người xoá
                  {view.deletedById != null ? ` (ID: ${view.deletedById})` : ""}
                </p>
              )}
            </div>

            {/* Thời gian tạo */}
            <div className={styles.metaItem}>
              <h4 className={styles.sectionTitle}>
                <Calendar size={14} aria-hidden="true" /> Thời gian tạo
              </h4>
              <p className={styles.value}>{formatDateTime(view.createdAt)}</p>
            </div>

            {/* Thời gian xoá */}
            <div className={styles.metaItem}>
              <h4 className={styles.sectionTitle}>
                <CalendarClock size={14} aria-hidden="true" /> Thời gian xoá
              </h4>
              <p className={styles.value}>{formatDateTime(view.deletedAt)}</p>
            </div>
          </section>

          {/* ===== Snapshot ===== */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>
              Dữ liệu trước khi xoá (snapshot)
            </h4>
            {errorMsg ? (
              <p className={styles.errorMsg}>{errorMsg}</p>
            ) : !detail ? (
              loading ? (
                <p className={styles.placeholder}>Đang tải dữ liệu snapshot...</p>
              ) : (
                <p className={styles.placeholder}>Không tải được dữ liệu chi tiết.</p>
              )
            ) : detail.snapshot ? (
              <AuditJsonViewer data={detail.snapshot} title="Snapshot" collapseLines={20} />
            ) : (
              <p className={styles.placeholder}>Không có dữ liệu trước khi xoá</p>
            )}
          </section>
        </div>
      ) : (
        <p className={styles.placeholder}>Không có dữ liệu</p>
      )}
    </Modal>
  );
}
