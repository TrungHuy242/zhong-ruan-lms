/**
 * profile.types — type/interface dùng riêng cho feature profile.
 */

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

export interface UpdateProfilePayload {
  fullName: string;
  /** Có thể truyền null để BE clear, hoặc bỏ qua nếu không đổi. */
  phone?: string | null;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface ProfileValidationResult {
  ok: boolean;
  error?: string;
}
