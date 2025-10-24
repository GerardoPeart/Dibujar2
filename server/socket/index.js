// server/socket/index.js
const clients = new Map(); // clientId -> socketId
const { ensureRoom } = require("../rooms");
const { getGame } = require("../games");

function attachSocketIO(io) {
    io.on("connection", (socket) => {
        const { room, clientId } = socket.handshake.query || {};
        const roomName = room || "global";
        socket.join(roomName);

        // 🔒 Anti-duplicados: si ya había un socket para ese clientId, desconéctalo
        if (clientId) {
            const prevId = clients.get(clientId);
            if (prevId && prevId !== socket.id) {
                const prevSock = io.sockets.sockets.get(prevId);
                if (prevSock) {
                    console.log(`♻️ Reemplazo conexión: ${clientId} prev=${prevId} new=${socket.id}`);
                    prevSock.disconnect(true);
                }
            }
            clients.set(clientId, socket.id);


        }

        console.log(`✅ conectado ${socket.id} -> room "${roomName}"`);
        //JUEGOS

        const state = ensureRoom(roomName);
        state.players[socket.id] = state.players[socket.id] || { user: socket.id.slice(-4) };
        state.scores[socket.id] = state.scores[socket.id] || 0;

        // Estado inicial del juego
        io.to(socket.id).emit("game:state", getGame(state.mode).serialize(state));

        // Cambiar modo
        socket.on("game:setMode", ({ mode }) => {
            console.log(`Modo cambiado a ${mode} en room "${roomName}"`);
            state.mode = mode === "pictionary" ? "pictionary" : "free";
            getGame(state.mode).onModeEnter(state);
            io.to(roomName).emit("game:state", getGame(state.mode).serialize(state));
            });

            // Eventos específicos del juego
            socket.on("game:event", ({ type, payload }) => {
                const game = getGame(state.mode);
                game.onClientEvent(io, socket, roomName, state, type, payload);
            });


            // CHAT
            socket.on("chat:message", (payload) => {
                console.log("Chat:", payload);
                io.to(roomName).emit("chat:message", payload);

            });


            // DRAW
            socket.on("draw", (payload) => {

                const game = getGame(state.mode);
                if (!game.canDraw(socket, state)) return;
                socket.to(roomName).emit("draw", payload);
            });

            socket.on("clear", () => {
                console.log("Clear:");
                socket.to(roomName).emit("clear");
            });

            socket.on("disconnect", (reason) => {
                console.log(`❌ desconectado ${socket.id} (${reason}) from room "${roomName}"`);
            });
        });
    }

module.exports = { attachSocketIO };

