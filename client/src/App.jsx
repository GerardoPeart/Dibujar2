import { useEffect, useRef, useState } from "react";
import "./App.css";
import { io } from "socket.io-client";

function App() {



  const headerRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  // socket
  const socketRef = useRef(null);

  // leer sala (?room=abc) si quieres usar rooms desde ya
  const params = new URLSearchParams(location.search);
  let room = params.get("room");
  if (!room) {
    room = Math.random().toString(36).slice(2, 8); // ej: "k3f9az"
    const url = `${location.pathname}?room=${room}`;
    history.replaceState(null, "", url); // no recarga
  }

  // estado de conexión para mostrar en UI
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Si usas PROXY de Vite: sin URL
    const socket = io({ query: { room } });

    // Si NO usas proxy, comenta la línea de arriba y usa:
    // const socket = io("http://localhost:3000", { query: { room } });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      console.log("✅ socket connected", socket.id);
    });

    socket.on("draw", ({ x0, y0, x1, y1, color, size, isEraser }) => {
      console.log("📥 chat:message (client):", payload);
      drawSegmentRemote(x0, y0, x1, y1, color, size, isEraser);
    });

    socket.on("clear", () => {
      clearCanvas(); // cuando otro limpia, yo limpio
    });

    socket.emit("chat:join", { room: room || "global", user });

    socket.on("chat:message", (payload) => {
      console.log("📥 chat:message (client):", payload);
      payload.me == false;
      setMessages((msgs) => [...msgs, { ...payload, type: "msg" }]);
    });

    socket.on("chat:system", (payload) => {
      //console.log("📥 chat:message (client):", payload);
      setMessages((msgs) => [...msgs, { ...payload, type: "system" }]);
    });

    socket.on("disconnect", (reason) => {
      setConnected(false);
      console.log("❌ socket disconnected:", reason);
    });

    return () => {
      socket.off("draw");
      socket.off("clear");
      socket.off("chat:message");
      socket.off("chat:system");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [room]);

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
  const drawSegment = (x0, y0, x1, y1) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

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
    ctx.lineWidth = rSize;                         // <- usa rSize del payload
    ctx.strokeStyle = rIsEraser ? "#ffffff" : rColor; // <- usa rColor del payload
    ctx.globalCompositeOperation = rIsEraser ? "destination-out" : "source-over";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  };

  // Enviar un segmento a los demás clientes
  const emitDraw = (x0, y0, x1, y1) => {
    const sock = socketRef.current;
    if (!sock) return;
    sock.emit("draw", {
      x0, y0, x1, y1,
      color,
      size,
      isEraser,
    });
  };
  // Convierte evento mouse/touch a coords relativas
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // Manejo de eventos de dibujo
  const start = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    lastRef.current = getPos(e);
  };

  const move = (e) => {
    if (!drawingRef.current) return;
    const pos = getPos(e);
    const last = lastRef.current;
    drawSegment(last.x, last.y, pos.x, pos.y);
    // 🔌 Enviar este segmento a los demás
    emitDraw(last.x, last.y, pos.x, pos.y);
    lastRef.current = pos;
  };

  const end = () => {
    drawingRef.current = false;
    lastRef.current = null;
  };
  // Función para limpiar el canvas
  const clearCanvas = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const headerH = headerRef.current?.offsetHeight || 64;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight - headerH);
  };

  // Ajusta el tamaño del canvas al de la ventana
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const headerH = headerRef.current?.offsetHeight || 64;
    const dpr = window.devicePixelRatio || 1;

    // Usa el ancho del padre del canvas (el contenedor que lo envuelve)
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
    socketRef.current?.emit("chat:message", payload);
    setNewMessage("");
  };

  return (
    <div className="app">
      <header ref={headerRef} className="toolbar">
        <div className="toolbar-inner">
          <h1>Dibujo colaborativo</h1>
          <div className="controls">
            <label>
              Color
              <input type="color" defaultValue="#000000" value={color} onChange={(e) => setColor(e.target.value)} />
            </label>

            <label>
              Grosor
              <input type="range" min="1" max="30" defaultValue="4" value={size} onChange={(e) => setSize(e.target.value)} />
            </label>

            <button className="active" title="Pluma" onClick={() => setIsEraser(false)}>Pluma</button>
            <button title="Borrador" onClick={() => setIsEraser(true)}>Borrador</button>
            <button onClick={() => { clearCanvas(); socketRef.current?.emit("clear"); }} title="Limpiar">Limpiar</button>

            <span className="room">
              {connected ? "🟢 Conectado" : "🔴 Desconectado"} — {room ? `Sala: ${room}` : "Sala: global"}
            </span>
            <button
              onClick={async () => {
                const url = location.href;
                await navigator.clipboard.writeText(url);
                alert("Link copiado ✅");
              }}
            >
              Copiar invitación
            </button>
            <button
              onClick={() => {
                const canvas = canvasRef.current;
                const link = document.createElement("a");
                link.href = canvas.toDataURL("image/png");
                link.download = `dibujo-${Date.now()}.png`;
                link.click();
              }}
            >
              Descargar PNG
            </button>

          </div>
        </div>
      </header>

      {/* Lienzo (aún no dibuja) */}
      <canvas
        ref={canvasRef}
        className="board"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
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
