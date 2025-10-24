// server/server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");
const { attachSocketIO } = require("./socket");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "..", "client", "dist")));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET","POST"] } });

attachSocketIO(io);

app.get(/^\/(?!socket\.io).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server on", PORT));
