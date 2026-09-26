'use client';
import { FC, memo } from "react";
import { Bubble, CurrentBubbleContext } from "@bublys-org/bubbles-ui";
import { matchBubbleRoute } from "../domain/bubbleRoutes";

/**
 * BubbleContentコンポーネント
 * memo化して、bubbleのid・url・大きさが同じなら再レンダリングをスキップ。
 * paramsはBubble作成時に解決済み。
 *
 * 大きさを見るのは、中身が「描ける大きさ」で見せ方を変えることがあるから
 * （ランチャーは幅が足りなければアイコンだけにし、縦横も入る数で決める）。
 * 位置やレイヤーが変わっただけでは描き直さない。
 */
export const BubbleContent: FC<{ bubble: Bubble }> = memo(({ bubble }) => {
  const route = matchBubbleRoute(bubble.url);
  const Renderer = route?.Component;

  if (Renderer) {
    return (
      <CurrentBubbleContext.Provider value={bubble.id}>
        <Renderer bubble={bubble} />
      </CurrentBubbleContext.Provider>
    );
  }

  return <div>Unknown bubble type: {bubble.type}</div>;
}, (prevProps, nextProps) => {
  // id・url・大きさが同じなら再レンダリング不要
  const prev = prevProps.bubble;
  const next = nextProps.bubble;
  return prev.id === next.id &&
         prev.url === next.url &&
         prev.size?.width === next.size?.width &&
         prev.size?.height === next.size?.height;
});
