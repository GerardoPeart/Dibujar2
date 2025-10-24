import { useGame } from "../GameProvider";
import { getEngine } from "../engines";

export default function GameToolbar({ socket }) {
  const { mode, setMode } = useGame();
  const Engine = getEngine(mode);

  const changeMode = (newMode) => {
  setMode(newMode);
  socket.current?.emit("game:mode", { mode: newMode });
};

  
  return (
    <div className="game-toolbar m-2 flex items-center bg-red-500">
      <select
        value={mode}
        onChange={(e) => changeMode(e.target.value)}
        className="m-2 p-2 border rounded bg-red-500 text-black">
        <option className="bg-red-500" value="free">Libre</option>
        <option value="pictionary">Pictionary</option>
      </select>

      <Engine.ToolbarExtra socket={socket.current} />
    </div>
  );
}
