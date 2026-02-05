'use client';
import { FC, memo } from "react";
import { Bubble, BubbleRouteRegistry } from "@bublys-org/bubbles-ui";

/**
 * BubbleContentコンポーネント
 * ekikyo専用のバブルコンテンツレンダラー
 */
export const BubbleContent: FC<{ bubble: Bubble }> = memo(({ bubble }) => {
  const route = BubbleRouteRegistry.matchRoute(bubble.url);
  const Renderer = route?.Component;

  if (Renderer) {
    return <Renderer bubble={bubble} />;
  }

  return <div style={{ padding: 16 }}>Unknown bubble type: {bubble.type}</div>;
}, (prevProps, nextProps) => {
  return prevProps.bubble.id === nextProps.bubble.id &&
         prevProps.bubble.url === nextProps.bubble.url;
});
