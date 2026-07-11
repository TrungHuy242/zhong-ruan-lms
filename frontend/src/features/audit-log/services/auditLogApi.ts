/**
 * auditLogApi — giao tiếp với backend cho module Audit Log.
 *
 * Endpoint: GET /api/admin/audit-logs          (list, chỉ Admin — BE đã enforce)
 * Endpoint: GET /api/admin/audit-logs/:id      (detail theo id — bổ sung ở bản nâng cấp)
 *
 * BE filter params (audit.controller.listAuditLogs):
 *   - userId    (number)
 *   - action    (string, exact match)
 *   - module    (string)              — match prefix của `target` (VD "User", "Auth")
 *   - from      (ISO date, inclusive) — vd "2026-07-01"
 *   - to        (ISO date, inclusive) — vd "2026-07-09"
 *   - search    (string)              — keyword search đa trường
 *   - page      (number)
 *   - pageSize  (number)
 *
 * Response shape:
 *   List  → { message, data: AuditLog[], pagination: {...} }
 *   Detail → { message, data: { log: AuditLog } }
 *
 * Vì các endpoint controller trả `pagination` ở **top-level** (không lẫn
 * trong `data`), FE dùng `raw: true` để `apiFetch` KHÔNG unwrap → giữ nguyên
 * cả response để đọc `response.data.items` + `response.pagination`.
 *
 * `meta` được redact ở BE (password / refreshToken / ...), không lộ field nhạy cảm.
 *
 * Sort: cố định `createdAt desc` ở BE. FE không cần truyền sort — đúng yêu cầu.
 */

import { apiFetch } from "../../../shared/api";
import {
  AUDIT_PAGE_SIZE,
  AUDIT_ACTION_BADGES,
  AUDIT_ACTION_LABELS,
  AUDIT_TONE_LABELS,
} from "../constants/audit.constants";
import type {
  AuditLog,
  AuditLogListParams,
  AuditLogListResult,
} from "../types/audit.types";
import type { AuditModule } from "../constants/audit.constants";

export type {
  AuditAction,
  AuditActionGroup,
  AuditLog,
  AuditLogActor,
  AuditLogListParams,
  AuditLogListResult,
  AuditModule,
} from "../types/audit.types";
export type { AuditActionTone } from "../constants/audit.constants";
export {
  AUDIT_ACTIONS,
  AUDIT_ACTION_BADGES,
  AUDIT_ACTION_GROUPS,
  AUDIT_ACTION_LABELS,
  AUDIT_GROUP_LABELS,
  AUDIT_MODULES,
  AUDIT_MODULE_LABELS,
  AUDIT_MODULE_ROUTE,
  AUDIT_PAGE_SIZE,
  AUDIT_TONE_LABELS,
} from "../constants/audit.constants";

/**
 * Lấy danh sách audit log phân trang + filter + search từ BE.
 * BE đã lo search keyword + filter; FE chỉ truyền tham số và nhận items đã paginate.
 */
export async function listAuditLogs(
  params: AuditLogListParams = {}
): Promise<AuditLogListResult> {
  const qs = new URLSearchParams();
  if (params.userId) qs.set("userId", String(params.userId));
  if (params.action) qs.set("action", String(params.action));
  if (params.module) qs.set("module", String(params.module));
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.search) qs.set("search", String(params.search));
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));

  const path = `/admin/audit-logs${qs.toString() ? `?${qs}` : ""}`;
  // BE trả `{ message, data: AuditLog[], pagination }` — pagination nằm
  // top-level bên ngoài `data`, nên dùng raw để apiFetch KHÔNG unwrap.
  const response = await apiFetch<{
    message?: string;
    data: AuditLog[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>(path, { raw: true });

  const items = response && Array.isArray(response.data) ? response.data : [];
  const pagination = response?.pagination ?? null;

  return {
    items,
    total: pagination?.total ?? 0,
    page: pagination?.page ?? 1,
    pageSize: pagination?.pageSize ?? AUDIT_PAGE_SIZE,
    totalPages:
      pagination?.totalPages ??
      Math.max(
        1,
        Math.ceil((pagination?.total ?? 0) / (pagination?.pageSize ?? AUDIT_PAGE_SIZE))
      ),
  };
}

/**
 * Lấy chi tiết 1 audit log theo id.
 * Trả null nếu BE trả 404.
 *
 * BE response: `{ message, data: { log: AuditLog } }`. Dùng `raw: true` để giữ
 * nguyên envelope → đọc `response.data.log`. (Bug trước: để apiFetch unwrap
 * xong `response` chỉ còn là `{ log }`, làm `response.data?.log` ra undefined.)
 */
export async function getAuditLog(id: number | string): Promise<AuditLog | null> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return null;
  try {
    const response = await apiFetch<{ message?: string; data: { log: AuditLog } }>(
      `/admin/audit-logs/${numericId}`,
      { raw: true }
    );
    return response?.data?.log ?? null;
  } catch (err) {
    if (err && typeof err === "object" && "status" in err && (err as { status?: number }).status === 404) {
      return null;
    }
    throw err;
  }
}

// ===== Helpers =====

/**
 * Parse target có dạng "Module:id" → { module, id } hoặc null.
 * Không match với target free-form (VD: "Auth:me", "User:by-email:abc@...").
 */
export function parseAuditTarget(target: string | null | undefined): { module: AuditModule; id: string } | null {
  if (!target) return null;
  const idx = target.indexOf(":");
  if (idx <= 0) return null;
  const mod = target.slice(0, idx) as AuditModule;
  const id = target.slice(idx + 1);
  if (!id) return null;
  return { module: mod, id };
}

/** Format ISO date → "HH:mm DD/MM/YYYY". */
export function formatAuditDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const date = d.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return `${time} ${date}`;
  } catch {
    return value;
  }
}

// ===== Export CSV =====

/** Escape 1 field CSV theo RFC 4180. */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (s === "") return "";
  // Nếu có dấu phẩy, nháy kép, hoặc newline → bọc trong nháy kép + escape nháy kép.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Header cố định cho CSV.
 * Cột "Before/After" chứa JSON.stringify (đã được BE redact).
 */
const CSV_HEADERS = [
  "ID",
  "Thời gian",
  "Người thực hiện (ID)",
  "Người thực hiện (Email)",
  "Người thực hiện (Họ tên)",
  "Hành động",
  "Nhóm",
  "Đối tượng",
  "IP",
  "User-Agent",
  "Meta (JSON)",
] as const;

/** Trả về 1 dòng CSV (đã có \r\n). */
function buildCsvRows(items: AuditLog[]): string {
  const headerLine = CSV_HEADERS.join(",");
  const lines = items.map((log) => {
    const tone = AUDIT_ACTION_BADGES[log.action as keyof typeof AUDIT_ACTION_BADGES] ?? "neutral";
    const actionLabel = AUDIT_ACTION_LABELS[log.action as keyof typeof AUDIT_ACTION_LABELS] ?? log.action;
    const toneLabel = AUDIT_TONE_LABELS[tone];
    return [
      log.id,
      formatAuditDateTime(log.createdAt),
      log.userId ?? "",
      log.user?.email ?? "",
      log.user?.fullName ?? "",
      actionLabel,
      toneLabel,
      log.target ?? "",
      log.ip ?? "",
      log.userAgent ?? "",
      log.meta ? JSON.stringify(log.meta) : "",
    ]
      .map(csvEscape)
      .join(",");
  });
  // RFC 4180: dùng CRLF.
  return [headerLine, ...lines].join("\r\n");
}

/**
 * Xuất danh sách audit log ra CSV. Download luôn file về máy.
 *
 * Strategy: xuất trên data đang hiển thị (1 page hiện tại). Đây là option
 * user chọn (đơn giản, không cần endpoint BE mới). Khi cần xuất full dataset
 * khớp filter, có thể nâng cấp bằng cách gọi list nhiều lần hoặc BE export
 * endpoint.
 *
 * Thêm BOM `\uFEFF` ở đầu để Excel nhận UTF-8 đúng (kể cả tiếng Việt có dấu).
 */
export function exportAuditLogsCsv(items: AuditLog[], filenamePrefix = "audit-logs"): void {
  if (!Array.isArray(items) || items.length === 0) {
    return;
  }
  const csv = "\uFEFF" + buildCsvRows(items);

  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  const filename = `${filenamePrefix}-${stamp}.csv`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Cleanup sau 1 tick để trình duyệt kịp xử lý click.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Kiểm tra nhanh 1 module có route trong app hay không (để hiển thị nút
 * "Xem đối tượng"). Trả null nếu không có.
 *
 * Import route map lazily để tránh circular dependency với AppRoutes.
 */
export function getModuleTargetPath(
  module: AuditModule,
  _id: string
): string | null {
  // Map module → route đã khai báo trong constants.
  // Tạm thời chỉ hỗ trợ User/Notification/UploadFile — route đã có ở AppRoutes.
  switch (module) {
    case "User":
      return "/users";
    case "Notification":
      return "/notifications";
    case "UploadFile":
      return "/files";
    case "Auth":
    default:
      return null;
  }
}