/**
 * authStorage — module duy nhất chịu trách nhiệm đọc/ghi/xoá token.
 * Không hard-code localStorage ở component khác.
 *
 * TODO: security — khi backend hỗ trợ set httpOnly cookie cho refresh token,
 * chuyển refreshToken sang đọc từ cookie (qua /api/auth/refresh) để giảm
 * rủi ro XSS đánh cắp token. Hiện tại cả 2 lưu localStorage vì BE chưa hỗ trợ.
 */

export type UserRole = "ADMIN" | "TEACHER" | "STUDENT";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const ACCESS_KEY = "zrlms_access_token";
const REFRESH_KEY = "zrlms_refresh_token";
const USER_KEY = "zrlms_user";

function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // localStorage có thể bị chặn (Safari private mode, iframe chặn...) — fail-soft.
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Có thể bị quota; im lặng — UI vẫn hoạt động trong session nhưng F5 sẽ mất state.
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const authStorage = {
  getAccessToken(): string | null {
    const value = safeRead(ACCESS_KEY);
    return value && value.length > 0 ? value : null;
  },

  getRefreshToken(): string | null {
    const value = safeRead(REFRESH_KEY);
    return value && value.length > 0 ? value : null;
  },

  getUser(): AuthUser | null {
    const raw = safeRead(USER_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (typeof parsed !== "object" || !parsed || !parsed.id) {
        safeRemove(USER_KEY);
        return null;
      }
      return parsed;
    } catch {
      safeRemove(USER_KEY);
      return null;
    }
  },

  setSession(session: AuthSession): void {
    safeWrite(ACCESS_KEY, session.accessToken);
    safeWrite(REFRESH_KEY, session.refreshToken);
    safeWrite(USER_KEY, JSON.stringify(session.user));
  },

  clear(): void {
    safeRemove(ACCESS_KEY);
    safeRemove(REFRESH_KEY);
    safeRemove(USER_KEY);
  },
};
