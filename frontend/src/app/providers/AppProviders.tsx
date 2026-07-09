import { type ReactNode } from "react";
import { NotificationProvider } from "../../shared/contexts/NotificationContext";

/**
 * AppProviders — gom toàn bộ React Context Provider ở mức toàn cục.
 *
 * Hiện tại:
 *   - NotificationProvider: cung cấp unreadCount + recent notifications cho Bell badge
 *     trên Header. Trước đây bọc trong AdminLayout, nhưng khi user navigate ra
 *     ngoài layout (login) thì state mất — bọc toàn cục để Bell nhất quán
 *     và không bị re-mount.
 *
 * Sau này có thể thêm: QueryClientProvider (nếu dùng React Query),
 * ToastProvider, ThemeProvider, ...
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}
