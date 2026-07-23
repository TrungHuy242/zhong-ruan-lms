/**
 * publicContactApi — giao tiếp với backend cho module ContactRequest (public).
 *
 * Endpoints (BE):
 *   - POST /public/contact-requests : người dùng gửi form liên hệ.
 *                                     → trả { message, data: { contact } }
 *
 * Endpoint này đã được backend rate-limit (3 req / IP / 1 giờ) nên FE
 * chỉ cần truyền đúng payload + hiển thị message lỗi từ BE khi bị chặn.
 */

import { apiFetch } from "../../../shared/api";

export interface PublicContactRequestPayload {
  fullName: string;
  phone: string;
  email: string;
  message: string;
}

export interface PublicContactRequestResponse {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  message: string;
  status: "NEW" | "CONTACTED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deletedById: string | null;
}

/**
 * POST /public/contact-requests — gửi form liên hệ.
 *
 * Trả về record contact vừa tạo. Lỗi (validate, rate-limit) sẽ
 * throw ApiError với message từ BE — caller hiển thị trực tiếp.
 */
export async function submitContactRequest(
  payload: PublicContactRequestPayload
): Promise<PublicContactRequestResponse> {
  const data = await apiFetch<{ contact: PublicContactRequestResponse }>(
    "/public/contact-requests",
    {
      method: "POST",
      body: payload,
    }
  );
  if (!data?.contact) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ");
  }
  return data.contact;
}
