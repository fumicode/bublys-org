"use client";
/**
 * **いま中身を描ける箱の大きさ**（CSS px）を、泡の中身へ配る口。
 *
 * > 中身は、自分がどれだけの広さを貰っているかを知ってよい。
 * > ただし**測るのは 1 か所**でいい。
 *
 * ★ `bubble.size` には載せない。あれは旧の海では**枠込みの外側**を指していて、
 *   ここで配るのは**枠を引いたあとの内側**だから ── 両方の海で描かれる中身
 *   （ポケット・ランチャー）が、同じ名前を海によって別の意味で読むことになる。
 * ★ 新しい海では `bubble.size` そのものが当てにならない。旧ルートの橋渡しが
 *   url から泡を作り直すので、中身に届くのは**ルートに書いた既定値**であって、
 *   岸に貼られた実際の大きさではない（`legacyRouteBridge` の `LegacyScreen`）。
 *
 * 配る側は測ってから配る。配られていなければ `null` ── 読む側は今までどおり
 * `bubble.size` に落ちればよい（旧の海にはこの口がまだ無い）。
 */
import { createContext, useContext } from 'react';

export type BubbleBox = { readonly width: number; readonly height: number };

export const BubbleBoxContext = createContext<BubbleBox | null>(null);

/** 中身を描ける箱。配られていなければ null */
export const useBubbleBox = (): BubbleBox | null => useContext(BubbleBoxContext);
