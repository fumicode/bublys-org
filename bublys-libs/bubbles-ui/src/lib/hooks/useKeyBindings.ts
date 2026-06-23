"use client";
import { useEffect, useRef } from "react";

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
 */
export function useKeyBindings(bindings: KeyBinding[]): void {
  const ref = useRef(bindings);
  ref.current = bindings;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
