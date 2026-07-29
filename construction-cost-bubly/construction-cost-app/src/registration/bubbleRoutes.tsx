"use client";

import { BubbleRoute } from "@bublys-org/bubbles-ui";

/**
 * このバブリのバブルルート定義（空の骨格）。
 *
 * Stage 2〜3 で現場/社員/機械のコレクションバブルと配置表グリッドバブルを追加する。
 * 各バブルは ConstructionObjectsProvider（CASレジストリ）配下に置き、
 * URL ビルダーは bubbleUrls.ts に定義して pattern と隣り合わせる。
 */
export const constructionCostBubbleRoutes: BubbleRoute[] = [];
