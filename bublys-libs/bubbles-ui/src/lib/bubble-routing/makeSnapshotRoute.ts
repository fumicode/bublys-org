import type { BubbleOptions } from "../Bubble.domain.js";
import type { BubbleContentRenderer, BubbleRoute } from "./BubbleRouting.js";
import { makeSnapshotCodec } from "./SnapshotCodec.js";

/** `<base>@<snapshot>` の区切り文字。git/docker/npm 等と同じ「at this snapshot」イデオム。 */
const AT_PREFIX = "@";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * `<base>@<snapshot>` 文法を持つ {@link BubbleRoute} を作るヘルパー。
 *
 * `base` 文字列1個から url パターン・encode・decode を全部派生させるので、
 * 同じ語彙（"universe" 等）が複数ヶ所に書かれて drift する問題が起きない。
 *
 * @example
 * makeSnapshotRoute({
 *   base: "universe",
 *   type: "universe",
 *   Component: UniverseBubble,
 *   bubbleOptions: { fillsContainer: true, defaultSize: {...} },
 * })
 *
 * これで以下が同じ "universe" から生まれる：
 *  - pattern  = /^universe(@[^/?#&]+)?$/
 *  - snapshot.encode(node) = "universe@<node>"
 *  - snapshot.decode("universe@xyz") = "xyz"
 *  - snapshot.decode("universe")     = null
 */
export const makeSnapshotRoute = (config: {
  base: string;
  type: string;
  Component: BubbleContentRenderer;
  bubbleOptions?: BubbleOptions;
}): BubbleRoute => {
  const { base, type, Component, bubbleOptions } = config;
  return {
    pattern: new RegExp(`^${escapeRegex(base)}(${AT_PREFIX}[^/?#&]+)?$`),
    type,
    Component,
    bubbleOptions,
    snapshot: makeSnapshotCodec(base),
  };
};
