# Realtime (Socket.io)

Backend Socket.io được mount vào cùng HTTP server với REST API (`src/server.js`,
`src/server.dev.js`, `src/server.prod.js` đều đi qua `http.createServer(app)` rồi
`setupSocketIO(httpServer)`).

## Cấu trúc

```
src/sockets/
  ├── index.js         # setupSocketIO(httpServer) + getIO()
  ├── socketAuth.js    # io.use(...) verify JWT, set socket.data.{userId,role,email}
  └── socketRooms.js   # helper đặt tên rooms: user:<id>, role:<ROLE>
```

## Auth

Client (FE) phải gửi accessToken qua `socket.handshake.auth.token`:

```ts
import { io } from "socket.io-client";
const socket = io(import.meta.env.VITE_API_URL, {
  auth: { token: accessToken },
  transports: ["websocket"],
});
```

- Backend reuse hàm `verifyToken` từ `src/utils/jwt.js` (cùng logic với REST
  `auth.middleware.js`).
- Nếu token invalid / hết hạn → connection bị reject với error message
  `UNAUTHENTICATED: ...`.
- Nếu user không tồn tại hoặc `status !== ACTIVE` → reject với message tương ứng.
- Sau khi pass, `socket.data.userId`, `socket.data.role`, `socket.data.email`
  được set, dùng để route events.

## Rooms

Mỗi client tự động join 2 room khi connect:

| Room           | Mục đích                                                     |
| -------------- | ------------------------------------------------------------ |
| `user:<id>`    | Gửi thông báo cá nhân + đồng bộ mark-read giữa các tab.    |
| `role:<ROLE>`  | Broadcast theo role (ADMIN / TEACHER / STUDENT, lowercase). |

## Events

Server → Client:

| Event                | Payload                                                    | Khi nào                                                        | Nhận bởi                       |
| -------------------- | ---------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| `notification:new`   | `{ id, title, contentPreview, type, createdAt, isRead, target?, role?, recipientCount? }` | REST POST `/api/notifications` với `target` = `user` / `role` / `all` | Room `user:<id>`, `role:<ROLE>`, hoặc toàn bộ clients (`io.emit`) |
| `notification:read`  | `{ id }` (id = id noti, hoặc chuỗi `"all"` cho mark-all-read) | REST PUT `/notifications/:id/read` hoặc `/notifications/read-all` | Room `user:<id>` của chính user |

Payload KHÔNG bao gồm `message` đầy đủ — chỉ `contentPreview` (tối đa 120 ký
tự, có dấu `…`). FE dùng để update badge / prepend vào list, không cần gọi lại
API; vẫn nên gọi API khi user mở detail.

## Endpoint debug

- `GET /api/health/socket` → `{ status, clientsCount, path, corsOrigin }`
- `GET /api/health` → `{ status: "ok" }` (giữ nguyên như cũ)

## Backward-compat

Endpoint `POST /api/notifications` chấp nhận cả:

```jsonc
// Cũ: chỉ định user
{ "userId": 5, "title": "...", "message": "...", "type": "INFO" }

// Mới: broadcast theo role
{ "target": "role", "role": "TEACHER", "title": "...", "message": "...", "type": "INFO" }

// Mới: broadcast cho tất cả user active
{ "target": "all", "title": "...", "message": "...", "type": "INFO" }
```

Payload cũ vẫn chạy bình thường (target mặc định = `user`). Response shape vẫn
là `{ message, data: { notification } }`; với target=`role`/`all`, `notification`
chứa `{ target, role?, recipientCount, sample }`.

## Smoke test

```
node test-socket-realtime.js
```

Script tự login admin + teacher, mở 3 socket, POST broadcast `all`, `role:
TEACHER`, mark-read đơn và mark-all-read, verify cả events + rejection token.
