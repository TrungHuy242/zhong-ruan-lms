import { Route, Routes, Navigate } from "react-router-dom";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { UserManagementPage } from "./features/users/UserManagementPage";
import { NotificationManagementPage } from "./features/notifications/NotificationManagementPage";
import { AuditLogPage } from "./features/audit-log/AuditLogPage";
import { FileManagerPage } from "./features/files/FileManagerPage";
import { SystemSettingsPage } from "./features/settings/SystemSettingsPage";
import { ProfilePage } from "./features/profile/ProfilePage";
import { GlobalSearchPage } from "./features/search/GlobalSearchPage";
import { TrashManagerPage } from "./features/trash/TrashManagerPage";
import { AdminLayout } from "./shared/components/layout/AdminLayout";
import { ProtectedRoute } from "./shared/components/guards/ProtectedRoute";

export default function App() {
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