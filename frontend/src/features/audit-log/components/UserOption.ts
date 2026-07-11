/**
 * UserOption — kiểu dùng cho dropdown người dùng trong AuditFilter.
 *
 * Tách ra file riêng (không export cùng AuditFilter.tsx) để Vite Fast Refresh
 * hoạt động: file chỉ export React component mới dùng được Fast Refresh.
 */
export interface UserOption {
  id: number | string;
  fullName: string;
  email: string;
}