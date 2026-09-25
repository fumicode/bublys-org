"use client";
import type { BubbleRoute } from "@bublys-org/bubbles-ui";
import { LauncherBubble } from "../feature/LauncherBubble.js";

/** ランチャーのバブルルート。OS 側が BubbleRouteRegistry に登録する */
export const launcherBubbleRoutes: BubbleRoute[] = [
  {
    pattern: "launchers/:launcherId",
    type: "launcher",
    Component: LauncherBubble,
    bubbleOptions: { defaultSize: { width: 220, height: 360 } },
  },
];
