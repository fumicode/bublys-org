import { makeSnapshotCodec } from "@bublys-org/bubbles-ui";

/**
 * レイヤー時代の海のブラウザ url 用 SnapshotCodec。
 *
 * 文法は lib の {@link makeSnapshotCodec} と同じ `<base>@<node>`。ただし base は
 * **この画面の下の道**（`bubble-ui/layers`）にしてある:
 *
 * > **住所は、その海を受け持つ画面の下に置く。**
 *
 * ★ 前は `universe`（＝ `/universe@<節>`）だった。あの住所を受け持っているのは
 *   いまの海（`[[...slug]]`）なので、レイヤー時代の海が記録するたびにそこへ飛び、
 *   **再読み込みするといまの海が開いて**いた。いまの海は住所を書かないので、
 *   `universe@…` はあちらのものとして空けておく。
 */
export const rootBrowserSnapshotCodec = makeSnapshotCodec("bubble-ui/layers");
