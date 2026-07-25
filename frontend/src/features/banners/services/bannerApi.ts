/**
 * bannerApi.ts — Admin API cho module Banners.
 *
 * Endpoints:
 *   GET    /admin/banners             — list có pagination/sort
 *   POST   /admin/banners             — tạo mới
 *   GET    /admin/banners/:id         — chi tiết
 *   PUT    /admin/banners/:id         — cập nhật
 *   DELETE /admin/banners/:id         — soft-delete
 *   POST   /admin/banners/:id/restore — restore
 *   DELETE /admin/banners/:id/permanent — force-delete
 */

import { apiFetch, type ApiError } from "../../../shared/api";

/** Build URL for a stored file (uploaded via /upload endpoint). */
function getFileUrl(storedName: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? "/api";
  return `${base.replace(/\/$/, "")}/uploads/${storedName}`;
}
import type {
  Banner,
  BannerPayload,
  ListBannersParams,
  PaginatedBanners,
} from "../types/banner.types";

export type { Banner, BannerPayload, ListBannersParams, PaginatedBanners };

/** Build CDN/ uploads URL cho banner image. */
export function getBannerImageUrl(storedName: string): string {
  return getFileUrl(storedName);
}

/** GET /admin/banners */
export async function listBanners(params: ListBannersParams = {}): Promise<PaginatedBanners> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortDir) qs.set("sortDir", params.sortDir);
  const query = qs.toString();
  const url = `/admin/banners${query ? `?${query}` : ""}`;
  // Backend trả thẳng { banners, pagination } — KHÔNG có wrapper { data }.
  // apiFetch đã auto-unwrap nếu có, nên payload thực = response gốc.
  return apiFetch<PaginatedBanners>(url);
}

/** GET /admin/banners/:id */
export async function getBannerById(id: string): Promise<Banner> {
  // Backend trả thẳng banner object — KHÔNG có wrapper.
  return apiFetch<Banner>(`/admin/banners/${id}`);
}

/** POST /admin/banners */
export async function createBanner(payload: BannerPayload): Promise<Banner> {
  // Backend trả thẳng banner object — KHÔNG có wrapper.
  return apiFetch<Banner>("/admin/banners", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
}

/** PUT /admin/banners/:id */
export async function updateBanner(id: string, payload: BannerPayload): Promise<Banner> {
  // Backend trả thẳng banner object — KHÔNG có wrapper.
  return apiFetch<Banner>(`/admin/banners/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
}

/** DELETE /admin/banners/:id */
export async function deleteBanner(id: string): Promise<void> {
  await apiFetch(`/admin/banners/${id}`, { method: "DELETE" });
}

/** POST /admin/banners/:id/restore */
export async function restoreBanner(id: string): Promise<{ id: string; restored: boolean }> {
  // Backend trả thẳng object — KHÔNG có wrapper.
  return apiFetch<{ id: string; restored: boolean }>(
    `/admin/banners/${id}/restore`,
    { method: "POST" }
  );
}

/** DELETE /admin/banners/:id/permanent */
export async function forceDeleteBanner(id: string): Promise<void> {
  await apiFetch(`/admin/banners/${id}/permanent`, { method: "DELETE" });
}

export { type ApiError };
