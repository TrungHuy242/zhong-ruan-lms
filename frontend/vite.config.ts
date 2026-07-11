import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import type { ProxyOptions } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Dev: Vite proxy forwards /api → backend so we can use relative URL.
  // Prod: VITE_API_BASE_URL must be set to the absolute backend URL (no proxy).
  const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:5000";

  // Proxy options dùng chung cho /api (và /uploads nếu cần).
  // Lý do cấu hình chi tiết:
  //   - Multipart upload (avatar, file upload) rất dễ bị ERR_CONNECTION_RESET /
  //     ERR_CONNECTION_ABORTED nếu proxy không buffer đúng cách.
  //   - Browser multipart cần giữ raw stream từ client → backend; bật
  //     `selfHandleResponse: false` (mặc định) + `changeOrigin: true` là đủ
  //     cho hầu hết case.
  //   - Tăng timeout/proxyTimeout để upload file lớn không bị ngắt giữa chừng.
  const apiProxy: ProxyOptions = {
    target: proxyTarget,
    changeOrigin: true,
    secure: false,
    // multipart upload cần streaming passthrough; đây là mặc định nhưng
    // comment lại để dễ hiểu intent khi bảo trì.
    // selfHandleResponse: false,
    // Nếu backend hỗ trợ WebSocket / Socket.io, cần bật ws.
    ws: true,
    // 5 phút cho upload lớn — mặc định 0s (server-proxy timeout) có thể
    // làm multipart bị ngắt khi client mạng chậm.
    proxyTimeout: 5 * 60 * 1000,
    timeout: 5 * 60 * 1000,
  };

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": apiProxy,
        // /uploads serve file vật lý (avatar) — proxy qua backend cho gọn
        // khi dev. Production nên serve trực tiếp qua nginx/CDN.
        "/uploads": apiProxy,
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
    },
  };
});
