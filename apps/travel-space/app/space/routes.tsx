"use client";
/**
 * **この空間で何が開けるか。**
 *
 * ★ OS の標準バブリ（タスク・ユーザー・CSV・変換・囲碁…）は 1 つも載せない。
 *   載るのは**旅の 4 つ**（地図・旅程・アクティビティ＝地点・宿泊施設）と、どの空間にも居てよい
 *   家具（世界線・見え方の口・ポケット）と、呼び出しを溜めるランチャーだけ。
 * ★ 家具は lib から借りる ── OS と同じものを同じ所から引くので、
 *   手ざわりが片方だけ古くなることがない。
 */
import {
  BubbleRouteRegistry,
  BublyUniverseBubble,
  makeSnapshotRoute,
  type BubbleRoute,
} from "@bublys-org/bubbles-ui";
import { furnitureBubbleRoutes } from "@bublys-org/space-furniture";
import { bublyLoaderBubbleRoutes, launcherBubbleRoutes } from "@bublys-org/launcher-libs";
import { mapBubbleRoutes } from "@bublys-org/map-libs";
import { itineraryBubbleRoutes } from "@bublys-org/itinerary-libs";
import { lodgingBubbleRoutes } from "@bublys-org/lodging-libs";
import "./launchTargets";

export const travelRoutes: BubbleRoute[] = [
  // 旅の 4 つ
  ...mapBubbleRoutes,
  ...itineraryBubbleRoutes,
  ...lodgingBubbleRoutes,

  // 呼び出しを溜めるバブリ。左の岸に着いている
  ...launcherBubbleRoutes,

  // バブリを足す口（OS と同じものを `launcher-libs` から借りる）
  ...bublyLoaderBubbleRoutes,

  // 岸に貼る家具（世界線・見え方の口・ポケット）
  ...furnitureBubbleRoutes,

  /**
   * **ユニバース** ── 泡の入れ子をそのまま覗く口。OS と同じものを同じ所から引く。
   *
   * ★ 中身ではなく**器を覗く**ものなので、この空間の 4 つとは別扱い。
   *   `universe` だけなら未訪問、`universe@<node>` でその節に居る。
   */
  makeSnapshotRoute({
    base: "universe",
    type: "universe",
    Component: BublyUniverseBubble,
    bubbleOptions: { universe: true, defaultSize: { width: 420, height: 296 } },
  }),
];

BubbleRouteRegistry.registerRoutes(travelRoutes);
