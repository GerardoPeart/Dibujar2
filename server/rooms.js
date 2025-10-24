// rooms.js
const rooms = new Map();
// shape: { mode, players:{[socketId]:{user}}, scores:{}, drawerId, word }

function ensureRoom(roomName) {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, {
      mode: "free",
      players: {},
      scores: {},
      drawerId: null,
      word: null,
    });
  }
  return rooms.get(roomName);
}

module.exports = { rooms, ensureRoom };
