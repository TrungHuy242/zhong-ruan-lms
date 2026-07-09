/**
 * userApi — tầng giao tiếp với backend cho module User Management.
 *
 * Server-side pagination (BE từ commit này đã hỗ trợ):
 *   - list: trả { users: User[], pagination: { page, limit, total, totalPages } }
 *     Toàn bộ search/filter/sort/pagination được BE xử lý qua query string,
 *     FE chỉ truyền tham số và đọc kết quả.
 *
 * Response contract cho các endpoint khác (giữ nguyên từ trước):
 *   - create: trả User.
 *   - update: trả User.
 *   - delete: trả { id, email, deletedAt }.
 *   - restore: trả { id, email, deletedAt }.
 *   - getById: trả User (kèm updatedAt, không có deletedAt).
 */

import { apiFetch } from "../../../shared/api";
import type {
  CreateUserPayload,
  ListUsersParams,
  PaginatedUsers,
  UpdateUserPayload,
  User,
  UserStatus,
} from "../types/user.types";

export type {
  CreateUserPayload,
  ListUsersParams,
  PaginatedUsers,
  UpdateUserPayload,
  User,
  UserRole,
  UserStatus,
} from "../types/user.types";
export { USER_PAGE_SIZE, USER_ROLE_LABELS, USER_STATUS_LABELS } from "../constants/user.constants";

/**
 * Lấy danh sách user có phân trang từ server.
 * BE sẽ tự filter theo search/name/email/role/status và sort theo sortBy/sortOrder.
 */
export async function listUsers(
  params: ListUsersParams & { page?: number } = {}
): Promise<PaginatedUsers> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("keyword", params.search);
  if (params.name) qs.set("name", params.name);
  if (params.email) qs.set("email", params.email);
  if (params.role) qs.set("role", params.role);
  if (params.status) qs.set("status", params.status);
  if (params.includeDeleted) qs.set("includeDeleted", "true");
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.page) qs.set("page", String(params.page));
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);

  const path = `/admin/users${qs.toString() ? `?${qs}` : ""}`;
  // apiFetch unwrap field `data` mặc định → ta nhận { users, pagination }
  const data = await apiFetch<PaginatedUsers>(path);
  if (!data || !Array.isArray(data.users)) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data;
}

/**
 * Bulk soft-delete nhiều user. DELETE /admin/users/bulk
 */
export async function bulkDeleteUsers(
  ids: Array<string | number>
): Promise<{ deletedCount: number; deletedIds: Array<string | number> }> {
  return apiFetch(`/admin/users/bulk`, {
    method: "DELETE",
    body: { ids },
  });
}

/**
 * Bulk đổi status nhiều user. PATCH /admin/users/bulk-status
 */
export async function bulkUpdateStatus(
  ids: Array<string | number>,
  status: UserStatus
): Promise<{ updatedCount: number; updatedIds: Array<string | number> }> {
  return apiFetch(`/admin/users/bulk-status`, {
    method: "PATCH",
    body: { ids, status },
  });
}

/**
 * Tạo user mới. POST /users.
 * BE nhận các field: fullName, email, phone, password, role (UPPERCASE).
 */
export async function createUser(payload: CreateUserPayload): Promise<User> {
  const data = await apiFetch<{ user: User }>("/admin/users", {
    method: "POST",
    body: payload,
  });
  if (!data || !data.user) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.user;
}

/**
 * Cập nhật user. PUT /admin/users/:id.
 */
export async function updateUser(
  id: string | number,
  payload: UpdateUserPayload
): Promise<User> {
  const data = await apiFetch<{ user: User }>(`/admin/users/${id}`, {
    method: "PUT",
    body: payload,
  });
  if (!data || !data.user) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.user;
}

/**
 * Lấy chi tiết user. GET /admin/users/:id.
 */
export async function getUser(id: string | number): Promise<User> {
  const data = await apiFetch<{ user: User }>(`/admin/users/${id}`);
  if (!data || !data.user) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.user;
}

/**
 * Xoá mềm user. DELETE /admin/users/:id.
 * Idempotent — nếu user đã bị xoá thì BE trả alreadyDeleted.
 */
export async function deleteUser(
  id: string | number
): Promise<{ id: number | string; email: string; deletedAt: string; alreadyDeleted?: boolean }> {
  return apiFetch(`/admin/users/${id}`, { method: "DELETE" });
}

/**
 * Khôi phục user đã bị soft-delete. POST /admin/users/:id/restore.
 */
export async function restoreUser(
  id: string | number
): Promise<{ id: number | string; email: string; deletedAt: string | null }> {
  return apiFetch(`/admin/users/${id}/restore`, { method: "POST" });
}
