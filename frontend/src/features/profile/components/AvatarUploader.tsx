/**
 * AvatarUploader — UI cho upload/đổi/xoá avatar.
 *
 * Click vào avatar hiện tại hoặc nút "Đổi ảnh" → mở file picker (chỉ chấp nhận ảnh).
 * Hiển thị progress % trong lúc upload. Khi upload thành công:
 *   - gọi onChange(newProfile) để parent cập nhật state.
 *   - hiển thị preview ảnh mới qua getAvatarUrl.
 *
 * Không dùng modal — preview inline. Nút "Xoá" riêng chỉ hiện khi đã có avatar.
 *
 * Permission: chỉ user tự upload/xoá avatar của mình (BE enforce qua req.user.id).
 */

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Camera,
  Loader2,
  Trash2,
  UploadCloud,
  User as UserIcon,
} from "lucide-react";
import {
  ApiError,
} from "../../../shared/api";
import { Button } from "../../../shared/components/ui";
import {
  getAvatarUrl,
  removeAvatar,
  uploadAvatar,
  type ProfileUser,
} from "../services/profileApi";
import styles from "./AvatarUploader.module.css";

export interface AvatarUploaderProps {
  user: ProfileUser;
  /** Được gọi với ProfileUser mới sau khi upload/remove thành công. */
  onChange: (updated: ProfileUser) => void;
  /** Được gọi khi user nhấn "Đổi ảnh"/xoá — parent hiển thị toast/alert. */
  onMessage?: (type: "success" | "error", text: string) => void;
}

// Giới hạn mime + size để validate phía client (BE cũng filter,
// nhưng check sớm ở client giúp UX tốt hơn).
const ACCEPT_MIME = "image/jpeg,image/jpg,image/png,image/webp";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB (BE limit 10MB, FE giới hạn nhỏ hơn cho avatar)

export function AvatarUploader({ user, onChange, onMessage }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(() =>
    getAvatarUrl(user.avatarFile?.storedName)
  );

  // Đồng bộ preview khi user prop thay đổi (parent state).
  useEffect(() => {
    setPreviewUrl(getAvatarUrl(user.avatarFile?.storedName));
  }, [user.avatarFile?.storedName]);

  // Cleanup object URL khi unmount hoặc đổi ảnh.
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function openFilePicker() {
    if (uploading || removing) return;
    inputRef.current?.click();
  }

  function validateFile(file: File): string | null {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return "Vui lòng chọn file ảnh (jpg, jpeg, png, webp).";
    }
    if (file.size > MAX_SIZE) {
      return `Kích thước ảnh tối đa ${(MAX_SIZE / 1024 / 1024).toFixed(0)}MB.`;
    }
    return null;
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset input để chọn lại cùng file nhiều lần vẫn trigger onChange.
    if (e.target) e.target.value = "";
    if (!file) return;
    const validateError = validateFile(file);
    if (validateError) {
      setError(validateError);
      return;
    }

    // Preview tạm thời trước khi upload xong (UX tốt hơn).
    const tempUrl = URL.createObjectURL(file);
    setPreviewUrl(tempUrl);
    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      const updated = await uploadAvatar(file, {
        onProgress: (pct) => setProgress(pct),
      });
      onChange(updated);
      // Sau khi upload xong, BE trả về avatarFile mới → useEffect cập nhật previewUrl.
      // Nhưng ta cần cleanup object URL tạm.
      if (tempUrl.startsWith("blob:")) URL.revokeObjectURL(tempUrl);
      onMessage?.("success", "Cập nhật ảnh đại diện thành công");
    } catch (err) {
      // Upload fail → rollback preview về avatar hiện tại.
      setPreviewUrl(getAvatarUrl(user.avatarFile?.storedName));
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Upload thất bại";
      setError(message);
      onMessage?.("error", message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleRemove() {
    if (!user.avatarFile || removing || uploading) return;
    const confirmed = window.confirm("Bạn có chắc muốn xoá ảnh đại diện?");
    if (!confirmed) return;

    setRemoving(true);
    setError(null);
    try {
      const updated = await removeAvatar();
      onChange(updated);
      onMessage?.("success", "Đã xoá ảnh đại diện");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Xoá thất bại";
      setError(message);
      onMessage?.("error", message);
    } finally {
      setRemoving(false);
    }
  }

  const hasAvatar = Boolean(previewUrl);
  const initials = (user.fullName || "?").trim().slice(0, 2).toUpperCase();

  return (
    <div className={styles.wrapper}>
      <div className={styles.avatarRow}>
        <div
          className={[
            styles.avatar,
            uploading || removing ? styles.avatarBusy : "",
          ].join(" ")}
          onClick={openFilePicker}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openFilePicker();
            }
          }}
          aria-label={hasAvatar ? "Đổi ảnh đại diện" : "Thêm ảnh đại diện"}
        >
          {hasAvatar ? (
            <img src={previewUrl!} alt="Ảnh đại diện" className={styles.img} />
          ) : (
            <span className={styles.initials}>
              {initials || <UserIcon size={28} aria-hidden="true" />}
            </span>
          )}

          {/* Overlay: camera icon khi hover */}
          <div className={styles.overlay} aria-hidden="true">
            {uploading ? (
              <Loader2 size={28} className={styles.spin} />
            ) : (
              <Camera size={28} />
            )}
          </div>

          {/* Progress ring */}
          {uploading && progress > 0 && progress < 100 ? (
            <div className={styles.progressRing} aria-hidden="true">
              <span className={styles.progressText}>{progress}%</span>
            </div>
          ) : null}
        </div>

        <div className={styles.controls}>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_MIME}
            onChange={handleFileChange}
            className={styles.fileInput}
            aria-hidden="true"
            tabIndex={-1}
          />

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<UploadCloud size={16} />}
            onClick={openFilePicker}
            disabled={uploading || removing}
            isLoading={uploading}
            loadingText="Đang tải lên..."
          >
            {hasAvatar ? "Đổi ảnh" : "Tải ảnh lên"}
          </Button>

          {user.avatarFile ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 size={16} />}
              onClick={handleRemove}
              disabled={uploading || removing}
              isLoading={removing}
              loadingText="Đang xoá..."
              className={styles.removeBtn}
            >
              Xoá
            </Button>
          ) : null}

          <p className={styles.hint}>
            Chấp nhận JPG, PNG, WEBP. Tối đa {(MAX_SIZE / 1024 / 1024).toFixed(0)}MB.
            Chỉ bạn mới có thể thay đổi ảnh đại diện của mình.
          </p>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}