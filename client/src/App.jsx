import { useEffect, useRef, useState } from "react";
import "./App.css";
import { io } from "socket.io-client";
import { useGame } from "./game/GameProvider.jsx";
import { useGameSocket } from "./game/useGameSocket.js";
import GameToolbar from "./game/Components/GameToolBar.jsx";
import GameBanner from "./game/Components/GameBanner.jsx";
import { getEngine } from "./game/engines";

function App() {



  const headerRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  // ----- Juego (contexto global) -----
  const { mode, drawerId } = useGame();

  // ----- Sala (room) desde la URL -----
  const params = new URLSearchParams(location.search);
  const room = params.get("room") || "";

  // socket
  const socketRef = useRef(null);

  const { socket, connected, socketId, timeLeft } = useGameSocket(room);



  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    const onDraw = (p) => drawSegmentRemote(p.x0, p.y0, p.x1, p.y1, p.color, p.size, p.isEraser);
    const onClear = () => clearCanvas();
    const onChat = (msg) => setMessages((m) => [...m, { ...msg, type: "msg" }]);

    //s.emit("chat:join", { room: room || "global", user });
    s.on("draw", onDraw);
    s.on("clear", onClear);
    s.on("chat:message", onChat);

    return () => {
      s.off("draw", onDraw);
      s.off("clear", onClear);
      s.off("chat:message", onChat);
    };
  }, [socket]);


  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const drawingRef = useRef(false);
  const lastRef = useRef(null);
  //Estado de mensajes
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  // Dibuja un segmento entre (x0,y0) -> (x1,y1)
  const drawSegmentLocal = (x0, y0, x1, y1) => {
    const ctx = ctxRef.current; if (!ctx) return;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = size;
    ctx.strokeStyle = isEraser ? "#ffffff" : color;
    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  };

  const drawSegmentRemote = (x0, y0, x1, y1, rColor, rSize, rIsEraser) => {
    const ctx = ctxRef.current; if (!ctx) return;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = rSize;
    ctx.strokeStyle = rIsEraser ? "#ffffff" : rColor;
    ctx.globalCompositeOperation = rIsEraser ? "destination-out" : "source-over";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  };

  // Enviar un segmento a los demás clientes
  // emitir draw
  const emitDraw = (x0, y0, x1, y1) => {
    const s = socket.current; if (!s) return;
    s.emit("draw", { x0, y0, x1, y1, color, size, isEraser });
  };

  // ===== Reglas de “¿puedo dibujar?” según el modo activo =====
  const canDraw = () => {
    if (mode !== "pictionary") return true;
    return socketId && drawerId && socketId === drawerId; // solo el dibujante
  };
  // Convierte evento mouse/touch a coords relativas
  // ===== Handlers de interacción =====
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    if (!canDraw()) return;
    e.preventDefault();
    drawingRef.current = true;
    lastRef.current = getPos(e);
  };

  const move = (e) => {
    if (!drawingRef.current || !canDraw()) return;
    const pos = getPos(e);
    const last = lastRef.current;
    drawSegmentLocal(last.x, last.y, pos.x, pos.y);
    emitDraw(last.x, last.y, pos.x, pos.y);
    lastRef.current = pos;
  };

  const end = () => {
    drawingRef.current = false;
    lastRef.current = null;
  }
  // Función para limpiar el canvas
  const clearCanvas = () => {
    const ctx = ctxRef.current; if (!ctx) return;
    const headerH = headerRef.current?.offsetHeight || 64;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight - headerH);
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const headerH = headerRef.current?.offsetHeight || 64;
    const dpr = window.devicePixelRatio || 1;

    const parent = canvas.parentElement;
    const cssW = parent?.clientWidth || window.innerWidth;
    const cssH = Math.max(0, window.innerHeight - headerH);

    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";

    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));

    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctxRef.current = ctx;
  };

  // Efecto para ajustar al cargar y al redimensionar
  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);


  //Chat room

  //Identidad de usuario
  const [user] = useState(() => {
    const n = Math.random().toString(36).slice(2, 6);
    return `User-${n}`;
  });



  //Effecto para recibir mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  //Enviar mensaje
  const sendMessage = () => {
    if (newMessage.trim() === "") return;
    const payload = { room: room || "global", user, message: newMessage, ts: Date.now(), me: true };

    //setMessages((msgs) => [...msgs, { ...payload, type: "msg", me: true }]);
    const s = socket.current; if (!s) return;
    s.emit("chat:message", payload);
    setNewMessage("");
  };

  console.log("App render", { mode, drawerId, socketId, room });
  return (
    <div className="app">
      {/* ===== Toolbar superior ===== */}
      <header ref={headerRef} className="toolbar">
        <div className="toolbar-inner">
          <h1>Dibujo colaborativo</h1>

          <div className="controls">
            <label>
              Color
              <input type="color" value={color} onChange={e => setColor(e.target.value)} />
            </label>
            <label>
              Grosor
              <input type="range" min="1" max="30" value={size} onChange={e => setSize(Number(e.target.value))} />
            </label>

            <button className={isEraser ? "" : "active"} onClick={() => setIsEraser(false)}>Pluma</button>
            <button className={isEraser ? "active" : ""} onClick={() => setIsEraser(true)}>Borrador</button>

            <button onClick={() => { clearCanvas(); socket.current?.emit("clear"); }}>Limpiar</button>

            {/* === Selector de juego + acciones del modo === */}
            <GameToolbar socket={socket} />

            <span className="room">
              <span className={connected ? "dot on" : "dot off"} />
              {connected ? "Conectado" : "Desconectado"} — Sala: {room || "global"}
            </span>
          </div>
        </div>
      </header>

      {/* Lienzo (aún no dibuja) */}
      <div id="boardWrap" className="fixed left-0 right-0 bottom-0 top-[72px] bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-full block bg-black"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
      <GameBanner socketId={socketId} timeLeft={timeLeft} />
      <div className="chat">
        <div className="chat-header">Chat — {room ? `Sala: ${room}` : "Sala: global"}</div>

        <div className="chat-messages">
          {messages.map((m, i) => {
            const isMine = m.user === user; // comparar tu usuario local
            const cls =
              m.type === "system"
                ? "msg system"
                : `msg ${isMine ? "me" : "them"}`;
            const time = new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return (
              <div key={i} className={cls}>
                {m.type === "system" ? (
                  <div className="bubble system-bubble">{m.message}</div>
                ) : (
                  <div className="bubble-container">
                    <div className="meta">
                      {!isMine && <span className="user">{m.user}</span>}{" "}
                      <span className="time">{time}</span>
                    </div>
                    <div className="bubble">{m.message}</div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          <input
            placeholder="Escribe un mensaje…"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage}>Enviar</button>
        </div>
      </div>
    </div>
  );
}

export default App
