// games/pictionary.js
const WORDS = ["gato","casa","árbol","coche","sol","luna","pizza","robot","avión","montaña"];
const normalize = (s) => (s||"").normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase().trim();

module.exports = {
  name: "pictionary",

  canDraw: (socket, state) => socket.id === state.drawerId,

  onModeEnter: (state) => {
    state.drawerId = null;
    state.word = null;
  },

  startRound(io, roomName, state) {
    const ids = Object.keys(state.players);
    if (!ids.length) return;
    state.drawerId = ids[Math.floor(Math.random() * ids.length)];
    state.word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const endsAt = Date.now() + 60_000;

    io.to(roomName).emit("game:round", { drawerId: state.drawerId, endsAt });
    io.to(state.drawerId).emit("game:secretWord", { word: state.word });
  },

  onClientEvent(io, socket, roomName, state, event, payload) {
    if (event === "game:startRound") return this.startRound(io, roomName, state);

    if (event === "game:guess") {
      const { guess, user } = payload || {};
      if (!state.word) return;
      if (normalize(guess) === normalize(state.word)) {
        state.scores[socket.id] = (state.scores[socket.id] || 0) + 1;
        io.to(roomName).emit("game:correct", {
          winnerId: socket.id,
          user,
          word: state.word,
          scores: state.scores,
        });
        state.word = null;
        state.drawerId = null;
        io.to(roomName).emit("game:state", this.serialize(state));
      }
    }
  },

  serialize(state) {
    return { mode: "pictionary", drawerId: state.drawerId, scores: state.scores };
  },
};
