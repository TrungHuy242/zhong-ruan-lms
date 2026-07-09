import { useNavigate } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { authStorage } from "../lib/authStorage";
import styles from "./DashboardPlaceholder.module.css";

export function DashboardPlaceholder() {
  const navigate = useNavigate();
  const user = authStorage.getUser();

  function handleLogout() {
    authStorage.clear();
    navigate("/login", { replace: true });
  }

  return (
    <main className={styles.page}>
      <Card padding="lg" className={styles.card}>
        <header className={styles.header}>
          <span className={styles.tag}>Bước 1 / PASS</span>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Xin chào, <strong>{user?.fullName ?? "bạn"}</strong>
            {user?.role ? (
              <>
                {" "}
                <span className={styles.role}>({user.role})</span>
              </>
            ) : null}
          </p>
        </header>

        <p className={styles.note}>
          Đây là trang placeholder tối giản — chỉ dùng để chứng minh rằng
          ProtectedRoute chặn đúng khi chưa đăng nhập và cho phép vào khi đã có
          token hợp lệ. UI dashboard thật sẽ được xây ở task khác.
        </p>

        <div className={styles.actions}>
          <Button variant="secondary" size="md" onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>
      </Card>
    </main>
  );
}
