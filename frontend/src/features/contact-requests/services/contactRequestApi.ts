/**
 * contactRequestApi — giao tiếp với backend cho module ContactRequest (Admin).
 *
 * Endpoints (BE):
 *   - GET    /admin/contact-requests : list có search/status/pagination/sort
 *   - GET    /admin/contact-requests/:id : chi tiết
 *   - PATCH  /admin/contact-requests/:id/status : đổi status { status }
 *   - DELETE /admin/contact-requests/:id : soft-delete (chuyển vào thùng rác)
 *   - POST   /admin/contact-requests/:id/restore : khôi phục
 *   - DELETE /admin/contact-requests/:id/force : xoá cứng
 *
 * Pattern: tương tự pricingApi — list trả { message, data: { contacts, pagination, stats } },
 * get/update trả { message, data: { contact } }. apiFetch tự unwrap `data` nên
 * chỉ cần quan tâm shape bên trong.
 */

import { apiFetch } from "../../../shared/api";

export type ContactStatus = "NEW" | "CONTACTED" | "CLOSED";

export interface ContactRequest {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deletedById: string | null;
}

export interface ContactRequestStats {
  byStatus: {
    NEW: number;
    CONTACTED: number;
    CLOSED: number;
  };
}

export interface ContactRequestPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListContactRequestsParams {
  page?: number;
  limit?: number;
  sortBy?: "fullName" | "email" | "phone" | "status" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: ContactStatus | "ALL";
  /** BE hỗ trợ includeDeleted=true|false (mặc định false → chỉ list chưa xoá). */
  includeDeleted?: boolean;
}

export interface PaginatedContactRequests {
  contacts: ContactRequest[];
  pagination: ContactRequestPagination;
  stats: ContactRequestStats;
}

export const CONTACT_REQUEST_PAGE_SIZE = 20;

/**
 * GET /admin/contact-requests — list có search/status/pagination/sort.
 * Mặc định chỉ trả về record chưa xoá mềm; truyền includeDeleted=true nếu cần
 * cả những record đã chuyển vào thùng rác.
 */
export async function listContactRequests(
  params: ListContactRequestsParams = {}
): Promise<PaginatedContactRequests> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("keyword", params.search);
  if (params.status && params.status !== "ALL") qs.set("status", params.status);
  if (params.includeDeleted) qs.set("includeDeleted", "true");
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.page) qs.set("page", String(params.page));
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);

  const path = `/admin/contact-requests${qs.toString() ? `?${qs}` : ""}`;
  const data = await apiFetch<PaginatedContactRequests>(path);
  if (!data || !Array.isArray(data.contacts)) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data;
}

/** GET /admin/contact-requests/:id — chi tiết 1 contact request. */
export async function getContactRequest(id: string): Promise<ContactRequest> {
  const data = await apiFetch<{ contact: ContactRequest }>(
    `/admin/contact-requests/${id}`
  );
  if (!data?.contact) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.contact;
}

/**
 * PATCH /admin/contact-requests/:id/status — đổi trạng thái.
 *
 * @returns record sau khi cập nhật.
 */
export async function updateContactRequestStatus(
  id: string,
  status: ContactStatus
): Promise<ContactRequest> {
  const data = await apiFetch<{ contact: ContactRequest }>(
    `/admin/contact-requests/${id}/status`,
    {
      method: "PATCH",
      body: { status },
    }
  );
  if (!data?.contact) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.contact;
}

/** DELETE /admin/contact-requests/:id — soft-delete (chuyển vào thùng rác). */
export async function deleteContactRequest(
  id: string
): Promise<{ id: string; fullName?: string; deletedAt?: string | null }> {
  return apiFetch(`/admin/contact-requests/${id}`, { method: "DELETE" });
}

/** POST /admin/contact-requests/:id/restore — khôi phục (nếu bị soft-delete). */
export async function restoreContactRequest(
  id: string
): Promise<{ id: string; fullName?: string }> {
  return apiFetch(`/admin/contact-requests/${id}/restore`, { method: "POST" });
}

/** DELETE /admin/contact-requests/:id/force — xoá cứng (cẩn thận). */
export async function forceDeleteContactRequest(
  id: string
): Promise<{ id: string; hardDeleted: boolean }> {
  return apiFetch(`/admin/contact-requests/${id}/force`, { method: "DELETE" });
}

export const STATUS_LABELS: Record<ContactStatus, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  CLOSED: "Đã đóng",
};
