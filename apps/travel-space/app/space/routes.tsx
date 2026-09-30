"use client";
/**
 * **この空間で何が開けるか。**
 *
 * ★ OS の標準バブリ（タスク・ユーザー・CSV・変換・囲碁…）は 1 つも載せない。
 *   載るのは**旅の 4 つ**（メモ・旅程・地図・アクティビティ）と、どの空間にも居てよい
 *   家具（世界線・見え方の口・ポケット）と、呼び出しを溜めるランチャーだけ。
 * ★ メモは OS にもあるが、**これは別のもの**。OS のメモは書いて残す所、
 *   こちらは**書いたものが読み解かれて旅程になる**所なので、中身も型も別に持つ。
 * ★ 家具は lib から借りる ── OS と同じものを同じ所から引くので、
 *   手ざわりが片方だけ古くなることがない。
 */
import { BubbleRouteRegistry, type BubbleRoute } from "@bublys-org/bubbles-ui";
import { furnitureBubbleRoutes } from "@bublys-org/space-furniture";
import { launcherBubbleRoutes } from "@bublys-org/launcher-libs";
import { mapBubbleRoutes } from "@bublys-org/map-libs";
import { activityBubbleRoutes } from "@bublys-org/activity-libs";
import { itineraryBubbleRoutes } from "@bublys-org/itinerary-libs";
import { noteBubbleRoutes } from "@bublys-org/note-libs";
import "./launchTargets";

export const travelRoutes: BubbleRoute[] = [
  // 旅の 4 つ
  ...noteBubbleRoutes,
  ...itineraryBubbleRoutes,
  ...mapBubbleRoutes,
  ...activityBubbleRoutes,

  // 呼び出しを溜めるバブリ。左の岸に着いている
  ...launcherBubbleRoutes,

  // 岸に貼る家具（世界線・見え方の口・ポケット）
  ...furnitureBubbleRoutes,
];

BubbleRouteRegistry.registerRoutes(travelRoutes);
