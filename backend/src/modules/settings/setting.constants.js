/**
 * setting.constants — const dùng riêng cho module System Settings.
 *
 * Phân nhóm cấu hình — 5 nhóm chính:
 *   - General      : cấu hình chung (tên site, ngôn ngữ, time zone...)
 *   - Security     : auth, password policy, session, rate-limit
 *   - Upload       : max size, allowed mime, storage backend
 *   - Notification : SMTP, push, SMS, template
 *   - System       : maintenance mode, debug, internal
 *
 * Mọi nhóm được whitelist cứng tại BE — request mang group ngoài danh sách
 * sẽ trả 400 để FE không inject nhóm tuỳ ý.
 *
 * System-protected keys: các key "quan trọng của hệ thống" mà module khác
 * đang đọc (auth, smtp...) — import sẽ KHÔNG ghi đè các key này nếu không
 * hợp lệ (mặc định list rỗng, thêm khi có module đọc setting cụ thể).
 */

const SETTING_GROUPS = Object.freeze([
  "General",
  "Security",
  "Upload",
  "Notification",
  "System",
]);

/** Validate group — null/"" coi như chưa phân nhóm (cho phép). */
function normalizeGroup(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return undefined; // báo hiệu invalid type
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!SETTING_GROUPS.includes(trimmed)) return undefined; // không thuộc whitelist
  return trimmed;
}

const SYSTEM_PROTECTED_KEYS = Object.freeze(new Set([
  // Thêm khi có module thật đọc setting dạng secret:
  // "auth.jwt_secret",
  // "smtp.password",
  // "payment.api_key",
]));

module.exports = {
  SETTING_GROUPS,
  normalizeGroup,
  SYSTEM_PROTECTED_KEYS,
};