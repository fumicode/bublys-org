"use client";
import { useCallback, useContext, useEffect } from "react";
import type React from "react";
import { useAppStore } from "@bublys-org/state-management";
import { BubblesContext } from "../bubble-routing/BubbleRouting.js";
import { BubbleRouteRegistry } from "../bubble-routing/BubbleRouteRegistry.js";
import { hasDragPayload, parseDragPayload } from "../utils/drag-types.js";
import { dropPointToUniverse } from "../utils/drop-point.js";
import { installDragSession } from "../utils/drag-session.js";

type UseUniverseDropZoneArgs = {
  universeId: string;
  /** 対象 universe の DOM 要素（data-bubble-universe）。座標変換の基準に使う */
  universeRef: React.RefObject<HTMLElement | null>;
};

/**
 * universe を「最後の受け手」にする。
 *
 * ルール: **誰も受け止めなかったドロップは、宇宙が落ちた場所で受け止める。**
 *
 * 「誰も受け止めなかった」の判定は、HTML5 ドラッグ＆ドロップの既存の作法をそのまま使う。
 * ドロップを受理する側は `preventDefault()` を呼ぶ決まりなので、内側のハンドラが先に走った
 * 結果 `defaultPrevented` が立っていれば、それは誰かが受け取ったということ。立っていなければ
 * 誰も取らなかったということ。だから universe 側は「立っていなければ自分が取る」とだけ書けばよく、
 * 受け入れ先を列挙して回る必要がない。
 *
 * dragover と drop の両方で見るのが要点。drop だけ見ていると、受理する相手の上に重ねている間も
 * universe が `dropEffect` を書き換えてしまい、カーソルの見え方が嘘になる。
 */
export function useUniverseDropZone({ universeId, universeRef }: UseUniverseDropZoneArgs) {
  const { openBubble } = useContext(BubblesContext);
  const store = useAppStore();

  // 入れ子の universe をドラッグ中だけ触れるようにする（drag-session.ts 参照）
  useEffect(() => installDragSession(), []);

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      // 誰かが既に受け取っている。宇宙は引き下がる（dropEffect も触らない）
      if (e.defaultPrevented) return;
      // 知らない荷物（外部ファイルなど）は受け取らない。
      // dragover では中身が読めないので型だけ見る（hasDragPayload のコメント参照）
      if (!hasDragPayload(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    []
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (e.defaultPrevented) return;
      const payload = parseDragPayload(e);
      if (!payload) return;
      e.preventDefault();

      // 開けない URL なら何も起きない方がよい。ドロップは画面全体を的にする
      // 大雑把な操作なので、取りこぼしが「Unknown bubble type」のバブルとして
      // 散らかるのは避ける（ダブルクリックも開けないものは開かない）。
      if (!BubbleRouteRegistry.matchRoute(payload.url)) return;

      const droppedAt = dropPointToUniverse(
        { x: e.clientX, y: e.clientY },
        universeRef.current
      );
      if (!droppedAt) return;

      openBubble(payload.url, resolveOpener(store, universeId, payload.sourceBubbleId), "dropped-place", {
        droppedAt,
      });
    },
    [openBubble, store, universeId, universeRef]
  );

  return { onDragOver, onDrop };
}

/**
 * opener 無しを表す番兵。`relateBubbles` はこの値を関係として記録せず
 * （bubbles-slice.ts）、`CurrentBubbleContext` の既定値もこれ。
 */
const NO_OPENER = "root";

/**
 * 誰が開いたことにするか。
 *
 * ドラッグ元のバブルが分かっていて、それがこの universe に実在するならそれを opener にする
 * （ダブルクリックで開いたときと同じく、どこから出てきたかがリボンで見える）。
 * それ以外は "root"＝opener 無し。`relateBubbles` は "root" を関係として記録しないので、
 * 「自分で置いたバブル」は誰にも繋がらない、という素直な状態になる。
 *
 * 実在確認をするのは、バブルIDがこの文書の中でしか意味を持たない値だから。別ウィンドウの
 * Bublys からドラッグしてくると、そこのIDがそのまま届いてしまう。
 */
function resolveOpener(
  store: { getState: () => unknown },
  universeId: string,
  sourceBubbleId: string | undefined
): string {
  if (!sourceBubbleId) return NO_OPENER;
  const state = store.getState() as {
    bubbleState?: { universes?: Record<string, { bubbles?: Record<string, unknown> }> };
  };
  const exists = state.bubbleState?.universes?.[universeId]?.bubbles?.[sourceBubbleId] !== undefined;
  return exists ? sourceBubbleId : NO_OPENER;
}
