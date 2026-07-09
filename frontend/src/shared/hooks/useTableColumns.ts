/**
 * useTableColumns — hook quản lý trạng thái ẩn/hiện cột trong localStorage.
 *
 * Tái sử dụng được cho mọi trang có bảng cần user tùy chỉnh cột hiển thị
 * (UserManagementPage, sau này có thể dùng cho Notifications, Audit Log...).
 *
 * Pattern: key localStorage riêng cho từng trang,vd "zrlms_user_table_columns".
 * Cột "always visible" (VD: cột tên + action) truyền qua prop `lockedKeys`
 * sẽ KHÔNG bao giờ bị ẩn dù user cố tick.
 */
import { useCallback, useEffect, useState } from "react";

export interface UseTableColumnsOptions<TKey extends string> {
  /** Tất cả key cột có thể ẩn/hiện. */
  availableKeys: readonly TKey[];
  /** Key cột cố định luôn hiển thị (không bao giờ ẩn). */
  lockedKeys?: readonly TKey[];
  /** localStorage key riêng cho từng trang. */
  storageKey: string;
}

export interface UseTableColumnsResult<TKey extends string> {
  /** Danh sách key đang bị ẩn. */
  hiddenKeys: TKey[];
  /** Set ẩn/hiện 1 cột. */
  toggle: (key: TKey) => void;
  /** Set trực tiếp danh sách ẩn. */
  setHidden: (keys: TKey[]) => void;
  /** Reset về mặc định (không ẩn cột nào). */
  reset: () => void;
  /** Check 1 cột có đang ẩn không. */
  isHidden: (key: TKey) => boolean;
}

export function useTableColumns<TKey extends string>({
  availableKeys,
  lockedKeys = [] as readonly TKey[],
  storageKey,
}: UseTableColumnsOptions<TKey>): UseTableColumnsResult<TKey> {
  // Đọc từ localStorage 1 lần lúc mount (lazy init).
  const [hiddenKeys, setHiddenKeys] = useState<TKey[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Lọc chỉ giữ key còn hợp lệ VÀ không nằm trong lockedKeys.
      const valid = new Set(availableKeys as readonly string[]);
      const locked = new Set(lockedKeys as readonly string[]);
      return parsed.filter(
        (k): k is TKey => typeof k === "string" && valid.has(k) && !locked.has(k)
      );
    } catch {
      return [];
    }
  });

  // Persist vào localStorage mỗi khi thay đổi.
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(hiddenKeys));
    } catch {
      // localStorage full / disabled — bỏ qua, vẫn hoạt động trong session
    }
  }, [hiddenKeys, storageKey]);

  const toggle = useCallback(
    (key: TKey) => {
      // Không cho ẩn cột locked.
      if ((lockedKeys as readonly string[]).includes(key)) return;
      setHiddenKeys((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      );
    },
    [lockedKeys]
  );

  const setHidden = useCallback(
    (keys: TKey[]) => {
      const valid = new Set(availableKeys as readonly string[]);
      const locked = new Set(lockedKeys as readonly string[]);
      setHiddenKeys(
        keys.filter((k) => valid.has(k) && !locked.has(k))
      );
    },
    [availableKeys, lockedKeys]
  );

  const reset = useCallback(() => {
    setHiddenKeys([]);
  }, []);

  const isHidden = useCallback(
    (key: TKey) => hiddenKeys.includes(key),
    [hiddenKeys]
  );

  return { hiddenKeys, toggle, setHidden, reset, isHidden };
}