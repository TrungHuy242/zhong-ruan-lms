/**
 * profile.types — type/interface dùng riêng cho feature profile.
 */

export type UserRole = "ADMIN" | "TEACHER" | "STUDENT";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

/**
 * Avatar file gắn với User.avatarFileId — BE trả về object này trong
 * ProfileUser, FE sẽ tự build URL public `/uploads/<storedName>`.
 */
export interface ProfileAvatarFile {
  id: number;
  storedName: string;
  originalName: string;
}

export interface ProfileUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  /** Null nếu user chưa upload avatar hoặc đã xoá. */
  avatarFile: ProfileAvatarFile | null;
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

/**
 * Một dòng trong "Lịch sử đăng nhập".
 * - action    : AUTH_LOGIN_SUCCESS | AUTH_LOGIN_FAIL | AUTH_LOGOUT_SUCCESS
 * - reason    : chỉ có khi LOGIN_FAIL — INVALID_CREDENTIALS / USER_SUSPENDED
 * - ip        : địa chỉ IP của client (có thể null khi gọi từ server job, ...)
 * - userAgent : trình duyệt / client string
 * - createdAt : ISO date string
 */
export type LoginHistoryAction =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAIL"
  | "AUTH_LOGOUT_SUCCESS";

export interface LoginHistoryEntry {
  id: number;
  action: LoginHistoryAction;
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}
