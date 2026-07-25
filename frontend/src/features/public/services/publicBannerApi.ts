/**
 * publicBannerApi.ts — Public API cho Banner (dùng cho Homepage carousel).
 */

import { apiFetch } from "../../../shared/api";
import type { Banner } from "../../banners/types/banner.types";

export async function getPublicBanners(): Promise<Banner[]> {
  const res = await apiFetch<{ banners: Banner[] }>("/public/banners");
  return res.banners ?? [];
}
