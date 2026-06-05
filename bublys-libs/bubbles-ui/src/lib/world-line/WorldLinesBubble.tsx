"use client";
import { FC, useEffect, useMemo } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import { BubbleArrangement } from "../BubbleArrangement.domain.js";
import { useUniverseId } from "../context/UniverseContext.js";
import {
  BUBBLE_ARRANGEMENT_TYPE,
  BUBBLE_ARRANGEMENT_ID,
} from "./bubbleArrangementDomain.js";
import { WorldLinesCanvasView } from "./WorldLinesCanvasView.js";

/**
 * 「いま居る universe」の world-line graph を canvas に木構造で描くバブル。
 *
 * 想定ルート: `world-lines` URL の通常バブル（fillsContainer ではない）。
 * universe ID は {@link useUniverseId} から取り、Redux 経由で scope（=
 * graph + cas + moveTo）を読む。`useUniverseArrangementWorldLine` は呼ばない
 * ので commit/rehydrate の二重起動は起きない。
 *
 * 操作:
 *  - canvas 上のノードクリック → そのノードに moveTo
 *  - Cmd/Ctrl+Z / ←  → parent（戻る）
 *  - Cmd/Ctrl+Shift+Z / →  → 同じ world-line の子（進む）
 *  - ↑ / ↓  → 同じ親の兄弟ノードを切替（分岐間移動）
 */
export const WorldLinesBubble: FC = () => {
  const universeId = useUniverseId();
  const scope = useCasScope(universeId);
  const apexId = scope.graph.getApex()?.id ?? null;

  const summaries = useMemo(() => {
    const map = new Map<string, string>();
    const nodes = scope.graph.state.nodes;
    for (const id of Object.keys(nodes)) {
      const v = scope.getObjectAt<BubbleArrangement>(id, BUBBLE_ARRANGEMENT_TYPE, BUBBLE_ARRANGEMENT_ID);
      map.set(id, v ? `${Object.keys(v.bubbles ?? {}).length}` : "");
    }
    return map;
  }, [scope.graph, scope.getObjectAt]);

  // キーボードショートカット: window レベルで処理。バブルが open している間だけ有効。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      const apex = scope.graph.getApex();

      if (meta && !e.shiftKey && e.key.toLowerCase() === "z") {
        // 戻る
        e.preventDefault();
        scope.moveBack();
        return;
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === "z") {
        // 進む（同 world-line の子優先）
        e.preventDefault();
        scope.moveForward();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scope.moveBack();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scope.moveForward();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        // 兄弟ノード切替（分岐間移動）
        if (!apex || apex.parentId === null) return;
        const childrenMap = scope.graph.getChildrenMap();
        const siblings = childrenMap[apex.parentId] ?? [];
        const idx = siblings.indexOf(apex.id);
        if (idx < 0) return;
        const delta = e.key === "ArrowUp" ? -1 : 1;
        const next = siblings[idx + delta];
        if (!next) return;
        e.preventDefault();
        scope.moveTo(next);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [scope]);

  return (
    <div style={{ width: 600, height: 320, maxWidth: "80vw", maxHeight: "70vh" }}>
      <WorldLinesCanvasView
        graph={scope.graph}
        apexNodeId={apexId}
        getNodeSummary={(id) => summaries.get(id) ?? ""}
        onSelectNode={scope.moveTo}
        background="rgba(15,18,28,0.85)"
      />
    </div>
  );
};
