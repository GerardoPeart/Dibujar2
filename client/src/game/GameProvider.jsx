import { createContext, useContext, useState } from "react";
const GameCtx = createContext(null);

export function GameProvider({ children }) {
  const [mode, setMode] = useState("free");
  const [drawerId, setDrawerId] = useState(null);
  const [scores, setScores] = useState({});
  const [secretWord, setSecretWord] = useState(null);
  const [endsAt, setEndsAt] = useState(null);

  const value = { mode, setMode, drawerId, setDrawerId, scores, setScores, secretWord, setSecretWord, endsAt, setEndsAt };
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}
export const useGame = () => useContext(GameCtx);