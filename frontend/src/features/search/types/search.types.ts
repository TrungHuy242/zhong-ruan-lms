/**
 * search.types — type/interface dùng riêng cho feature search.
 */

import type { UserRole, UserStatus } from "../../users/types/user.types";

export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | (string & {});

export interface SearchUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface SearchNotification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface SearchFile {
  id: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedById: number;
  createdAt: string;
}

export interface SearchPaged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchResult {
  keyword: string;
  type: SearchType;
  users?: SearchPaged<SearchUser>;
  notifications?: SearchPaged<SearchNotification>;
  files?: SearchPaged<SearchFile>;
}

export interface SearchParams {
  keyword: string;
  type?: SearchType;
  page?: number;
  limit?: number;
}

export const SEARCH_TYPES = [
  "all",
  "users",
  "notifications",
  "files",
] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];
