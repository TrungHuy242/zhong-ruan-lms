/**
 * profileApi — giao tiếp backend cho module Hồ sơ cá nhân.
 *
 * Endpoints thật (profile.routes.js):
 *   - GET    /auth/me                        : trả { data: { user: {id, fullName, email, phone, role, status, avatarFile} } }
 *   - PUT    /auth/me                        : cập nhật fullName (required), phone (optional)
 *   - PUT    /auth/change-password           : { oldPassword, newPassword }
 *   - POST   /auth/me/avatar    (multipart)  : upload avatar (field name = "file")
 *   - DELETE /auth/me/avatar                 : xoá avatar
 *   - GET    /auth/me/login-history?limit=10 : 10 lần LOGIN/LOGOUT gần nhất
 *
 * BE validation:
 *   - updateProfile: fullName.trim() không được rỗng
 *   - changePassword: newPassword.length >= 6, phải khác oldPassword, oldPassword đúng
 *   - uploadAvatar: mime jpg/png/webp, BE đã filter qua multer fileFilter
 *
 * Public avatar URL: BE serve static ở /uploads/<storedName>. FE tự build URL này.
 */

import { apiFetch } from "../../../shared/api";
import type {
  ChangePasswordPayload,
  LoginHistoryEntry,
  ProfileUser,
  UpdateProfilePayload,
} from "../types/profile.types";

export type {
  ChangePasswordPayload,
  LoginHistoryAction,
  LoginHistoryEntry,
  ProfileAvatarFile,
  ProfileUser,
  ProfileValidationResult,
  UpdateProfilePayload,
  UserRole,
  UserStatus,
} from "../types/profile.types";
export {
  FULL_NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  validateFullName,
  validatePassword,
  validatePhone,
} from "../constants/profile.constants";

interface MeResponse {
  user: ProfileUser;
}

interface UpdateMeResponse {
  user: ProfileUser;
}

interface LoginHistoryResponse {
  items: LoginHistoryEntry[];
  total: number;
}

// ===== URL helper =====
//
// BE serve static files ở /uploads/<storedName> (mount ở app.js). Tái sử dụng cùng base
// với API (VITE_API_BASE_URL — fallback "/api") nhưng thay prefix /api -> rỗng.
// Ví dụ: VITE_API_BASE_URL="/api" + path "/uploads/abc.png" => "/uploads/abc.png".
// Nếu BE đặt API ở domain khác, vẫn cùng origin cho static nên dùng window.location.origin.
export function getAvatarUrl(storedName: string | null | undefined): string | null {
  if (!storedName) return null;
  // Hard-code path /uploads/ — độc lập với API base.
  return `/uploads/${storedName}`;
}

// ===== GET /auth/me =====
export async function getMe(): Promise<ProfileUser> {
  const response = await apiFetch<MeResponse>("/auth/me");
  if (!response?.user) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return response.user;
}

// ===== PUT /auth/me =====
export async function updateMe(
  payload: UpdateProfilePayload
): Promise<ProfileUser> {
  const response = await apiFetch<UpdateMeResponse>("/auth/me", {
    method: "PUT",
    body: {
      fullName: payload.fullName.trim(),
      phone: payload.phone === undefined ? undefined : payload.phone ?? null,
    },
  });
  if (!response?.user) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return response.user;
}

// ===== PUT /auth/change-password =====
export async function changePassword(
  payload: ChangePasswordPayload
): Promise<void> {
  await apiFetch("/auth/change-password", {
    method: "PUT",
    body: {
      oldPassword: payload.oldPassword,
      newPassword: payload.newPassword,
    },
  });
}

// ===== POST /auth/me/avatar =====
/**
 * Upload avatar.
 *
 * Trả về ProfileUser đã được cập nhật (kèm avatarFile mới). Caller cập nhật state
 * + đồng bộ authStorage.user nếu cần.
 *
 * Dùng XMLHttpRequest để có onUploadProgress chính xác.
 */
export interface UploadAvatarOptions {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export function uploadAvatar(
  file: File,
  opts: UploadAvatarOptions = {}
): Promise<ProfileUser> {
  const { onProgress, signal } = opts;
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file, file.name);

    const xhr = new XMLHttpRequest();
    const RAW_BASE =
      (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";
    xhr.open("POST", `${RAW_BASE.replace(/\/$/, "")}/auth/me/avatar`);

    // Tự lấy token từ authStorage (giống apiFetch).
    // Avoid importing util nặng — duplicate logic nhỏ ở đây cho gọn.
    let token: string | null = null;
    try {
      const sessionJson = localStorage.getItem("zrlms_session");
      if (sessionJson) {
        const session = JSON.parse(sessionJson) as { accessToken?: string };
        token = session.accessToken ?? null;
      }
    } catch {
      token = null;
    }
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    // KHÔNG set Content-Type — trình duyệt tự thêm multipart boundary.

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return;
      if (e.lengthComputable && e.total > 0) {
        const pct = Math.min(100, Math.round((e.loaded / e.total) * 100));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          const user = data?.data?.user ?? data?.user;
          if (!user) throw new Error("Phản hồi không hợp lệ");
          resolve(user as ProfileUser);
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Phản hồi không hợp lệ"));
        }
      } else {
        // Parse error JSON
        let msg = `Yêu cầu thất bại (${xhr.status})`;
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          if (typeof data?.message === "string") msg = data.message;
        } catch {
          // ignore
        }
        const err = new Error(msg);
        (err as Error & { status?: number }).status = xhr.status;
        reject(err);
      }
    };

    xhr.onerror = () => reject(new Error("Lỗi mạng — không upload được"));
    xhr.onabort = () => reject(new Error("Upload bị huỷ"));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort());
    }

    xhr.send(form);
  });
}

// ===== DELETE /auth/me/avatar =====
export async function removeAvatar(): Promise<ProfileUser> {
  const response = await apiFetch<MeResponse>("/auth/me/avatar", {
    method: "DELETE",
  });
  if (!response?.user) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return response.user;
}

// ===== GET /auth/me/login-history =====
export async function getLoginHistory(
  limit = 10
): Promise<LoginHistoryEntry[]> {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit) || 10));
  const response = await apiFetch<LoginHistoryResponse>(
    `/auth/me/login-history?limit=${safeLimit}`
  );
  return Array.isArray(response?.items) ? response.items : [];
}