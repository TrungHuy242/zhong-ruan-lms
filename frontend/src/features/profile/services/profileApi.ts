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

import { apiFetch } from "../../../shared/api";
import type {
  ChangePasswordPayload,
  ProfileUser,
  UpdateProfilePayload,
} from "../types/profile.types";

export type {
  ChangePasswordPayload,
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
