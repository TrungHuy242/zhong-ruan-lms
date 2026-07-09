/**
 * AppRoutes — cấu hình route tập trung.
 *
 * Tách khỏi App.tsx để:
 *   - App.tsx chỉ làm nhiệm vụ render (giữ component gốc gọn)
 *   - Sau này có thể thêm lazy load, role-based guard, ... ở 1 chỗ duy nhất
 */

import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../../features/auth/pages/LoginPage";
import { RegisterPage } from "../../features/auth/pages/RegisterPage";
import { DashboardPage } from "../../features/dashboard/pages/DashboardPage";
import { UserManagementPage } from "../../features/users/pages/UserManagementPage";
import { NotificationManagementPage } from "../../features/notifications/pages/NotificationManagementPage";
import { AuditLogPage } from "../../features/audit-log/pages/AuditLogPage";
import { FileManagerPage } from "../../features/files/pages/FileManagerPage";
import { SystemSettingsPage } from "../../features/settings/pages/SystemSettingsPage";
import { ProfilePage } from "../../features/profile/pages/ProfilePage";
import { GlobalSearchPage } from "../../features/search/pages/GlobalSearchPage";
import { TrashManagerPage } from "../../features/trash/pages/TrashManagerPage";
import { AdminLayout } from "../layouts/AdminLayout";
import { ProtectedRoute } from "../guards/ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes — wrapped in AdminLayout */}
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/notifications" element={<NotificationManagementPage />} />
        <Route path="/files" element={<FileManagerPage />} />
        <Route path="/logs" element={<AuditLogPage />} />
        <Route path="/settings" element={<SystemSettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/search" element={<GlobalSearchPage />} />
        <Route path="/trash" element={<TrashManagerPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
