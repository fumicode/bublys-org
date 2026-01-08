'use client';
import { FC, memo } from "react";
import { Bubble } from "@bublys-org/bubbles-ui";
import { matchBubbleRoute } from "../domain/bubbleRoutes";

/**
 * BubbleContentコンポーネント
 * memo化して、bubbleのidとurlが同じなら再レンダリングをスキップ
 */
export const BubbleContent: FC<{ bubble: Bubble }> = memo(({ bubble }) => {
  const route = matchBubbleRoute(bubble.url);
  const Renderer = route?.Component;

  if (Renderer) {
    return <Renderer bubble={bubble} />;
  }

  return <div>Unknown bubble type: {bubble.type}</div>;
}, (prevProps, nextProps) => {
  // idとurlが同じなら再レンダリング不要
  return prevProps.bubble.id === nextProps.bubble.id &&
         prevProps.bubble.url === nextProps.bubble.url;
});
