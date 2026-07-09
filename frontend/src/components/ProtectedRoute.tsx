import { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authStorage } from "../lib/authStorage";

export interface ProtectedRouteProps {
  children: ReactElement;
}

/**
 * ProtectedRoute — chặn truy cập route nếu chưa có access token.
 * - Không có token → redirect /login, lưu pathname vào state.from để login xong quay lại.
 * - Có token → render children.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const token = authStorage.getAccessToken();

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}
