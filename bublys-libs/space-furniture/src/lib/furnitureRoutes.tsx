"use client";
/**
 * **家具の泡は何で描くか** ── url と部品の対応表。
 *
 * ★ どの空間でも同じ 3 つ（世界線・見え方の口・ポケット）。前は OS の
 *   `bubbleRoutes.tsx` の中に、その空間だけのもの（説明・他のデモへ行く口・
 *   バブリを追加）と混ざって並んでいた。別の空間を立てるときに**どれを持って行けば
 *   よいのか誰にも言えない**状態だったので、持って行くほうをここへ切り出した。
 */
import type { BubbleRoute } from "@bublys-org/bubbles-ui";
import { SpaceViewBubble } from "@bublys-org/bubble-space-shell";
import { PocketBubble } from "./PocketBubble.js";
import { WorldLineHomeBubble, WORLD_LINES_URL } from "./WorldLineHomeBubble.js";
import { SPACE_VIEW_SIZE } from "./docks.js";

export const POCKET_URL = "pocket";
export const SPACE_VIEW_URL = "space-view";
export { WORLD_LINES_URL };

export const furnitureBubbleRoutes: BubbleRoute[] = [
  /**
   * この空間の世界線。**大きさで姿が変わる**（`WorldLineHomeBubble`）──
   * 岸に貼ってある 48×48 のときはアイコン、押すと同じ url の泡が開いて、
   * 広いそちらが世界線を映す。
   */
  {
    pattern: /^world-lines$/,
    type: "world-lines",
    Component: WorldLineHomeBubble,
    /**
     * ★ 地は**暗いほうへ**。既定の明るい地のままだと canvas が白い板になって、
     *   節も枝も**読めるのに読みにくい**（線は明るい色で描く）。
     * ★ 木を描く canvas なので、開いた先はそれなりの広さが要る。
     */
    bubbleOptions: {
      contentBackground: "rgba(15,18,28,0.3)",
      defaultSize: { width: 520, height: 340 },
    },
  },

  // 見え方（開き方・ネオンの通し方・レンズの向き）。前は画面の左上に固定した帯だった
  {
    pattern: /^space-view$/,
    type: "space-view",
    Component: SpaceViewBubble,
    // 地は敷かない ── ボタンが空間の上に浮いて見える
    // 中身の数（chrome.ts）。岸に貼ったときの大きさ（`docks.ts` の SPACE_VIEW_SIZE）と同じ
    bubbleOptions: {
      defaultSize: { width: 482, height: SPACE_VIEW_SIZE.height },
      contentBackground: "transparent",
    },
  },

  // ポケット（オブジェクトのクリップボード）。前は画面に居座る面だったが、1 つの泡にした
  // ── いつも見えていてほしければ岸に貼る
  {
    pattern: /^pocket$/,
    type: "pocket",
    Component: PocketBubble,
    // 地は中身が持つ ── 大きいときは自分で白い箱を描き、アイコンだけのときは空間を透かす
    bubbleOptions: { defaultSize: { width: 246, height: 266 }, contentBackground: "transparent" },
  },
];
