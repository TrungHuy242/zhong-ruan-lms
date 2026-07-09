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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Response BE trả cho GET /admin/users (server-side pagination). */
export interface PaginatedUsers {
  users: User[];
  pagination: PaginationMeta;
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
  /** Tìm chung theo fullName + email (alias `keyword` cũng được BE chấp nhận). */
  search?: string;
  /** Tìm riêng theo fullName (mới). */
  name?: string;
  /** Tìm riêng theo email (mới). */
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  /** Số user mỗi trang (default 10; BE chấp nhận 10/20/50). */
  limit?: 10 | 20 | 50;
  /** Trang hiện tại (1-indexed, default 1). */
  page?: number;
  /** Field để sort (default createdAt). */
  sortBy?: "fullName" | "email" | "role" | "status" | "createdAt";
  /** asc | desc (default desc). */
  sortOrder?: "asc" | "desc";
  /**
   * Đặt `true` nếu muốn bao gồm cả user đã bị soft-delete (mặc định BE ẩn).
   * Tương ứng ?includeDeleted=true.
   */
  includeDeleted?: boolean;
}
