import React from "react";

export default {
  name: "pictionary",

  ToolbarExtra: ({ socket }) => (
    <button onClick={() => socket.emit("game:event", { type: "game:startRound" })}>
      Nueva ronda
    </button>
  ),

  Banner: ({ socket, meId, drawerId, secretWord, timeLeft }) => (
    <div className="pictionary-banner px-2">
      {meId === drawerId
        ? <>Eres el dibujante — palabra: <b>{secretWord || "…"}</b> {timeLeft ? `· ⏱ ${timeLeft}s` : ""}</>
        : <>Dibuja: <b>{drawerId ? drawerId.slice(-4) : "—"}</b> {timeLeft ? `· ⏱ ${timeLeft}s` : ""}</>
      }
    </div>
  ),
};