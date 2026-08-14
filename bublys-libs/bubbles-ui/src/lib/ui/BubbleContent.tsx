'use client';
import { FC, memo } from "react";
import { Bubble } from "../Bubble.domain.js";
import { BubbleRouteRegistry } from "../bubble-routing/BubbleRouteRegistry.js";
import { CurrentBubbleContext } from "../context/CurrentBubbleContext.js";

/**
 * BubbleContentコンポーネント
 * バブルのURLに基づいてコンテンツをレンダリングする
 * paramsはBubble作成時に解決済み
 */
export const BubbleContent: FC<{ bubble: Bubble }> = memo(({ bubble }) => {
  const route = BubbleRouteRegistry.matchRoute(bubble.url);
  const Renderer = route?.Component;

  if (Renderer) {
    return (
      <CurrentBubbleContext.Provider value={bubble.id}>
        <Renderer bubble={bubble} />
      </CurrentBubbleContext.Provider>
    );
  }

  return <div style={{ padding: 16 }}>Unknown bubble type: {bubble.type}</div>;
}, (prevProps, nextProps) => {
  return prevProps.bubble.id === nextProps.bubble.id &&
         prevProps.bubble.url === nextProps.bubble.url;
});
