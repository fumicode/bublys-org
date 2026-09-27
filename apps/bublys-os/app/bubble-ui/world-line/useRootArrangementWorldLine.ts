"use client";
import { useBrowserRootArrangementWorldLine } from "@bublys-org/bubbles-ui";
import { rootBrowserSnapshotCodec } from "./snapshot-url";

/**
 * **レイヤー時代の海の世界線を置く場所。**
 *
 * ★ いまの海（`BubbleSea`）と**名前を分ける**。どちらも「root の海」なので同じ `root` を
 *   使っていたが、記録している中身は別物 ── いまの海は `sea-arrangement`、こちらは
 *   `bubble-arrangement`。同じ場所を覗くと、こちらは自分の記録を 1 つも見つけられず、
 *   **復元が永遠に終わらない**（`projectedNodeId` が付かない → ランチャーも出ない →
 *   泡が 0 のまま → 記録も始まらない、の堂々巡り）。実測で踏んだ。
 */
export const LAYERED_SEA_SCOPE = "root-layered";

/**
 * bublys-os 用の root universe ↔ ブラウザ URL バインド。
 *
 * 中身は lib 提供の {@link useBrowserRootArrangementWorldLine} に
 * `rootBrowserSnapshotCodec`（base = "universe"）と、上の置き場所を注入しただけのアプリ規約。
 */
export const useRootArrangementWorldLine = () =>
  useBrowserRootArrangementWorldLine(rootBrowserSnapshotCodec, LAYERED_SEA_SCOPE);
