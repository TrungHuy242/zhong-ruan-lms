import { Route, Routes, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { UserManagementPage } from "./pages/UserManagementPage";
import { NotificationManagementPage } from "./pages/NotificationManagementPage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { FileManagerPage } from "./pages/FileManagerPage";
import { SystemSettingsPage } from "./pages/SystemSettingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { GlobalSearchPage } from "./pages/GlobalSearchPage";
import { AdminLayout } from "./layouts/AdminLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

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
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
