"use client";
import { useSyncExternalStore } from "react";
import { BubbleRouteRegistry } from "./BubbleRouteRegistry.js";
import type { BubbleRoute } from "./BubbleRouting.js";

/**
 * **いま開けるものの一覧** ── 静的に組み込んだぶんも、あとからロードしたバブリのぶんも。
 *
 * ★ 引き先はレジストリ 1 つ。海に渡す一覧をモジュールの定数（`bubbleRoutes`）から
 *   取っていたころは、**あとから足されたルートが海に届かなかった**
 *   ── ランチャーに札は並ぶのに押しても開かない（`route が無い url:` が出る）のがこれ。
 * ★ サーバ側も同じものを読む。組み込みのぶんは import した時点でもう入っているので、
 *   最初に描くものは変わらない。
 */
export const useBubbleRoutes = (): readonly BubbleRoute[] =>
  useSyncExternalStore(
    BubbleRouteRegistry.subscribe,
    BubbleRouteRegistry.getRoutes,
    BubbleRouteRegistry.getRoutes,
  );
