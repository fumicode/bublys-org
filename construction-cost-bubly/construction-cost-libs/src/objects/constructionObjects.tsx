'use client';

/**
 * このバブリのオブジェクト型を「1箇所」で定義する。
 *
 * 1つの型に1エントリ書くだけで:
 *   - ドラッグ&ドロップ（registerObjects 経由）
 *   - バブルのダブルクリック展開（open）
 *   - 世界線記録（serialize を付けると対象になる）
 * がすべて効く。型を増やしても Provider を作る必要はない。
 *
 * Stage 2 で Site / Employee / Machine / PlacementBoard の記述子を追加する。
 * 注: バブル URL（開く URL のスキーム）は app 層の関心事なので、ここ（libs）では持たない。
 * オブジェクトの正規 URL は app の registration/bubbleUrls.ts が registerObjectUrl で登録する。
 */
import { defineObjects, makeObjectsProvider } from "./framework.js";

export const CONSTRUCTION_OBJECTS = defineObjects({});

/** 世界線対象オブジェクトをまとめた Provider（バブリ全体で1つ） */
export const ConstructionObjectsProvider = makeObjectsProvider(CONSTRUCTION_OBJECTS);
