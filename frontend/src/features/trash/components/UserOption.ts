/**
 * UserOption — kiểu dùng cho dropdown người dùng trong TrashFilter.
 *
 * Tách ra file riêng (không export cùng TrashFilter.tsx) để Vite Fast Refresh
 * hoạt động: file chỉ export React component mới dùng được Fast Refresh.
 */
export interface UserOption {
  id: number | string;
  fullName: string;
  email: string;
}
