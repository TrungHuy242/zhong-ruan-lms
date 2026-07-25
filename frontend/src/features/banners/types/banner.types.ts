/**
 * banner.types.ts — Shared types cho Banner module.
 */

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaText: string | null;
  ctaLink: string | null;
  badgeText: string | null;
  startDate: string | null;
  endDate: string | null;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export type BannerPayload = {
  title?: string;
  subtitle?: string | null;
  imageUrl?: string;
  ctaText?: string | null;
  ctaLink?: string | null;
  badgeText?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isPublished?: boolean;
  displayOrder?: number;
};

export type ListBannersParams = {
  page?: number;
  limit?: number;
  sortBy?: "displayOrder" | "createdAt" | "title" | "isPublished";
  sortDir?: "asc" | "desc";
};

export type PaginatedBanners = {
  banners: Banner[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type BannerMutationResult = {
  id: string;
  title: string;
};
