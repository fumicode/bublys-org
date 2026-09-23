"use client";
import { useContext, useEffect, useRef } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import { CurrentBubbleContext } from "../context/CurrentBubbleContext.js";
import { KeyboardFocusContext } from "../context/KeyboardFocusContext.js";
import { useUniverseId } from "../context/UniverseContext.js";
import { makeSelectFocusedBubbleId } from "../state/bubbles-slice.js";
import { isTextEditingTarget, matchesShortcut, parseShortcut } from "./shortcut.js";

/** 「このキー → この動作」1 件ぶんの宣言。 */
export type KeyBinding = {
  /**
   * ショートカットの表記（Windows / Mac 共通）。例: `"ArrowLeft"` / `"mod+z"` / `"mod+shift+z"`。
   * `mod` は Cmd または Ctrl。詳しくは {@link parseShortcut}
   */
  keys: string;
  /** 押されたときに実行する動作 */
  run: () => void;
};

/**
 * キーバインドを宣言的に window（capture）へ登録する汎用フック。
 *
 * - bindings は毎レンダー作り直して OK（ref 経由で最新を参照するので再購読しない）。
 * - 先頭から最初にマッチした 1 つだけ実行し、`preventDefault` する。
 * - 無効化したいときは空配列を渡せばよい（イベントは素通しになる）。
 *
 * フォーカス制御: 「キーボードはフォーカス中のバブルが受け取る」。バブルの中で使うと
 * （CurrentBubbleContext が自分のバブルIDを供給する）、そのバブルが focusedBubbleId で
 * ないあいだはキーを受け取らない。バブルの外（id="root"）では常に有効。
 *
 * テキストを打っている最中（input / textarea / contentEditable / `data-text-editing` の内側）は
 * キー操作を奪わない（{@link isTextEditingTarget}）。
 */
export function useKeyBindings(bindings: KeyBinding[]): void {
  const ref = useRef(bindings);
  ref.current = bindings;

  // 自分がどのバブルにいるか（バブル外なら "root"）と、その universe でフォーカス中のバブル。
  const bubbleId = useContext(CurrentBubbleContext);
  const universeId = useUniverseId();
  const legacyFocused = useAppSelector(makeSelectFocusedBubbleId(universeId));
  /**
   * ★ フォーカスの持ち主は**土俵が決める**。差し込まれていればそれを見る
   *   （新しい海。旧 `bubbles` スライスには書かないので、見比べても永久に一致しない）。
   *   差し込まれていなければ今までどおり旧スライス ── 旧の宇宙はそのまま動く。
   */
  const injected = useContext(KeyboardFocusContext);
  const focusedBubbleId = injected ? injected.focusedId : legacyFocused;
  // バブル内ならフォーカス中のときだけ有効。バブル外（root）は常に有効。
  const active = bubbleId === "root" || bubbleId === focusedBubbleId;
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 未フォーカスのバブル内では受け取らない（キーはフォーカス中のバブルへ渡す）。
      if (!activeRef.current) return;
      if (isTextEditingTarget(e.target)) return;
      for (const b of ref.current) {
        if (!matchesShortcut(e, parseShortcut(b.keys))) continue;
        e.preventDefault();
        b.run();
        return;
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, []);
}
