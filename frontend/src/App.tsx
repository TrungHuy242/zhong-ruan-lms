import { Route, Routes, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { UserManagementPage } from "./pages/UserManagementPage";
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
        <Route path="/notifications" element={<PlaceholderPage title="Thông báo" />} />
        <Route path="/files" element={<PlaceholderPage title="Quản lý tệp" />} />
        <Route path="/logs" element={<PlaceholderPage title="Nhật ký hệ thống" />} />
        <Route path="/settings" element={<PlaceholderPage title="Cài đặt hệ thống" />} />
        <Route path="/search" element={<PlaceholderPage title="Tìm kiếm" />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
