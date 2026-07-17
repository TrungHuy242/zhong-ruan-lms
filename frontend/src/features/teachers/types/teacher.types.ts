/**
 * teacher.types — type/interface dùng riêng cho feature teachers (admin).
 *
 * Mapping theo schema Prisma `Teacher`:
 *   - id: String UUID
 *   - fullName, slug, title, bio, bioShort
 *   - avatarUrl: nullable string (URL public — /uploads/<storedName>)
 *   - yearsOfExperience: Int? (năm kinh nghiệm)
 *   - specialties: String[] (chuyên môn: ["HSK 4-6", "Luyện thi", ...])
 *   - isFeatured, isPublished, displayOrder
 *   - createdAt, updatedAt, deletedAt (soft delete)
 */

export interface Teacher {
  id: string;
  fullName: string;
  slug: string;
  title: string;
  bio: string;
  bioShort: string;
  avatarUrl: string | null;
  yearsOfExperience: number | null;
  specialties: string[];
  isFeatured: boolean;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt?: string;
  /** List endpoint trả kèm deletedAt; detail thì không. Optional. */
  deletedAt?: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Response BE trả cho GET /admin/teachers. */
export interface PaginatedTeachers {
  teachers: Teacher[];
  pagination: PaginationMeta;
}

/** Sortable keys (whitelist — map sang field name của BE). */
export type TeacherSortBy =
  | "fullName"
  | "title"
  | "isFeatured"
  | "isPublished"
  | "displayOrder"
  | "createdAt"
  | "updatedAt";

export type SortOrder = "asc" | "desc";

export interface TeacherAdvancedFilterValues {
  /** Tìm riêng theo fullName (mới). */
  fullName: string;
  /** Tìm riêng theo title (chức danh). */
  title: string;
  /** Lọc theo trạng thái nổi bật. */
  isFeatured: "ALL" | "true" | "false";
  /** Lọc theo trạng thái xuất bản. */
  isPublished: "ALL" | "true" | "false";
}

export const EMPTY_TEACHER_ADVANCED_FILTERS: TeacherAdvancedFilterValues = {
  fullName: "",
  title: "",
  isFeatured: "ALL",
  isPublished: "ALL",
};

export interface ListTeachersParams {
  /** Tìm chung theo fullName/slug/title (alias `keyword` cũng được BE chấp nhận). */
  search?: string;
  /** Tìm riêng theo fullName. */
  fullName?: string;
  /** Tìm riêng theo title. */
  title?: string;
  /** Lọc theo isFeatured (string boolean vì BE parse). */
  isFeatured?: "true" | "false";
  /** Lọc theo isPublished. */
  isPublished?: "true" | "false";
  /** Số teacher mỗi trang (default 10; BE chấp nhận 10/20/50). */
  limit?: 10 | 20 | 50;
  /** Trang hiện tại (1-indexed, default 1). */
  page?: number;
  /** Field để sort (default displayOrder). */
  sortBy?: TeacherSortBy;
  /** asc | desc (default desc). */
  sortOrder?: SortOrder;
  /** Bao gồm cả teacher đã bị soft-delete. */
  includeDeleted?: boolean;
}

export interface CreateTeacherPayload {
  fullName: string;
  /** Optional — nếu không truyền BE tự sinh từ fullName. */
  slug?: string;
  title: string;
  bioShort: string;
  bio: string;
  avatarUrl?: string | null;
  yearsOfExperience?: number | null;
  specialties: string[];
  isFeatured: boolean;
  isPublished: boolean;
  displayOrder: number;
}

export interface UpdateTeacherPayload {
  fullName?: string;
  slug?: string | null;
  title?: string;
  bioShort?: string;
  bio?: string;
  avatarUrl?: string | null;
  yearsOfExperience?: number | null;
  specialties?: string[];
  isFeatured?: boolean;
  isPublished?: boolean;
  displayOrder?: number;
}

/** Kết quả xoá/khôi phục trả về từ BE. */
export interface TeacherMutationResult {
  id: string;
  fullName: string;
  deletedAt: string | null;
  alreadyDeleted?: boolean;
}

export interface BulkDeleteTeachersResult {
  deletedCount: number;
  deletedIds: string[];
}