import { type ReactNode } from "react";
import { NotificationProvider } from "../../shared/contexts/NotificationContext";
import { ToastProvider } from "../../shared/contexts/ToastContext";

/**
 * AppProviders — gom toàn bộ React Context Provider ở mức toàn cục.
 *
 * Hiện tại:
 *   - NotificationProvider: cung cấp unreadCount + recent notifications cho Bell badge
 *     trên Header. Trước đây bọc trong AdminLayout, nhưng khi user navigate ra
 *     ngoài layout (login) thì state mất — bọc toàn cục để Bell nhất quán
 *     và không bị re-mount.
 *   - ToastProvider: cung cấp `useToast()` cho mọi page/action — thay thế
 *     inline <Alert> banner cho CRUD action. Render <ToastContainer> fixed
 *     bottom-right.
 *
 * Sau này có thể thêm: QueryClientProvider (nếu dùng React Query),
 * ThemeProvider, ...
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <ToastProvider>{children}</ToastProvider>
    </NotificationProvider>
  );
}
