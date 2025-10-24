// Ejemplo en tu useGameSocket o directamente en App.jsx
import { useEffect, useRef, useState } from "react";
import { getSocket, closeSocket } from "../socket.js";

export function useGameSocket(room) {
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [socketId, setSocketId] = useState(null);
    const [gameMode, setGameMode] = useState("free");

    useEffect(() => {
        // Cierra anterior si ya existía (por cambio de room)
        closeSocket();

        const s = getSocket(room);
        socketRef.current = s;

        const onConnect = () => {
            setConnected(true);
            setSocketId(s.id);
            console.log("✅ conectado", s.id, "room:", room || "global");
        };
         const onMode = (payload) => {
            console.log("📥 game:mode recibido", payload);
            setGameMode(payload.mode); // tu estado de modo
        };
        const onDisconnect = (reason) => {
            setConnected(false);
            console.log("❌ disconnect:", reason);
        };
       

       

        s.on("connect", onConnect);
         s.on("game:mode", onMode);
        s.on("disconnect", onDisconnect);

        return () => {
            // Limpieza TOTAL (muy importante en dev con StrictMode/HMR)
            s.off("connect", onConnect);
            s.off("disconnect", onDisconnect);
            s.off("game:mode", onMode);
            // no cierres aquí si quieres que sobreviva a HMR; si ves dobles, usa closeSocket():
            closeSocket();
            socketRef.current = null;
        };
    }, [room]);

    return { socket: socketRef, connected, socketId };
}
