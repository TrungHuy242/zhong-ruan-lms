/**
 * authApi — các API liên quan tới xác thực.
 * Trả về Promise<T> thuần (không throw ApiError đặc biệt cho login) — UI tự xử lý message.
 */

import { apiFetch } from "../../../shared/api";
import type { AuthUser } from "../../../shared/storage/authStorage";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/register", {
    method: "POST",
    body: payload,
  });
}
