/**
 * AppRoutes — cấu hình route tập trung.
 *
 * Tách khỏi App.tsx để:
 *   - App.tsx chỉ làm nhiệm vụ render (giữ component gốc gọn)
 *   - Sau này có thể thêm lazy load, role-based guard, ... ở 1 chỗ duy nhất
 *
 * 3 nhánh route:
 *   - Public marketing: không cần auth, bọc PublicLayout (5 trang marketing).
 *   - Auth: /login, /register (không bọc layout).
 *   - Admin: bọc ProtectedRoute + AdminLayout (9 trang quản trị).
 *
 * Catch-all về "/" (HomePage public), KHÔNG về /login như trước.
 * ProtectedRoute độc lập redirect /dashboard (chưa login) → /login.
 */

import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../../features/auth/pages/LoginPage";
import { RegisterPage } from "../../features/auth/pages/RegisterPage";
import { DashboardPage } from "../../features/dashboard/pages/DashboardPage";
import { UserManagementPage } from "../../features/users/pages/UserManagementPage";
import { UserFormPage } from "../../features/users/pages/UserFormPage";
import { TeacherManagementPage } from "../../features/teachers/pages/TeacherManagementPage";
import { TeacherFormPage } from "../../features/teachers/pages/TeacherFormPage";
import { PricingManagementPage } from "../../features/pricing/pages/PricingManagementPage";
import { PricingFormPage } from "../../features/pricing/pages/PricingFormPage";
import { NotificationManagementPage } from "../../features/notifications/pages/NotificationManagementPage";
import { NotificationFormPage } from "../../features/notifications/pages/NotificationFormPage";
import { AuditLogPage } from "../../features/audit-log/pages/AuditLogPage";
import { FileManagerPage } from "../../features/files/pages/FileManagerPage";
import { SystemSettingsPage } from "../../features/settings/pages/SystemSettingsPage";
import { ProfilePage } from "../../features/profile/pages/ProfilePage";
import { GlobalSearchPage } from "../../features/search/pages/GlobalSearchPage";
import { TrashManagerPage } from "../../features/trash/pages/TrashManagerPage";
import { ContactRequestManagementPage } from "../../features/contact-requests/pages/ContactRequestManagementPage";
import { EnrollmentScheduleManagementPage } from "../../features/enrollment-schedule/pages/EnrollmentScheduleManagementPage";
import { EnrollmentScheduleFormPage } from "../../features/enrollment-schedule/pages/EnrollmentScheduleFormPage";
import { TestimonialManagementPage } from "../../features/testimonials/pages/TestimonialManagementPage";
import { TestimonialFormPage } from "../../features/testimonials/pages/TestimonialFormPage";
import { AdminLayout } from "../layouts/AdminLayout";
import { ProtectedRoute } from "../guards/ProtectedRoute";
import { PublicLayout } from "../../layouts/PublicLayout";
import { HomePage } from "../../pages/public/HomePage";
import { CoursesPage } from "../../pages/public/CoursesPage";
import { CourseDetailPage } from "../../pages/public/CourseDetailPage";
import { TeachersListPage } from "../../pages/public/TeachersListPage";
import { PricingPage } from "../../pages/public/PricingPage";
import { ContactPage } from "../../pages/public/ContactPage";
import { TeacherDetailPage } from "../../pages/public/TeacherDetailPage";

export function AppRoutes() {
  return (
    <Routes>
      {/* Public marketing — không cần auth */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/khoa-hoc" element={<CoursesPage />} />
        <Route path="/khoa-hoc/:slug" element={<CourseDetailPage />} />
        <Route path="/giang-vien" element={<TeachersListPage />} />
        <Route path="/giang-vien/:slug" element={<TeacherDetailPage />} />
        <Route path="/bang-gia" element={<PricingPage />} />
        <Route path="/lien-he" element={<ContactPage />} />
      </Route>

      {/* Auth — không bọc layout */}
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
        <Route path="/users/new" element={<UserFormPage />} />
        <Route path="/users/:id/edit" element={<UserFormPage />} />
        <Route path="/teachers" element={<TeacherManagementPage />} />
        <Route path="/teachers/new" element={<TeacherFormPage />} />
        <Route path="/teachers/:id/edit" element={<TeacherFormPage />} />
        <Route path="/pricing-plans" element={<PricingManagementPage />} />
        <Route path="/pricing-plans/new" element={<PricingFormPage />} />
        <Route path="/pricing-plans/:id/edit" element={<PricingFormPage />} />
        <Route path="/notifications" element={<NotificationManagementPage />} />
        <Route path="/notifications/new" element={<NotificationFormPage />} />
        <Route path="/files" element={<FileManagerPage />} />
        <Route path="/logs" element={<AuditLogPage />} />
        <Route path="/settings" element={<SystemSettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/search" element={<GlobalSearchPage />} />
        <Route path="/trash" element={<TrashManagerPage />} />
        <Route path="/contact-requests" element={<ContactRequestManagementPage />} />
        <Route
          path="/enrollment-schedule"
          element={<EnrollmentScheduleManagementPage />}
        />
        <Route
          path="/enrollment-schedule/new"
          element={<EnrollmentScheduleFormPage />}
        />
        <Route
          path="/enrollment-schedule/:id/edit"
          element={<EnrollmentScheduleFormPage />}
        />
        <Route path="/testimonials" element={<TestimonialManagementPage />} />
        <Route path="/testimonials/new" element={<TestimonialFormPage />} />
        <Route
          path="/testimonials/:id/edit"
          element={<TestimonialFormPage />}
        />
      </Route>

      {/* Catch-all: về trang chủ public thay vì /login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}