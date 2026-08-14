"use client";
import { useContext, useEffect, useRef } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import { CurrentBubbleContext } from "../context/CurrentBubbleContext.js";
import { useUniverseId } from "../context/UniverseContext.js";
import { makeSelectFocusedBubbleId } from "../state/bubbles-slice.js";

/** 「このキー → この動作」1 件ぶんの宣言。 */
export type KeyBinding = {
  /** e.key（大文字小文字は無視）。例: "ArrowLeft", "z" */
  key: string;
  /** Cmd または Ctrl が必要か（既定 false） */
  meta?: boolean;
  /** Shift が必要か（既定 false） */
  shift?: boolean;
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
 */
export function useKeyBindings(bindings: KeyBinding[]): void {
  const ref = useRef(bindings);
  ref.current = bindings;

  // 自分がどのバブルにいるか（バブル外なら "root"）と、その universe でフォーカス中のバブル。
  const bubbleId = useContext(CurrentBubbleContext);
  const universeId = useUniverseId();
  const focusedBubbleId = useAppSelector(makeSelectFocusedBubbleId(universeId));
  // バブル内ならフォーカス中のときだけ有効。バブル外（root）は常に有効。
  const active = bubbleId === "root" || bubbleId === focusedBubbleId;
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 未フォーカスのバブル内では受け取らない（キーはフォーカス中のバブルへ渡す）。
      if (!activeRef.current) return;
      // テキスト入力中（input / textarea / contentEditable）はキー操作を奪わない。
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      const meta = e.ctrlKey || e.metaKey;
      for (const b of ref.current) {
        if (e.key.toLowerCase() !== b.key.toLowerCase()) continue;
        if (!!b.meta !== meta) continue;
        if (!!b.shift !== e.shiftKey) continue;
        e.preventDefault();
        b.run();
        return;
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, []);
}
