import { Bubble } from "@bublys-org/bubbles-ui";
import { FC } from "react";

export type BubbleContentRendererProps = {
  bubble: Bubble;
};

export type BubbleContentRenderer = FC<BubbleContentRendererProps>;
