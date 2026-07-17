/**
 * teacherApi — giao tiếp với backend cho module Teacher (Admin).
 *
 * Endpoints (BE - backend/src/modules/teachers/):
 *   - GET    /admin/teachers       : list có search/filter/sort/pagination
 *                                    → trả { message, data: { teachers, pagination } }
 *   - POST   /admin/teachers       : tạo mới
 *                                    → trả { message, data: { teacher } }
 *   - GET    /admin/teachers/:id   : chi tiết
 *                                    → trả { message, data: { teacher } }
 *   - PUT    /admin/teachers/:id   : cập nhật (cũng dùng cho toggle publish nhanh)
 *   - DELETE /admin/teachers/:id   : soft-delete
 *   - POST   /admin/teachers/:id/restore : khôi phục từ thùng rác
 *   - DELETE /admin/teachers/:id/force   : hard-delete (vĩnh viễn)
 *
 * Toggle nhanh isPublished: tận dụng PUT với payload { isPublished } —
 * không thêm endpoint mới, BE update field độc lập OK.
 *
 * BE chưa có bulk delete endpoint riêng → mình sẽ gọi DELETE lặp trên
 * từng id (vì số lượng thường nhỏ, accept được). Nếu sau có bulk endpoint
 * thì chỉ cần đổi implementation, không phá interface.
 */

import { apiFetch, ApiError } from "../../../shared/api";
import {
  uploadFileRaw,
  type UploadFileRawOptions,
} from "../../files/services/fileApi";
import type {
  BulkDeleteTeachersResult,
  CreateTeacherPayload,
  ListTeachersParams,
  PaginatedTeachers,
  Teacher,
  TeacherMutationResult,
  UpdateTeacherPayload,
} from "../types/teacher.types";

export type {
  BulkDeleteTeachersResult,
  CreateTeacherPayload,
  ListTeachersParams,
  PaginatedTeachers,
  Teacher,
  TeacherMutationResult,
  TeacherAdvancedFilterValues,
  TeacherSortBy,
  UpdateTeacherPayload,
  SortOrder,
} from "../types/teacher.types";
export {
  EMPTY_TEACHER_ADVANCED_FILTERS,
} from "../types/teacher.types";
export {
  TEACHER_AVAILABLE_COLUMN_KEYS,
  TEACHER_LOCKED_COLUMN_KEYS,
  TEACHER_PAGE_SIZE,
  TEACHER_SORT_LABELS,
} from "../constants/teacher.constants";

// ===== URL helper =====
//
// BE serve static ở /uploads/<storedName>. Khi upload qua POST /upload
// (generic), response trả UploadedFile { storedName, ... } — FE tự build URL
// để hiển thị preview + lưu vào field avatarUrl.
export function getTeacherAvatarUrl(storedName: string | null | undefined): string | null {
  if (!storedName) return null;
  return `/uploads/${storedName}`;
}

/**
 * GET /admin/teachers — list có search/filter/sort/pagination server-side.
 *
 * BE parse query string theo cả `keyword`/`search` và field riêng (fullName/title).
 * Filter isFeatured/isPublished nhận "true"/"false".
 */
export async function listTeachers(
  params: ListTeachersParams = {}
): Promise<PaginatedTeachers> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("keyword", params.search);
  if (params.fullName) qs.set("fullName", params.fullName);
  if (params.title) qs.set("title", params.title);
  if (params.isFeatured) qs.set("isFeatured", params.isFeatured);
  if (params.isPublished) qs.set("isPublished", params.isPublished);
  if (params.includeDeleted) qs.set("includeDeleted", "true");
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.page) qs.set("page", String(params.page));
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);

  const path = `/admin/teachers${qs.toString() ? `?${qs}` : ""}`;
  const data = await apiFetch<PaginatedTeachers>(path);
  if (!data || !Array.isArray(data.teachers)) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data;
}

/**
 * POST /admin/teachers — tạo teacher mới.
 * BE nhận: fullName, slug?, title, bio, bioShort, avatarUrl?, yearsOfExperience?,
 *          specialties[], isFeatured, isPublished, displayOrder.
 */
export async function createTeacher(payload: CreateTeacherPayload): Promise<Teacher> {
  const data = await apiFetch<{ teacher: Teacher }>("/admin/teachers", {
    method: "POST",
    body: payload,
  });
  if (!data?.teacher) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.teacher;
}

/**
 * GET /admin/teachers/:id — chi tiết 1 teacher.
 */
export async function getTeacher(id: string): Promise<Teacher> {
  const data = await apiFetch<{ teacher: Teacher }>(`/admin/teachers/${id}`);
  if (!data?.teacher) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.teacher;
}

/**
 * GET /admin/teachers/teacher-users — danh sách user role=TEACHER (id + fullName + email)
 * cho dropdown "Liên kết tài khoản" trong TeacherFormModal.
 *
 * KHÔNG phân trang — chỉ dùng cho dropdown chọn nhanh, BE trả về tối đa vài chục user.
 */
export interface TeacherUserOption {
  id: number;
  fullName: string;
  email: string;
}

export async function listTeacherUserOptions(): Promise<TeacherUserOption[]> {
  const data = await apiFetch<{ users: TeacherUserOption[] }>(
    "/admin/teachers/teacher-users"
  );
  return Array.isArray(data?.users) ? data.users : [];
}

/**
 * PUT /admin/teachers/:id — cập nhật teacher. Partial payload OK (BE check undefined).
 *
 * Cũng dùng để toggle nhanh isPublished/featured: truyền field đó với giá trị mới.
 */
export async function updateTeacher(
  id: string,
  payload: UpdateTeacherPayload
): Promise<Teacher> {
  const data = await apiFetch<{ teacher: Teacher }>(`/admin/teachers/${id}`, {
    method: "PUT",
    body: payload,
  });
  if (!data?.teacher) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.teacher;
}

/**
 * Soft-delete 1 teacher. DELETE /admin/teachers/:id.
 * Idempotent — nếu đã xoá rồi BE trả alreadyDeleted.
 */
export async function deleteTeacher(id: string): Promise<TeacherMutationResult> {
  return apiFetch(`/admin/teachers/${id}`, { method: "DELETE" });
}

/**
 * Khôi phục teacher đã bị soft-delete. POST /admin/teachers/:id/restore.
 */
export async function restoreTeacher(id: string): Promise<TeacherMutationResult> {
  return apiFetch(`/admin/teachers/${id}/restore`, { method: "POST" });
}

/**
 * Hard-delete vĩnh viễn. DELETE /admin/teachers/:id/force.
 * Cẩn thận — không khôi phục được.
 */
export async function forceDeleteTeacher(
  id: string
): Promise<{ id: string; hardDeleted: boolean }> {
  return apiFetch(`/admin/teachers/${id}/force`, { method: "DELETE" });
}

/**
 * Bulk soft-delete — gọi DELETE tuần tự (BE chưa có bulk endpoint).
 *
 * Trả về tổng kết đã xoá + danh sách id đã xử lý thành công.
 * Throw ApiError nếu cả batch thất bại; trả về partial success nếu có 1 số ok.
 *
 * Lưu ý: nếu muốn transactional, cần bổ sung endpoint BE sau.
 */
export async function bulkDeleteTeachers(
  ids: string[]
): Promise<BulkDeleteTeachersResult> {
  const deletedIds: string[] = [];
  let lastError: ApiError | null = null;
  for (const id of ids) {
    try {
      await deleteTeacher(id);
      deletedIds.push(id);
    } catch (err) {
      if (err instanceof ApiError) {
        lastError = err;
        // Tiếp tục với id kế tiếp, không dừng cả batch
      } else {
        throw err;
      }
    }
  }
  if (deletedIds.length === 0 && lastError) {
    throw lastError;
  }
  return {
    deletedCount: deletedIds.length,
    deletedIds,
  };
}

/**
 * Upload file (ảnh đại diện giảng viên) qua API upload chung POST /upload.
 *
 * Trả về { storedName, url }. Caller lưu `url` vào field avatarUrl.
 *
 * Tận dụng `uploadFileRaw` từ fileApi (đã có progress chính xác qua XHR).
 */
export interface UploadTeacherAvatarOptions extends UploadFileRawOptions {}

export interface UploadedTeacherAvatar {
  storedName: string;
  url: string;
}

export async function uploadTeacherAvatar(
  file: File,
  opts: UploadTeacherAvatarOptions = {}
): Promise<UploadedTeacherAvatar> {
  const uploaded = await uploadFileRaw(file, opts);
  const url = getTeacherAvatarUrl(uploaded.storedName);
  if (!url) {
    throw new Error("Không lấy được URL ảnh sau khi upload");
  }
  return { storedName: uploaded.storedName, url };
}