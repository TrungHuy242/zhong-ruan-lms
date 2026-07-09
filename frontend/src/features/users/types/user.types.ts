/**
 * user.types — type/interface dùng riêng cho feature users.
 */

export type UserRole = "ADMIN" | "TEACHER" | "STUDENT";
/** Status mà BE lưu (enum UserStatus). INACTIVE hiện không hiển thị trên UI. */
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface User {
  id: number | string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  /** List endpoint trả kèm deletedAt; detail thì không. Optional. */
  deletedAt?: string | null;
  /** Chỉ có trên detail. */
  updatedAt?: string;
}

export interface PaginatedUsers {
  users: User[];
  total: number;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  /**
   * Status BE nhận là chữ HOA enum (ACTIVE/INACTIVE/SUSPENDED).
   * Mặc định FE không cho phép đổi status từ UI (tính năng khoá/mở khoá
   * được xử lý ở màn riêng) — nhưng vẫn cho phép kèm field này.
   */
  status?: UserStatus;
}

export interface ListUsersParams {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  /**
   * Đặt `true` nếu muốn bao gồm cả user đã bị soft-delete (mặc định BE ẩn).
   * Tương ứng ?includeDeleted=true.
   */
  includeDeleted?: boolean;
}
