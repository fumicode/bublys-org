"use client";

import { useContext } from "react";
import { BubbleRoute, BubblesContext, deleteProcessBubble, removeBubble } from "@bublys-org/bubbles-ui";
import { IgoWorldLineManager } from "../world-line/integrations/IgoWorldLineManager";
import { IgoWorldLineIntegration } from "../world-line/integrations/IgoWorldLineIntegration";
import { useAppDispatch } from "@bublys-org/state-management";

/**
 * 囲碁ゲーム - メインバブル（世界線統合版）
 */
const IgoGameBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const gameId = bubble.url.replace("igo-game/", "");
  const { openBubble } = useContext(BubblesContext);

  const handleOpenWorldLineView = () => {
    openBubble(`igo-game/${gameId}/history`, bubble.id);
  };

  return (
    <IgoWorldLineManager
      gameId={gameId}
      isBubbleMode={false}
      onOpenWorldLineView={handleOpenWorldLineView}
      onCloseWorldLineView={() => {}}
    >
      <IgoWorldLineIntegration gameId={gameId} />
    </IgoWorldLineManager>
  );
};

/**
 * 囲碁ゲーム - 世界線ビューバブル
 */
const IgoGameWorldLinesBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const gameId = bubble.url.replace("igo-game/", "").replace("/history", "");
  const dispatch = useAppDispatch();

  const handleCloseWorldLineView = () => {
    dispatch(deleteProcessBubble(bubble.id));
    dispatch(removeBubble(bubble.id));
  };

  return (
    <IgoWorldLineManager
      gameId={gameId}
      isBubbleMode={true}
      onOpenWorldLineView={() => {}}
      onCloseWorldLineView={handleCloseWorldLineView}
    >
      <IgoWorldLineIntegration gameId={gameId} />
    </IgoWorldLineManager>
  );
};

/**
 * 囲碁ゲーム機能のバブルルート定義
 */
export const igoGameBubbleRoutes: BubbleRoute[] = [
  {
    pattern: /^igo-game\/[^/]+\/history$/,
    type: "igo-game-history",
    Component: IgoGameWorldLinesBubble,
    bubbleOptions: { contentBackground: "transparent" },
  },
  {
    pattern: /^igo-game\/[^/]+$/,
    type: "igo-game",
    Component: IgoGameBubble,
    bubbleOptions: { contentBackground: "transparent" },
  },
];
