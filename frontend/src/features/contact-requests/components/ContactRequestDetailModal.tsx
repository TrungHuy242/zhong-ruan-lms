/**
 * ContactRequestDetailModal — Modal chi tiết yêu cầu tư vấn (admin).
 *
 * Tính năng:
 *   - Hiển thị đầy đủ thông tin (Họ tên, SĐT, Email, Lời nhắn, Ngày gửi/Cập nhật).
 *   - Đổi trạng thái ngay trong modal (NEW → CONTACTED → CLOSED).
 *   - Badge trạng thái hiện tại + action bar cho admin.
 *
 * Pattern tham chiếu: features/audit-log/components/AuditLogDetailModal.
 *  - Nhận record từ list qua prop (UX: click row → mở ngay).
 *  - Song song fetch lại chi tiết qua getContactRequest() để chắc chắn mới nhất;
 *    nếu fail → fallback dùng record từ list.
 *  - BE tự xử lý audit log khi updateStatus, FE chỉ cần render lại list sau.
 */
import { useEffect, useState } from "react";
import { Alert, Button, Modal } from "../../../shared/components/ui";
import { ApiError } from "../../../shared/api";
import {
  Calendar,
  Mail,
  MessageSquare,
  Phone,
  Save,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import {
  STATUS_LABELS,
  deleteContactRequest,
  getContactRequest,
  updateContactRequestStatus,
  type ContactRequest,
  type ContactStatus,
} from "../services/contactRequestApi";
import styles from "./ContactRequestDetailModal.module.css";

const STATUS_OPTIONS: ContactStatus[] = ["NEW", "CONTACTED", "CLOSED"];

function classNames(...values: Array<string | false | undefined | null>): string {
  return values.filter(Boolean).join(" ");
}

function formatDateTime(iso: string): string {
  // Trả về local string dễ đọc cho admin.
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface ContactRequestDetailModalProps {
  open: boolean;
  /** Record từ list (dùng để render ngay, fallback nếu fetch detail fail). */
  contact: ContactRequest | null;
  /**
   * Được gọi sau khi đổi status / xoá thành công.
   * Page cha dùng để reload list + đóng modal.
   */
  onChanged: () => void;
  onClose: () => void;
}

export function ContactRequestDetailModal({
  open,
  contact,
  onChanged,
  onClose,
}: ContactRequestDetailModalProps) {
  const [detail, setDetail] = useState<ContactRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trạng thái đang chọn trong form đổi status + loading
  const [pendingStatus, setPendingStatus] = useState<ContactStatus | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  // Soft-delete state
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Reset mọi state phụ mỗi lần mở modal với record khác.
  useEffect(() => {
    if (!open || !contact) {
      setDetail(null);
      setError(null);
      setPendingStatus(null);
      setConfirmDeleteOpen(false);
      return;
    }
    let cancelled = false;
    setDetail(null);
    setError(null);
    setLoading(true);
    getContactRequest(contact.id)
      .then((res) => {
        if (cancelled) return;
        setDetail(res);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
            ? e.message
            : "Không tải được chi tiết";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, contact?.id]);

  // Record hiển thị: ưu tiên bản fetch, fallback về record từ list.
  const view = detail ?? contact;

  function currentStatus(): ContactStatus | null {
    return view?.status ?? null;
  }

  async function handleSaveStatus() {
    if (!view || pendingStatus === null) return;
    setSavingStatus(true);
    setError(null);
    try {
      const updated = await updateContactRequestStatus(view.id, pendingStatus);
      setDetail(updated);
      setPendingStatus(null);
      onChanged();
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
          ? e.message
          : "Không cập nhật được trạng thái";
      setError(msg);
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleDelete() {
    if (!view) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteContactRequest(view.id);
      onChanged();
      onClose();
    } catch (e: unknown) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
          ? e.message
          : "Không xoá được yêu cầu";
      setError(msg);
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  }

  if (!view) {
    return (
      <Modal open={open} onClose={onClose} title="Chi tiết yêu cầu tư vấn" size="lg">
        <p className={styles.placeholder}>Không có dữ liệu</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </Modal>
    );
  }

  const current = currentStatus();
  const dirty = pendingStatus !== null && pendingStatus !== current;

  return (
    <Modal open={open} onClose={onClose} title="Chi tiết yêu cầu tư vấn" size="lg">
      {error ? (
        <div className={styles.alertWrap}>
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      ) : null}

      <div className={styles.body}>
        {/* ===== Header: tên + badge trạng thái ===== */}
        <section className={classNames(styles.section, styles.headerRow)}>
          <div className={styles.nameBlock}>
            <span className={styles.avatar} aria-hidden="true">
              {view.fullName
                .trim()
                .split(/\s+/)
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
            <div>
              <h3 className={styles.fullName}>{view.fullName}</h3>
              <span className={styles.idHint}>
                ID: <code>{view.id}</code>
              </span>
            </div>
          </div>
          {current ? (
            <span className={classNames(styles.statusBadge, styles[`status_${current}`])}>
              {STATUS_LABELS[current]}
            </span>
          ) : null}
        </section>

        {/* ===== Thông tin liên hệ ===== */}
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <UserIcon size={14} aria-hidden="true" /> Thông tin liên hệ
          </h4>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <Phone size={12} aria-hidden="true" /> Số điện thoại
              </span>
              <a href={`tel:${view.phone}`} className={styles.infoValueLink}>
                {view.phone}
              </a>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <Mail size={12} aria-hidden="true" /> Email
              </span>
              <a href={`mailto:${view.email}`} className={styles.infoValueLink}>
                {view.email}
              </a>
            </div>
          </div>
        </section>

        {/* ===== Lời nhắn ===== */}
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <MessageSquare size={14} aria-hidden="true" /> Lời nhắn
          </h4>
          <p className={styles.message}>{view.message}</p>
        </section>

        {/* ===== Thời gian ===== */}
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>
            <Calendar size={14} aria-hidden="true" /> Thời gian
          </h4>
          <div className={styles.timeGrid}>
            <div>
              <span className={styles.timeLabel}>Gửi lúc</span>
              <span className={styles.timeValue}>{formatDateTime(view.createdAt)}</span>
            </div>
            <div>
              <span className={styles.timeLabel}>Cập nhật</span>
              <span className={styles.timeValue}>{formatDateTime(view.updatedAt)}</span>
            </div>
          </div>
        </section>

        {/* ===== Đổi trạng thái (inline) ===== */}
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>Đổi trạng thái</h4>
          <div className={styles.statusControl}>
            <select
              value={pendingStatus ?? current ?? "NEW"}
              onChange={(e) => setPendingStatus(e.target.value as ContactStatus)}
              className={styles.statusSelect}
              disabled={savingStatus || deleting}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Save size={14} />}
              onClick={handleSaveStatus}
              disabled={!dirty || savingStatus}
              isLoading={savingStatus}
              loadingText="Đang lưu..."
            >
              Lưu trạng thái
            </Button>
          </div>
          {!dirty && pendingStatus === null ? (
            <p className={styles.helper}>Chọn trạng thái mới rồi nhấn Lưu.</p>
          ) : null}
          {loading && !detail ? (
            <p className={styles.loadingHint}>Đang tải chi tiết...</p>
          ) : null}
        </section>
      </div>

      <div className={styles.actions}>
        <Button
          variant="danger"
          size="md"
          leftIcon={<Trash2 size={14} />}
          onClick={() => setConfirmDeleteOpen(true)}
          disabled={savingStatus || deleting}
          isLoading={deleting}
          loadingText="Đang xoá..."
        >
          Xoá (đưa vào thùng rác)
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>

      {/* Confirm delete (modal phụ — dùng pattern ConfirmDialog) */}
      {confirmDeleteOpen ? (
        <div
          className={styles.confirmOverlay}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setConfirmDeleteOpen(false);
          }}
        >
          <div
            className={styles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
          >
            <h3 id="confirm-delete-title" className={styles.confirmTitle}>
              Xoá yêu cầu tư vấn?
            </h3>
            <p className={styles.confirmMessage}>
              Yêu cầu của <b>{view.fullName}</b> sẽ chuyển vào Thùng rác. Bạn có thể
              khôi phục lại sau khi xoá.
            </p>
            <div className={styles.confirmActions}>
              <Button
                variant="secondary"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
              >
                Huỷ
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                isLoading={deleting}
                loadingText="Đang xoá..."
              >
                Xoá
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
