"use client";

import { BubbleRoute } from "@bublys-org/bubbles-ui";
import { FloatingKotenTeiiban, KyuseiName } from "@bublys-org/ekikyo-libs";

// 易経 - 九星盤バブル
const FloatingKotenTeiibanBubble: BubbleRoute["Component"] = ({ bubble }) => {
  const kyuseiName = bubble.params.kyuseiName as KyuseiName;

  return (
    <>
      {kyuseiName}
      <FloatingKotenTeiiban
        buildKyuseiUrl={(kyusei: KyuseiName) => `ekikyo/kyuseis/${kyusei}`}
        centerKyusei={kyuseiName}
      />
    </>
  );
};

/** 易経機能のバブルルート定義 */
export const ekikyoBubbleRoutes: BubbleRoute[] = [
  {
    pattern: "ekikyo/kyuseis/:kyuseiName",
    type: "kyusei",
    Component: FloatingKotenTeiibanBubble,
  },
];
