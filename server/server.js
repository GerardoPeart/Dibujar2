
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

// 👉 Servir el build del frontend (Vite genera client/dist)
app.use(express.static(path.join(__dirname, "..", "client", "dist")));

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// --- WebSockets ---
io.on("connection", (socket) => {
  const { room } = socket.handshake.query || {};
  const roomName = room || "global";
  socket.join(roomName);

  console.log(`➡️ conectado: ${socket.id} en sala "${roomName}"`);

  socket.on("draw", (payload) => {
    socket.to(roomName).emit("draw", payload);
  });

  socket.on("clear", () => {
    socket.to(roomName).emit("clear");
  });
});

// ⛔ Express 5 ya no acepta "*".
// ✅ Regex que excluye /socket.io para no romper los websockets
app.get(/^\/(?!socket\.io).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server on", PORT));
