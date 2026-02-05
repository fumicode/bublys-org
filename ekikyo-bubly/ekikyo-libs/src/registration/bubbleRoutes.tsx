"use client";

import { useContext } from "react";
import { BubbleRoute, BubblesContext } from "@bublys-org/bubbles-ui";
import { FloatingKotenTeiiban } from "../view/FloatingKotenTeiiban.js";
import { KyuseiName } from "../domain/kyusei-types.js";

// 易経 - 九星盤バブル
const FloatingKotenTeiibanBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const match = bubble.url.match(/^ekikyo\/kyuseis\/([^/]+)$/);
  const kyuseiName = match?.[1] as KyuseiName;

  return (
    <>
      {kyuseiName}
      <FloatingKotenTeiiban
        onClickKyusei={(kyusei: KyuseiName) => {
          openBubble(`ekikyo/kyuseis/${kyusei}`, bubble.id);
        }}
        centerKyusei={kyuseiName}
      />
    </>
  );
};

/** 易経機能のバブルルート定義 */
export const ekikyoBubbleRoutes: BubbleRoute[] = [
  {
    pattern: /^ekikyo\/kyuseis\/[^/]+$/,
    type: "gogyo",
    Component: FloatingKotenTeiibanBubble,
  },
];
