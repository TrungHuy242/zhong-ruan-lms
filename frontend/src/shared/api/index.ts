/**
 * apiFetch — helper gọi HTTP tới backend.
 * - Đọc base URL từ import.meta.env.VITE_API_BASE_URL (fallback "/api").
 * - Tự gắn Authorization header nếu có token.
 * - Tự parse JSON body và unwrap `data` field nếu có.
 * - Throw ApiError { status, message } với message lấy từ body.message của BE.
 */

import { authStorage } from "../storage/authStorage";

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
// Bỏ slash cuối để ghép path không sinh "//".
const BASE_URL = RAW_BASE.replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  // Có thể truyền token riêng (VD refresh-token flow); mặc định lấy từ authStorage.
  accessToken?: string | null;
  // Bỏ unwrap `data` field (cho endpoint thật không có data wrapper).
  raw?: boolean;
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildHeaders(
  init: HeadersInit | undefined,
  accessToken: string | null
): Headers {
  const headers = new Headers(init);
  if (!headers.has("Content-Type") && !(init && hasFormDataBody(init))) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return headers;
}

// Trick nhỏ: phát hiện FormData body thông qua RequestInit (một số caller).
// Vì HeadersInit không chứa body, ta xử lý riêng biến `body` ở ngoài.
function hasFormDataBody(_init: HeadersInit | undefined): boolean {
  return false;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { body, accessToken, raw, headers, ...rest } = options;

  const token = accessToken ?? authStorage.getAccessToken();
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const finalHeaders = buildHeaders(headers as HeadersInit | undefined, token);

  let finalBody: BodyInit | undefined;
  if (body === undefined) {
    finalBody = undefined;
  } else if (body instanceof FormData) {
    finalBody = body;
  } else if (typeof body === "string") {
    finalBody = body;
  } else {
    finalBody = JSON.stringify(body);
  }

  // Nếu là FormData thì bỏ Content-Type để trình duyệt tự set multipart boundary.
  if (body instanceof FormData) {
    finalHeaders.delete("Content-Type");
  }

  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  });

  const payload = await parseJsonSafe(res);

  if (!res.ok) {
    const obj = (payload ?? {}) as { message?: string };
    const message =
      (typeof obj.message === "string" && obj.message) ||
      `Yêu cầu thất bại (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }

  if (raw) {
    return payload as T;
  }
  // Unwrap { data: ... } nếu có.
  if (
    payload &&
    typeof payload === "object" &&
    "data" in (payload as Record<string, unknown>)
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
