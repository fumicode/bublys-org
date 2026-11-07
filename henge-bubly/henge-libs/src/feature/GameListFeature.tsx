"use client";
import { FC, useCallback, useContext } from "react";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { useHengeGame } from "./HengeGameProvider.js";
import { GameListView } from "../ui/GameListView.js";

/** 一覧 ── ここから**いくつでも**ゲームを立ち上げられる */
export const GameListFeature: FC = () => {
  const { openBubble } = useContext(BubblesContext);
  const { gameIds, addGame, deleteGame } = useHengeGame();

  const handleCreate = useCallback(() => {
    const id = crypto.randomUUID();
    addGame(id);
    openBubble(`henge/games/${id}`, "root");
  }, [addGame, openBubble]);

  return <GameListView gameIds={gameIds} onCreate={handleCreate} onDelete={deleteGame} />;
};
