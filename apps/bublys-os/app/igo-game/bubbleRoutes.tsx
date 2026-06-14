"use client";

import { useContext } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import { IgoWorldLineIntegration } from "../world-line/integrations/IgoWorldLineIntegration";
import { IgoWorldLineCanvas } from "../world-line/integrations/IgoWorldLineCanvas";
import { IgoGameCollection } from "./ui";

/**
 * 囲碁ゲーム - メインバブル（world-line-graph 統合版）
 */
const IgoGameBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const gameId = bubble.url.replace("igo-game/", "");
  const { openBubble } = useContext(BubblesContext);

  const handleOpenWorldLineView = () => {
    openBubble(`igo-game/${gameId}/history`, bubble.id);
  };

  return (
    <IgoWorldLineIntegration gameId={gameId} onOpenWorldLineView={handleOpenWorldLineView} />
  );
};

/**
 * 囲碁ゲーム - 世界線ビューバブル（canvas）
 */
const IgoGameWorldLinesBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const gameId = bubble.url.replace("igo-game/", "").replace("/history", "");
  return <IgoWorldLineCanvas gameId={gameId} />;
};

/**
 * 囲碁ゲーム - 対局一覧バブル
 */
const IgoGamesBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  return (
    <IgoGameCollection
      buildDetailUrl={(gameId) => `igo-game/${gameId}`}
      onGameClick={(_gameId, detailUrl) => openBubble(detailUrl, bubble.id)}
    />
  );
};

/**
 * 囲碁ゲーム機能のバブルルート定義
 */
export const igoGameBubbleRoutes: BubbleRoute[] = [
  {
    pattern: /^igo-games$/,
    type: "igo-games",
    Component: IgoGamesBubble,
  },
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
