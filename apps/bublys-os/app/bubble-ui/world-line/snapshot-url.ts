import type { SnapshotCodec } from "@bublys-org/bubbles-ui";

/**
 * root のブラウザ url 用 SnapshotCodec。
 *
 * バブルの世界線対応ルート（`makeSnapshotRoute({ base: "universe", ... })`）は
 * `BubbleRouteRegistry` 経由で自分の codec を持つが、**root はバブルルートを
 * 経由しない**（`/universe@<node>` はブラウザ url で、`useBubbleArrangementWorldLine`
 * が直接読み書きする）。そのため root 用の SnapshotCodec はここで独立に定義する。
 *
 * 中身は同じ `<base>@<node>` 文法で、たまたま base 文字列 "universe" もバブル
 * ルートと一致しているが、概念的には独立した定義。
 */
const ROOT_URL_BASE = "universe";
const AT_PREFIX = "@";
const PREFIX = `${ROOT_URL_BASE}${AT_PREFIX}`;

export const rootBrowserSnapshotCodec: SnapshotCodec = {
  encode: (node) => `${PREFIX}${node}`,
  decode: (url) => (url.startsWith(PREFIX) ? url.slice(PREFIX.length) : null),
};
