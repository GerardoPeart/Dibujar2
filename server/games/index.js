// games/index.js
const free = require("./free");
const pictionary = require("./pictionary");

const games = {
  free,
  pictionary,
};

function getGame(mode) {
  return games[mode] || games.free;
}

module.exports = { games, getGame };