require("dotenv").config();

const http = require("http");
const app = require("./app");
const { setupSocketIO } = require("./sockets");

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

// Socket.io gắn vào raw HTTP server (KHÔNG phải Express app) để dùng chung
// cùng port, không phá vỡ middleware / route đang chạy trên `app`.
setupSocketIO(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});