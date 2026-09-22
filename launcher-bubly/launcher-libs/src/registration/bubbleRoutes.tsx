"use client";
import type { BubbleRoute } from "@bublys-org/bubbles-ui";
import { LauncherBubble } from "../feature/LauncherBubble.js";
import { LauncherSettingsBubble } from "../feature/LauncherSettingsBubble.js";

/** ランチャー本体の url → 設定バブルの url */
export const launcherSettingsUrl = (launcherId: string): string => `launchers/${launcherId}/settings`;

/** ランチャーのバブルルート。OS 側が BubbleRouteRegistry に登録する */
export const launcherBubbleRoutes: BubbleRoute[] = [
  {
    pattern: "launchers/:launcherId",
    type: "launcher",
    Component: LauncherBubble,
    bubbleOptions: { defaultSize: { width: 220, height: 360 } },
  },
  {
    pattern: "launchers/:launcherId/settings",
    type: "launcher-settings",
    Component: LauncherSettingsBubble,
  },
];
