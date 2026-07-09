import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, loadCollapsedState, saveCollapsedState } from "../components/Sidebar";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import styles from "./AdminLayout.module.css";

export function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => loadCollapsedState());
  const [drawerOpen, setDrawerOpen] = useState(false);

  // On desktop (>1023px), always close drawer.
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setDrawerOpen(false);
      }
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleToggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    saveCollapsedState(next);
  }

  return (
    <div
      className={[
        styles.shell,
        sidebarCollapsed ? styles.sidebarCollapsed : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Desktop sidebar — always rendered but hidden via CSS on mobile */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
      />

      {/* Mobile drawer */}
      {drawerOpen && (
        <Sidebar
          collapsed={false}
          onToggle={handleToggleSidebar}
          onClose={() => setDrawerOpen(false)}
          isDrawer
        />
      )}

      {/* Main content area */}
      <div className={styles.main}>
        <Header onMenuClick={() => setDrawerOpen(true)} />

        <main className={styles.content}>
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
