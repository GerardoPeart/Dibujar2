
module.exports = {
  name: "free",
  canDraw: () => true,
  onModeEnter: (state) => { state.drawerId = null; state.word = null; },
  onClientEvent: () => {}, // sin eventos especiales
  serialize(state) { return { mode: "free", drawerId: null, scores: state.scores }; },
};
