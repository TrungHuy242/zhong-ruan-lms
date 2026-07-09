import { Button, type ButtonVariant } from "./Button";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  message: React.ReactNode;
  /** Nhãn nút xác nhận. Mặc định "Xác nhận". */
  confirmText?: string;
  /** Nhãn nút huỷ. Mặc định "Huỷ". */
  cancelText?: string;
  /** Variant nút confirm; "danger" cho xoá, "primary" cho khôi phục. */
  confirmVariant?: ButtonVariant;
  /** Loading trên nút confirm khi API đang chạy. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Xác nhận",
  cancelText = "Huỷ",
  confirmVariant = "primary",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            isLoading={loading}
            loadingText={confirmText}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {message}
      </p>
    </Modal>
  );
}
