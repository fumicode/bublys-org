"use client";

import { FC, useContext } from "react";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { useIgoGame } from "./IgoGameProvider.js";

export const GameListFeature: FC = () => {
  const { openBubble } = useContext(BubblesContext);
  const { gameIds, addGame } = useIgoGame();

  const handleCreateGame = () => {
    const id = crypto.randomUUID();
    addGame(id);
    openBubble(`sekaisen-igo/games/${id}`, "root");
  };

  const handleOpenGame = (gameId: string) => {
    openBubble(`sekaisen-igo/games/${gameId}`, "root");
  };

  return (
    <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>対局一覧</h2>
        <button
          onClick={handleCreateGame}
          style={{
            padding: "8px 16px",
            background: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          新しい対局
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {gameIds.length === 0 ? (
          <div style={{ color: "#999", textAlign: "center", marginTop: 32 }}>
            対局がありません
          </div>
        ) : (
          gameIds.map((id) => (
            <div
              key={id}
              onClick={() => handleOpenGame(id)}
              style={{
                padding: 12,
                borderBottom: "1px solid #eee",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: "bold" }}>
                対局 #{id.slice(0, 8)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
