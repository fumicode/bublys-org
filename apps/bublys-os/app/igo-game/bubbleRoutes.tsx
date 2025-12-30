"use client";

import { BubbleRoute } from "../bubble-ui/BubblesUI/domain/bubbleRoutes";
import { IgoGameFeature } from "./feature";

/**
 * 囲碁ゲーム - メインバブル
 */
const IgoGameBubble: BubbleRoute["Component"] = () => {
  return <IgoGameFeature />;
};

/**
 * 囲碁ゲーム機能のバブルルート定義
 */
export const igoGameBubbleRoutes: BubbleRoute[] = [
  {
    pattern: /^igo-game$/,
    type: "igo-game",
    Component: IgoGameBubble,
  },
];
