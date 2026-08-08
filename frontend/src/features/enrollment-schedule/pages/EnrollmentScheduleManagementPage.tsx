/**
 * EnrollmentScheduleManagementPage — trang Admin quản lý Lịch khai giảng.
 *
 * Mặc dù đây là dữ liệu "singleton-ish" (chỉ 1 bản active tại 1 thời điểm),
 * Admin vẫn thấy TOÀN BỘ danh sách để quản lý các đợt/tuần đã tạo.
 *
 * Cột: Tiêu đề · Số khóa · Trạng thái (Đang hiển thị / Đã xuất bản / Đã ẩn) ·
 *      Ngày tạo · Thao tác (Sửa / Xem trước / Xoá).
 * "Đang hiển thị" = bản ghi published + displayOrder thấp nhất trong cùng trang.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Modal } from "../../../shared/components/ui";
import { PreviewScheduleBanner } from "../components/PreviewScheduleBanner";
import {
  deleteEnrollmentSchedule,
  listEnrollmentSchedules,
  restoreEnrollmentSchedule,
  type EnrollmentSchedule,
  type ListEnrollmentSchedulesParams,
} from "../services/enrollmentScheduleApi";
import { ApiError } from "../../../shared/api";
import { useToast } from "../../../shared/contexts/ToastContext";
import styles from "./EnrollmentScheduleManagementPage.module.css";

type SortKey = "displayOrder" | "createdAt" | "title";

const PAGE_SIZE = 10;

interface ConfirmState {
  open: boolean;
  loading: boolean;
  schedule: EnrollmentSchedule | null;
  mode: "delete" | "restore";
}

interface PreviewState {
  open: boolean;
  schedule: EnrollmentSchedule | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Tính trạng thái hiển thị của 1 bản ghi dựa trên cả list đang load.
 * - "Ẩn": !isPublished
 * - "Đang hiển thị": isPublished + displayOrder là min trong tất cả published (tiebreak createdAt DESC).
 * - "Đã xuất bản": isPublished nhưng không phải bản active.
 */
function computeStatus(
  s: EnrollmentSchedule,
  all: EnrollmentSchedule[]
): { label: string; cls: string } {
  if (!s.isPublished) {
    return { label: "Đã ẩn", cls: styles.statusHidden };
  }
  const published = all.filter((x) => x.isPublished);
  if (published.length === 0) {
    return { label: "Đã xuất bản", cls: styles.statusHidden };
  }
  const minOrder = Math.min(...published.map((p) => p.displayOrder));
  if (s.displayOrder === minOrder) {
    return { label: "Đang hiển thị", cls: styles.statusActiveGold };
  }
  return { label: "Đã xuất bản", cls: styles.statusActive };
}

export function EnrollmentScheduleManagementPage() {
  useEffect(() => {
    document.title = "Quản lý lịch khai giảng — Zhong Ruan LMS";
  }, []);

  // Toast (thông báo CRUD chuyển sang toast floating bottom-right)
  const toast = useToast();

  const [data, setData] = useState<{
    schedules: EnrollmentSchedule[];
    total: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("displayOrder");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  // loadError: hiển thị inline khi fetch list thất bại (giữ để có nút "Thử lại")
  const [loadError, setLoadError] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    loading: false,
    schedule: null,
    mode: "delete",
  });

  const [preview, setPreview] = useState<PreviewState>({
    open: false,
    schedule: null,
  });

  const navigate = useNavigate();
  const location = useLocation();

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const fetchData = useCallback(
    async (p: number, sk: SortKey, so: "asc" | "desc") => {
      setLoading(true);
      setLoadError(null);
      try {
        const params: ListEnrollmentSchedulesParams = {
          page: p,
          limit: PAGE_SIZE,
          sortBy: sk,
          sortDir: so,
        };
        const result = await listEnrollmentSchedules(params);
        setData({
          schedules: result.schedules,
          total: result.pagination.total,
        });
      } catch (err) {
        setLoadError(
          err instanceof ApiError ? err.message : "Lỗi tải dữ liệu"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData(page, sortKey, sortOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tự refresh khi quay về từ form page (navigate kèm ?refresh=1 query)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("refresh") === "1") {
      fetchData(page, sortKey, sortOrder);
      // Xoá query để F5 không refresh lại
      params.delete("refresh");
      const next = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${next ? `?${next}` : ""}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortOrder === "asc" ? " ↑" : " ↓";
  };

  const openAdd = () => {
    navigate("/enrollment-schedule/new", {
      state: { returnTo: location.pathname + location.search },
    });
  };

  const openEdit = (s: EnrollmentSchedule) => {
    navigate(`/enrollment-schedule/${s.id}/edit`, {
      state: { returnTo: location.pathname + location.search },
    });
  };

  const openDelete = (s: EnrollmentSchedule) =>
    setConfirm({ open: true, loading: false, schedule: s, mode: "delete" });

  const handleConfirm = async () => {
    if (!confirm.schedule) return;
    setConfirm((c) => ({ ...c, loading: true }));
    try {
      if (confirm.mode === "delete") {
        await deleteEnrollmentSchedule(confirm.schedule.id);
        toast.success("Đã chuyển lịch khai giảng vào thùng rác");
      } else {
        await restoreEnrollmentSchedule(confirm.schedule.id);
        toast.success("Khôi phục lịch khai giảng thành công");
      }
      setConfirm((c) => ({ ...c, open: false, loading: false }));
      fetchData(page, sortKey, sortOrder);
    } catch (err) {
      setConfirm((c) => ({ ...c, loading: false }));
      toast.error(
        err instanceof ApiError ? err.message : "Thao tác thất bại"
      );
    }
  };

  // Memo: danh sách hiện tại để tính "Đang hiển thị" dựa trên cùng page-load.
  const currentList = useMemo(
    () => data?.schedules ?? [],
    [data?.schedules]
  );

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>Quản lý lịch khai giảng</h1>
        <button
          type="button"
          onClick={openAdd}
          style={{
            background: "var(--brand-primary)",
            color: "var(--text-on-primary)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "8px 16px",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Thêm lịch khai giảng
        </button>
      </div>

      {loadError && (
        <div
          style={{
            background: "var(--color-error-bg)",
            color: "var(--color-error)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-error)",
            fontFamily: "var(--font-body)",
            fontSize: 14,
          }}
        >
          {loadError}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th
                className={`${styles.sortable}`}
                onClick={() => handleSort("title")}
              >
                Tiêu đề{sortIcon("title")}
              </th>
              <th>Số khóa</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th
                className={`${styles.sortable}`}
                onClick={() => handleSort("displayOrder")}
              >
                Thứ tự{sortIcon("displayOrder")}
              </th>
              <th className={styles.thActions}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className={styles.skeletonRow}>
                  <td colSpan={6}>
                    <div className={styles.skeleton} />
                  </td>
                </tr>
              ))}
            {!loading && (!data?.schedules || data.schedules.length === 0) && (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  Chưa có lịch khai giảng nào. Bấm nút bên trên để tạo bản đầu tiên.
                </td>
              </tr>
            )}
            {!loading &&
              data?.schedules.map((s) => {
                const status = computeStatus(s, currentList);
                return (
                  <tr key={s.id}>
                    <td className={styles.titleCell}>{s.title}</td>
                    <td>{s.coursesEnrolling?.length ?? 0}</td>
                    <td>
                      <span
                        className={`${styles.status} ${status.cls}`}
                        title={
                          status.label === "Đang hiển thị"
                            ? "Bản ghi này đang được hiển thị trên trang Public"
                            : ""
                        }
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className={styles.dateCell}>
                      {formatDate(s.createdAt)}
                    </td>
                    <td className={styles.orderCell}>{s.displayOrder}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => openEdit(s)}
                          title="Sửa"
                        >
                          Sửa
                        </button>
                        <button
                          className={styles.previewBtn}
                          onClick={() =>
                            setPreview({ open: true, schedule: s })
                          }
                          title="Xem trước giao diện Public"
                        >
                          Xem trước
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => openDelete(s)}
                          title="Xoá (chuyển vào Thùng rác)"
                        >
                          Xoá
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
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            Trang {page} / {totalPages} — tổng {total} bản ghi
          </span>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
                background: "var(--bg-surface)",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                opacity: page <= 1 ? 0.5 : 1,
                fontFamily: "var(--font-body)",
                fontSize: 13,
              }}
            >
              ← Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
                background: "var(--bg-surface)",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                opacity: page >= totalPages ? 0.5 : 1,
                fontFamily: "var(--font-body)",
                fontSize: 13,
              }}
            >
              Sau →
            </button>
          </div>
        </div>
      )}

      {/* Confirm dialog — dùng Modal shared cho đồng bộ pattern */}
      <Modal
        open={confirm.open}
        onClose={() =>
          setConfirm((c) => ({ ...c, open: false }))
        }
        title="Xác nhận xoá lịch khai giảng"
        size="sm"
      >
        <div style={{ fontFamily: "var(--font-body)", fontSize: 14 }}>
          {confirm.schedule ? (
            <>
              Xoá lịch khai giảng{" "}
              <b>"{confirm.schedule.title}"</b>? Bản ghi sẽ được chuyển vào{" "}
              <b>Thùng rác</b> và có thể khôi phục lại.
            </>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "flex-end",
            marginTop: "var(--space-5)",
          }}
        >
          <button
            type="button"
            onClick={() =>
              setConfirm((c) => ({ ...c, open: false }))
            }
            disabled={confirm.loading}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              background: "transparent",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirm.loading}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-md)",
              background: "var(--color-error)",
              color: "#fff",
              border: "none",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: 600,
              cursor: confirm.loading ? "not-allowed" : "pointer",
              opacity: confirm.loading ? 0.6 : 1,
            }}
          >
            {confirm.loading ? "Đang xử lý..." : "Xoá"}
          </button>
        </div>
      </Modal>

      {/* Preview modal — render public component với data của bản ghi */}
      <Modal
        open={preview.open && !!preview.schedule}
        onClose={() => setPreview({ open: false, schedule: null })}
        title={`Xem trước: ${preview.schedule?.title ?? ""}`}
        size="lg"
      >
        {preview.schedule ? (
          <div
            style={{
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              maxHeight: "70vh",
              overflowY: "auto",
              background: "var(--zr-paper, #FAF7F2)",
            }}
          >
            <PreviewScheduleBanner schedule={preview.schedule} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
