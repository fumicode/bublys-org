"use client";
/**
 * この化バブリで何が開けるか ── url と、それを描く部品の対応表。
 *
 *   henge/games                  ゲーム一覧（ここから何個でも立ち上がる）
 *   henge/games/:gameId          ゲーム 1 つ
 *   henge/games/:gameId/history  そのゲームの世界線
 *
 * ★ **`:param` 形式は使わない。** `bubble.params` を埋めるのは
 *   `BubbleRouteRegistry` の resolver だけで、`BubbleSea` に routes を直接渡す
 *   経路（単体バブリはこちら）では**誰も params を作らない**。
 *   `:gameId` で書くと取り出せず undefined で落ちる（実測で踏んだ）。
 *   正規表現で当てて、id は url から自分で切り出す（lodging と同じ作法）。
 *
 * ★ 長い方から並べる。`henge/games/[^/]+` は `.../history` も飲み込むので。
 */
import { BubbleRoute } from "@bublys-org/bubbles-ui";
import { HengeGameProvider } from "../feature/HengeGameProvider.js";
import { HengeGameFeature } from "../feature/HengeGameFeature.js";
import { GameListFeature } from "../feature/GameListFeature.js";
import { WorldLineFeature } from "../feature/WorldLineFeature.js";

/** `henge/games/<id>` や `henge/games/<id>/history` から id を切り出す */
const gameIdOf = (url: string): string =>
  url.replace(/^henge\/games\//, "").replace(/\/history$/, "");

export const hengeBubbleRoutes: BubbleRoute[] = [
  {
    pattern: /^henge\/games\/[^/]+\/history$/,
    type: "henge-world-line",
    bubbleOptions: { contentBackground: "transparent", defaultSize: { width: 360, height: 420 } },
    Component: ({ bubble }) => (
      <HengeGameProvider>
        <WorldLineFeature gameId={gameIdOf(bubble.url)} bubbleId={bubble.id} />
      </HengeGameProvider>
    ),
  },
  {
    pattern: /^henge\/games\/[^/]+$/,
    type: "henge-game",
    bubbleOptions: { defaultSize: { width: 420, height: 340 } },
    Component: ({ bubble }) => (
      <HengeGameProvider>
        <HengeGameFeature gameId={gameIdOf(bubble.url)} bubbleId={bubble.id} />
      </HengeGameProvider>
    ),
  },
  {
    pattern: /^henge\/games$/,
    type: "henge-game-list",
    bubbleOptions: { defaultSize: { width: 340, height: 380 } },
    Component: () => (
      <HengeGameProvider>
        <GameListFeature />
      </HengeGameProvider>
    ),
  },
];
