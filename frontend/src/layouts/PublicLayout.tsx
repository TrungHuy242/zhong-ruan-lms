/**
 * PublicLayout — shell cho 5 trang marketing (Home/Courses/Teachers/Pricing/Contact).
 *
 * Tách bạch hoàn toàn với AdminLayout:
 *   - Không có Sidebar/Topbar admin, không có NotificationProvider phụ thuộc.
 *   - Dùng PublicHeader (sticky + hamburger drawer) và PublicFooter (đỏ đậm).
 *
 * Bọc trong PublicRoute ở AppRoutes, KHÔNG bọc ProtectedRoute.
 */
import { Outlet } from "react-router-dom";
import { PublicHeader } from "../shared/components/PublicHeader";
import { PublicFooter } from "../shared/components/PublicFooter";
import styles from "./PublicLayout.module.css";

export function PublicLayout() {
  return (
    <div className={styles.shell}>
      <PublicHeader />
      <main className={styles.main}>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}