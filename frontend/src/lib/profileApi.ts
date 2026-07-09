/**
 * profileApi — giao tiếp backend cho module Hồ sơ cá nhân.
 *
 * Endpoints thật (auth.routes.js):
 *   - GET  /auth/me       : trả { data: { user: {id, fullName, email, phone, role, status} } }
 *   - PUT  /auth/me       : cập nhật fullName (required), phone (optional)
 *   - PUT  /auth/change-password : { oldPassword, newPassword }
 *
 * BE validation:
 *   - updateProfile: fullName.trim() không được rỗng
 *   - changePassword: newPassword.length >= 6, phải khác oldPassword,
 *     oldPassword phải đúng (so với bcrypt hash trong DB)
 */

import { apiFetch } from "./api";

export type UserRole = "ADMIN" | "TEACHER" | "STUDENT";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface ProfileUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
}

interface MeResponse {
  user: ProfileUser;
}

interface UpdateMeResponse {
  user: ProfileUser;
}

export interface UpdateProfilePayload {
  fullName: string;
  /** Có thể truyền null để BE clear, hoặc bỏ qua nếu không đổi. */
  phone?: string | null;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export async function getMe(): Promise<ProfileUser> {
  const response = await apiFetch<MeResponse>("/auth/me");
  if (!response?.user) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return response.user;
}

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

// ============== Validation helpers (mirror BE) ==============

export const FULL_NAME_MAX = 100;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;
// Phone format rất tuỳ vùng — chỉ chấp nhận chữ số, khoảng trắng, +, -, độ dài hợp lý.
const PHONE_DIGITS_REGEX = /^[+0-9()\-\s]+$/;

export function validateFullName(raw: string): { ok: boolean; error?: string } {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: false, error: "Vui lòng nhập họ tên" };
  }
  if (raw.trim().length > FULL_NAME_MAX) {
    return { ok: false, error: `Họ tên không được dài quá ${FULL_NAME_MAX} ký tự` };
  }
  return { ok: true };
}

export function validatePhone(
  raw: string | null | undefined
): { ok: boolean; error?: string } {
  if (raw === undefined || raw === null || raw.trim() === "") return { ok: true };
  const value = raw.trim();
  // Cho phép chuỗi 7–20 ký tự, chỉ chứa số và các ký tự định dạng phổ biến.
  if (value.length > 20) {
    return { ok: false, error: "Số điện thoại không được dài quá 20 ký tự" };
  }
  if (!PHONE_DIGITS_REGEX.test(value)) {
    return {
      ok: false,
      error: "Số điện thoại chỉ được chứa chữ số, khoảng trắng và các ký tự +, -, (, )",
    };
  }
  // Phải có ít nhất 7 chữ số thực sự.
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length < 7) {
    return { ok: false, error: "Số điện thoại không hợp lệ" };
  }
  return { ok: true };
}

export function validatePassword(
  raw: string,
  options: { minLength?: number } = {}
): { ok: boolean; error?: string } {
  const min = options.minLength ?? PASSWORD_MIN;
  if (typeof raw !== "string" || raw.length === 0) {
    return { ok: false, error: "Mật khẩu không được để trống" };
  }
  if (raw.length < min) {
    return { ok: false, error: `Mật khẩu phải có ít nhất ${min} ký tự` };
  }
  if (raw.length > PASSWORD_MAX) {
    return { ok: false, error: `Mật khẩu không được dài quá ${PASSWORD_MAX} ký tự` };
  }
  return { ok: true };
}