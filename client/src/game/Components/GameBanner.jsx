import { useGame } from "../GameProvider";
import { getEngine } from "../engines";

export default function GameBanner({ socketId, timeLeft }) {
  const { mode, drawerId, secretWord } = useGame();
  const Engine = getEngine(mode);
  if (!Engine.Banner) return null;
  return (
    <Engine.Banner
      socketId={socketId}
      meId={socketId}
      drawerId={drawerId}
      secretWord={secretWord}
      timeLeft={timeLeft}
    />
  );
}