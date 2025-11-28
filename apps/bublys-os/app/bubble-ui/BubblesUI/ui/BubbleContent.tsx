'use client';
import { FC } from "react";
import { Bubble } from "@bublys-org/bubbles-ui";
import { matchBubbleRoute } from "../domain/bubbleRoutes";

export const BubbleContent: FC<{ bubble: Bubble }> = ({ bubble }) => {
  const route = matchBubbleRoute(bubble.name);
  const Renderer = route?.Component;

  if (Renderer) {
    return <Renderer bubble={bubble} />;
  }

  return <div>Unknown bubble type: {bubble.type}</div>;
};
