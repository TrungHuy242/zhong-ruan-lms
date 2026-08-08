/**
 * testimonial.types — type/interface dùng riêng cho feature testimonials (admin).
 *
 * Mapping theo schema Prisma `Testimonial`:
 *   - id: String UUID
 *   - studentName, courseInfo, content, rating
 *   - avatarUrl: nullable string (URL public — /uploads/<storedName>)
 *   - source: nullable string (VD: "Facebook Messenger")
 *   - isFeatured, isPublished, displayOrder
 *   - createdAt, updatedAt, deletedAt (soft delete)
 */

export interface Testimonial {
  id: string;
  studentName: string;
  courseInfo: string | null;
  content: string;
  rating: number;
  avatarUrl: string | null;
  source: string | null;
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

/** Response BE trả cho GET /admin/testimonials. */
export interface PaginatedTestimonials {
  testimonials: Testimonial[];
  pagination: PaginationMeta;
}

/** Sortable keys (whitelist — map sang field name của BE). */
export type TestimonialSortBy =
  | "studentName"
  | "rating"
  | "displayOrder"
  | "createdAt"
  | "updatedAt";

export type SortOrder = "asc" | "desc";

export interface ListTestimonialsParams {
  /** Tìm chung theo studentName. */
  search?: string;
  /** Lọc theo isFeatured (string boolean vì BE parse). */
  isFeatured?: "true" | "false";
  /** Lọc theo isPublished. */
  isPublished?: "true" | "false";
  /** Số testimonial mỗi trang (default 20; BE chấp nhận 1-100). */
  limit?: number;
  /** Trang hiện tại (1-based). */
  page?: number;
  /** Field sort. */
  sortBy?: TestimonialSortBy;
  /** Chiều sort. */
  sortOrder?: SortOrder;
}

export interface CreateTestimonialPayload {
  studentName: string;
  courseInfo?: string | null;
  content: string;
  rating?: number;
  avatarUrl?: string | null;
  source?: string | null;
  isFeatured?: boolean;
  isPublished?: boolean;
  displayOrder?: number;
}

export interface UpdateTestimonialPayload {
  studentName?: string;
  courseInfo?: string | null;
  content?: string;
  rating?: number;
  avatarUrl?: string | null;
  source?: string | null;
  isFeatured?: boolean;
  isPublished?: boolean;
  displayOrder?: number;
}

export interface TestimonialMutationResult {
  id: string;
  deleted?: boolean;
  restored?: boolean;
  forceDeleted?: boolean;
}