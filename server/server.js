const express = require("express");
const http = require("http");
const cors = require("cors");          // ← usa 'cors' (no 'cores')
const path = require("path");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

// 👉 SERVIR el build de React (Vite genera client/dist)
app.use(express.static(path.join(__dirname, "..", "client", "dist")));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// --- Sockets ---
io.on("connection", (socket) => {
  const { room } = socket.handshake.query || {};
  const roomName = room || "global";
  socket.join(roomName);

  console.log(`➡️ conectado: ${socket.id} en sala "${roomName}"`);

  socket.on("draw", (payload) => {
    console.log(`🖊️ draw de ${socket.id} -> sala "${roomName}"`, payload);
    socket.to(roomName).emit("draw", payload);
  });

  socket.on("clear", () => {
    console.log(`🧹 clear de ${socket.id} -> sala "${roomName}"`);
    socket.to(roomName).emit("clear");
  });

  socket.on("disconnect", () => {});
});

// 👉 CATCH-ALL: para cualquier ruta del frontend manda index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
