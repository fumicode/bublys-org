"use client";
import { createContext } from "react";

/**
 * 「いまキーボードを受け取っているバブル」を**外から差し込む**口。
 *
 * ★ なぜ要るか。`useKeyBindings` は「キーボードはフォーカス中のバブルが受け取る」を
 *   守るために、自分のバブル id と**フォーカス中のバブル id** を見比べている。
 *   後者はもともと旧 `bubbles` スライス（Redux）から読んでいた。
 *   新しい海（`bubble-layout`）はそのスライスに書かないので、
 *   新しい海の上で動く旧画面では**どのバブルも一致せず、キーが一切効かなくなる**
 *   （囲碁の世界線を矢印で辿れなくなっていたのがこれ）。
 *
 *   フォーカスの持ち主が誰かは、載っている土俵が決める話なので、
 *   **土俵のほうから差し込めるように**した。差し込まれていなければ今までどおり
 *   旧スライスを見る ── 旧の宇宙はそのまま動く。
 */
export interface KeyboardFocus {
  /** いまキーボードを受け取っているバブルの id（誰も居なければ null） */
  readonly focusedId: string | null;
}

/** 差し込まれていなければ `null` ＝ 旧 `bubbles` スライスを見る */
export const KeyboardFocusContext = createContext<KeyboardFocus | null>(null);
