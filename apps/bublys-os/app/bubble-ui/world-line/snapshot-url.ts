import { makeSnapshotCodec } from "@bublys-org/bubbles-ui";

/**
 * root のブラウザ url 用 SnapshotCodec。
 *
 * バブルの世界線対応ルート（`makeSnapshotRoute({ base: "universe", ... })`）は
 * `BubbleRouteRegistry` 経由で自分の codec を持つが、**root はバブルルートを
 * 経由しない**（`/universe@<node>` はブラウザ url で、`useRootArrangementWorldLine`
 * が直接読み書きする）。そのため root 用の SnapshotCodec はここで独立に定義する。
 *
 * 文法は lib の {@link makeSnapshotCodec} で同じ `<base>@<node>` から派生させる。
 * base 文字列 "universe" もバブルルートと一致しているが、概念的にはアプリ規約。
 */
export const rootBrowserSnapshotCodec = makeSnapshotCodec("universe");
