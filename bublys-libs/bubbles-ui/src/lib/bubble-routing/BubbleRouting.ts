import { FC, createContext } from "react";
import { Bubble, BubbleOptions } from "../Bubble.domain.js";
import { Size2 } from "../00_Point.js";
import { CoordinateSystem } from "../SmartRect.js";
import { OpeningPosition } from "@bublys-org/bubbles-ui-state";

// BubbleContentRenderer型
export type BubbleContentRendererProps = {
  bubble: Bubble;
};

export type BubbleContentRenderer = FC<BubbleContentRendererProps>;

// BubbleRoute型
export type BubbleRoute = {
  pattern: RegExp;
  type: string;
  Component: BubbleContentRenderer;
  bubbleOptions?: BubbleOptions;
};

// BubblesContext型
export type BubblesContextType = {
  pageSize?: Size2;
  surfaceLeftTop: { x: number; y: number };
  coordinateSystem: CoordinateSystem;
  openBubble: (name: string, openerBubbleId: string, openingPosition?: OpeningPosition) => string;
};

export const BubblesContext = createContext<BubblesContextType>({
  pageSize: { width: 1000, height: 1000 },
  surfaceLeftTop: { x: 0, y: 0 },
  coordinateSystem: CoordinateSystem.GLOBAL,
  openBubble(name, openerBubbleId) {
    console.warn("openBubble not implemented");
    return "void_id";
  },
});

// ルートマッチングユーティリティ
export const matchBubbleRoute = (routes: BubbleRoute[], url: string): BubbleRoute | undefined =>
  routes.find((route) => route.pattern.test(url));
