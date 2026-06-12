import type { BubbleOptions } from "../Bubble.domain.js";
import type { BubbleContentRenderer, BubbleRoute } from "./BubbleRouting.js";
import { makeSnapshotRoute } from "./makeSnapshotRoute.js";

/**
 * 「1 bubly = 1 universe バブル」を作るためのルート定義ヘルパー。
 *
 * {@link makeSnapshotRoute} で `<base>@<node>` 文法と SnapshotCodec を付けたうえで、
 * universe の初期 seed (`initialBubbleUrls`) も route 定義に持たせる。これにより
 *
 *   - sidebar から `users-bubly` を開く → universe バブルが生まれる
 *   - その universe の初期 seed として `users` 一覧が自動配置される
 *   - 中で田中太郎を開けば user 詳細バブルが nest 世界線に積まれる
 *   - root のブラウザ url は `/users-bubly@<rootNode>` の形で進む
 *
 * という「bubly = 独立した世界線を持つ universe」が成立する。
 *
 * Component は呼び出し側（apps/）で `UniverseBubble` などを渡す
 * （lib 側はアプリ固有 Component に依存しない）。
 */
export const makeBublyRoute = (config: {
  base: string;
  type: string;
  Component: BubbleContentRenderer;
  initialBubbleUrls: string[];
  bubbleOptions?: BubbleOptions;
}): BubbleRoute => {
  return {
    ...makeSnapshotRoute({
      base: config.base,
      type: config.type,
      Component: config.Component,
      bubbleOptions: config.bubbleOptions,
    }),
    initialBubbleUrls: config.initialBubbleUrls,
  };
};
