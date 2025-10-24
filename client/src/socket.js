// client/src/socket.js
import { io } from "socket.io-client";

let socket = null;

export function getSocket(room) {
  if (socket) return socket;

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || // si front/back separados, setéalo en el Static Site
    (import.meta.env.PROD ? window.location.origin : "http://localhost:3000");

  // Identificador estable para este navegador (para que el server detecte duplicados)
  let clientId = localStorage.getItem("clientId");
  if (!clientId) {
    clientId = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
    localStorage.setItem("clientId", clientId);
  }

  socket = io(BACKEND_URL, {
    path: "/socket.io",
    transports: ["websocket"],
    query: { room: room || "global", clientId },
    // Evita reconexiones infinitas que te generen múltiples sesiones si algo va mal:
    reconnectionAttempts: 5,
    reconnectionDelay: 500,
  });

  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
