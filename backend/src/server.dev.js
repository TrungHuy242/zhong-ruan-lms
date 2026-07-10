require("dotenv").config();
process.env.NODE_ENV = "development";

const http = require("http");
const app = require("./app");
const { setupSocketIO } = require("./sockets");

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
setupSocketIO(httpServer);

httpServer.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT} (NODE_ENV=${process.env.NODE_ENV})`
  );
});