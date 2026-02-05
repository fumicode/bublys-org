"use client";

import { BubbleRoute } from "../bubble-ui/BubblesUI/domain/bubbleRoutes";
import { FloatingKotenTeiiban } from "./view/FloatingKotenTeiiban";
import { KyuseiName } from "./domain/kyusei-types";
import { BubblesContext } from "../bubble-ui/BubblesUI/domain/BubblesContext";
import { useContext } from "react";


// 学会シフト - 配置評価バブル
const FloatingKotenTeiibanBubble : BubbleRoute["Component"] = ({ bubble }) => {
  const {openBubble } = useContext(BubblesContext)
  const match = bubble.url.match(/^ekikyo\/kyuseis\/([^/]+)$/);
  const kyuseiName = match?.[1] as KyuseiName;

  return (
    <>
    {kyuseiName}
    <FloatingKotenTeiiban
      onClickKyusei={(kyusei: KyuseiName)=>{
        openBubble(`ekikyo/kyuseis/${kyusei}`, bubble.id)
      }}
      centerKyusei={kyuseiName}
    />
    </>
  );
};

/** 学会シフト機能のバブルルート定義 */
export const ekikyoBubbleRoutes: BubbleRoute[] = [
  { pattern: /^ekikyo\/kyuseis\/[^/]+$/, type: "gogyo", Component: FloatingKotenTeiibanBubble  },
];
