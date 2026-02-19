"use client";

import { FC, useCallback, useContext } from "react";
import { IgoGame_囲碁ゲーム } from "@bublys-org/sekaisen-igo-model";
import { useCasScope } from "@bublys-org/world-line-graph";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { IgoBoardView, GameInfoView } from "../view/IgoBoardView.js";
import { gameScopeId } from "./IgoGameProvider.js";

export type IgoGameFeatureProps = {
  gameId: string;
  bubbleId?: string;
};

export const IgoGameFeature: FC<IgoGameFeatureProps> = ({ gameId, bubbleId }) => {
  const { openBubble } = useContext(BubblesContext);

  const scope = useCasScope(gameScopeId(gameId), {
    initialObjects: [
      {
        type: "igo-game",
        object: IgoGame_囲碁ゲーム.create(gameId, 9),
      },
    ],
  });

  const gameShell = scope.getShell<IgoGame_囲碁ゲーム>("igo-game", gameId);
  const game = gameShell?.object ?? null;

  const handleIntersectionClick = useCallback(
    (row: number, col: number) => {
      if (!gameShell) return;
      gameShell.update((g) => g.placeStone(row, col));
    },
    [gameShell]
  );

  const handlePass = useCallback(() => {
    if (!gameShell) return;
    gameShell.update((g) => g.pass());
  }, [gameShell]);

  const handleResign = useCallback(() => {
    if (!gameShell) return;
    gameShell.update((g) => g.resign());
  }, [gameShell]);

  const handleNewGame = useCallback(() => {
    if (!gameShell) return;
    gameShell.update(() => IgoGame_囲碁ゲーム.create(gameId, 9));
  }, [gameShell, gameId]);

  // 待った → moveBack + 世界線バブルをpopChild
  const handleUndo = useCallback(() => {
    scope.moveBack();
    if (bubbleId) {
      openBubble(`sekaisen-igo/games/${gameId}/history`, bubbleId);
    }
  }, [scope, openBubble, gameId, bubbleId]);

  if (!game) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#666",
        }}
      >
        対局が見つかりません
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        padding: 16,
        alignItems: "flex-start",
        height: "100%",
        overflow: "auto",
      }}
    >
      <IgoBoardView game={game} onIntersectionClick={handleIntersectionClick} />
      <GameInfoView
        game={game}
        onPass={handlePass}
        onResign={handleResign}
        onNewGame={handleNewGame}
        canUndo={scope.canUndo}
        canRedo={scope.canRedo}
        onUndo={handleUndo}
        onRedo={scope.moveForward}
      />
    </div>
  );
};
