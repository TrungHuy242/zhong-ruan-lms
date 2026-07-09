/**
 * userApi — tầng giao tiếp với backend cho module User Management.
 *
 * Lưu ý quan trọng: backend hiện chưa hỗ trợ search/filter/pagination ở BE,
 * nên tham số phân trang và lọc ở các hàm list/search/filter được xử lý
 * hoàn toàn phía FE (lọc client, rồi phân trang kết quả). Khi BE mở rộng
 * thêm, chỉ cần chuyển các tham số này vào query string mà không phải sửa
 * chỗ gọi ở UI (giữ contract trả về PaginatedResult).
 *
 * Response contract:
 *   - list: trả { users: User[], total: number } (User có thêm deletedAt).
 *     Khi BE không phân trang ở server, FE lọc/phân trang rồi trả về
 *     { users, total } cho phù hợp shape mà UI dùng (UserManagementPage).
 *   - create: trả User.
 *   - update: trả User.
 *   - delete: trả { id, email, deletedAt }.
 *   - restore: trả { id, email, deletedAt }.
 *   - getById: trả User (kèm updatedAt, không có deletedAt).
 */

import { apiFetch } from "../../../shared/api";
import { USER_PAGE_SIZE } from "../constants/user.constants";
import type {
  CreateUserPayload,
  ListUsersParams,
  PaginatedUsers,
  UpdateUserPayload,
  User,
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

async function fetchAllUsers(params: ListUsersParams = {}): Promise<User[]> {
  const qs = new URLSearchParams();
  if (params.includeDeleted) qs.set("includeDeleted", "true");
  qs.set("limit", "9999"); // hint; BE hiện bỏ qua.
  // BE mount user router ở /api/admin/users — khớp với app.use trong app.js.
  const path = `/admin/users${qs.toString() ? `?${qs}` : ""}`;
  // BE trả { message, data: { users: [...] } }. apiFetch unwrap field `data`
  // mặc định nên ta nhận { users: User[] }.
  const data = await apiFetch<{ users: User[] }>(path);
  if (!data || !Array.isArray(data.users)) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.users;
}

/**
 * Loc/pagination client-side cho tới khi BE hỗ trợ.
 * Trả về đúng shape PaginatedUsers để UI dùng như server trả.
 */
async function listUsersServer(params: ListUsersParams & { page?: number }): Promise<PaginatedUsers> {
  const users = await fetchAllUsers(params);

  // Lọc client.
  let filtered = users;
  const search = (params.search ?? "").trim().toLowerCase();
  if (search) {
    filtered = filtered.filter(
      (u) =>
        u.fullName.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
    );
  }
  if (params.role) {
    filtered = filtered.filter((u) => u.role === params.role);
  }
  if (params.status) {
    filtered = filtered.filter((u) => u.status === params.status);
  }

  // Phân trang client.
  const total = filtered.length;
  const page = Math.max(1, params.page ?? 1);
  const start = (page - 1) * USER_PAGE_SIZE;
  const sliced = filtered.slice(start, start + USER_PAGE_SIZE);

  return { users: sliced, total };
}

export async function listUsers(
  params: ListUsersParams & { page?: number } = {}
): Promise<PaginatedUsers> {
  return listUsersServer(params);
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
