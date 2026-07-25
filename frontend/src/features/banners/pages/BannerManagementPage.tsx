/**
 * BannerManagementPage — trang Admin quản lý Banner.
 */
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, ConfirmDialog, Pagination } from "../../../shared/components/ui";
import { BannerFormModal } from "../components/BannerFormModal";
import {
  deleteBanner,
  listBanners,
  restoreBanner,
  type Banner,
  type ListBannersParams,
} from "../services/bannerApi";
import { ApiError } from "../../../shared/api";
import styles from "./BannerManagementPage.module.css";

type SortKey = "displayOrder" | "createdAt" | "title" | "isPublished";

const PAGE_SIZE = 10;

function computeStatus(b: Banner): string {
  const now = new Date();
  if (!b.isPublished) return "Đã ẩn";
  if (b.startDate && new Date(b.startDate) > now) return "Lên lịch";
  if (b.endDate && new Date(b.endDate) < now) return "Hết hạn";
  return "Đang chạy";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

interface ConfirmState {
  open: boolean;
  loading: boolean;
  banner: Banner | null;
  mode: "delete" | "restore";
}

export function BannerManagementPage() {
  const [data, setData] = useState<{ banners: Banner[]; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("displayOrder");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false, loading: false, banner: null, mode: "delete",
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const fetchData = useCallback(async (p: number, sk: SortKey, so: "asc" | "desc") => {
    setLoading(true);
    setApiError(null);
    try {
      const params: ListBannersParams = {
        page: p,
        limit: PAGE_SIZE,
        sortBy: sk,
        sortDir: so,
      };
      const result = await listBanners(params);
      setData({ banners: result.banners, total: result.pagination.total });
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(page, sortKey, sortOrder); }, []);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData(newPage, sortKey, sortOrder);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      const next = sortOrder === "asc" ? "desc" : "asc";
      setSortOrder(next);
      setPage(1);
      fetchData(1, key, next);
    } else {
      setSortKey(key);
      setSortOrder("asc");
      setPage(1);
      fetchData(1, key, "asc");
    }
  };

  const openAdd = () => { setEditingBanner(null); setFormOpen(true); };
  const openEdit = (b: Banner) => { setEditingBanner(b); setFormOpen(true); };
  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingBanner(null);
    fetchData(page, sortKey, sortOrder);
  };

  const openDelete = (b: Banner) => setConfirm({ open: true, loading: false, banner: b, mode: "delete" });

  const handleConfirm = async () => {
    if (!confirm.banner) return;
    setConfirm((c) => ({ ...c, loading: true }));
    try {
      if (confirm.mode === "delete") {
        await deleteBanner(confirm.banner.id);
      } else {
        await restoreBanner(confirm.banner.id);
      }
      setConfirm((c) => ({ ...c, open: false, loading: false }));
      fetchData(page, sortKey, sortOrder);
    } catch (err) {
      setConfirm((c) => ({ ...c, loading: false }));
      setApiError(err instanceof ApiError ? err.message : "Thao tác thất bại");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortOrder === "asc" ? " ↑" : " ↓";
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>Quản lý Banner</h1>
        <Button variant="primary" size="sm" onClick={openAdd}>
          + Thêm Banner
        </Button>
      </div>

      {apiError && (
        <Alert variant="error">{apiError}</Alert>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thImage}>Ảnh</th>
              <th
                className={`${styles.th} ${styles.sortable}`}
                onClick={() => handleSort("title")}
              >
                Tiêu đề{sortIcon("title")}
              </th>
              <th className={styles.th}>Badge</th>
              <th className={styles.th}>Trạng thái</th>
              <th className={styles.th}>Thời gian hiệu lực</th>
              <th
                className={`${styles.th} ${styles.sortable} ${styles.thSmall}`}
                onClick={() => handleSort("displayOrder")}
              >
                Thứ tự{sortIcon("displayOrder")}
              </th>
              <th className={`${styles.th} ${styles.thActions}`}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  <td colSpan={7} className={styles.skeleton} />
                </tr>
              ))
            )}
            {!loading && (!data?.banners || data.banners.length === 0) && (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  Chưa có banner nào.
                </td>
              </tr>
            )}
            {!loading && data?.banners.map((b) => {
              const status = computeStatus(b);
              const statusCls =
                status === "Đang chạy" ? styles.statusActive :
                status === "Đã ẩn" ? styles.statusHidden :
                status === "Lên lịch" ? styles.statusScheduled :
                styles.statusExpired;
              return (
                <tr key={b.id}>
                  <td>
                    <div className={styles.thumb}>
                      <img src={b.imageUrl} alt={b.title} className={styles.thumbImg} />
                    </div>
                  </td>
                  <td className={styles.titleCell}>{b.title}</td>
                  <td>
                    {b.badgeText
                      ? <span className={styles.badge}>{b.badgeText}</span>
                      : <span className={styles.muted}>—</span>}
                  </td>
                  <td>
                    <span className={`${styles.status} ${statusCls}`}>{status}</span>
                  </td>
                  <td className={styles.dateCell}>
                    {!b.startDate && !b.endDate
                      ? <span className={styles.muted}>Không giới hạn</span>
                      : `${formatDate(b.startDate)} — ${formatDate(b.endDate)}`}
                  </td>
                  <td className={styles.orderCell}>{b.displayOrder}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => openEdit(b)}
                        title="Sửa"
                      >
                        Sửa
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => openDelete(b)}
                        title="Xóa"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 && (
        <div className={styles.pagination}>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {formOpen && (
        <BannerFormModal
          banner={editingBanner}
          onClose={() => { setFormOpen(false); setEditingBanner(null); }}
          onSuccess={handleFormSuccess}
        />
      )}

      <ConfirmDialog
        open={confirm.open}
        title={confirm.mode === "delete" ? "Xác nhận xóa Banner" : "Xác nhận khôi phục Banner"}
        message={
          confirm.mode === "delete"
            ? `Xóa banner "${confirm.banner?.title}"? Banner sẽ được chuyển vào Thùng rác.`
            : `Khôi phục banner "${confirm.banner?.title}"?`
        }
        confirmText={confirm.mode === "delete" ? "Xóa" : "Khôi phục"}
        confirmVariant={confirm.mode === "delete" ? "danger" : "primary"}
        loading={confirm.loading}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />
    </div>
  );
}
