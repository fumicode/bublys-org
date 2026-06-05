"use client";
import { FC, useMemo } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import { BubbleArrangement } from "../BubbleArrangement.domain.js";
import { useUniverseId } from "../context/UniverseContext.js";
import {
  BUBBLE_ARRANGEMENT_TYPE,
  BUBBLE_ARRANGEMENT_ID,
} from "./bubbleArrangementDomain.js";
import { WorldLinesCanvasView } from "./WorldLinesCanvasView.js";

/**
 * 「いま居る universe」の world-line graph を canvas に木構造で描く bubble。
 *
 * 想定ルート: bubble.url = "world-lines"
 *   register 例:
 *     { pattern: /^world-lines$/, type: "world-lines", Component: WorldLinesBubble,
 *       bubbleOptions: { fillsContainer: true, defaultSize: { width: 640, height: 380 } } }
 *
 * containing universe の id は {@link useUniverseId} から取り、Redux 経由で
 * scope（= graph + cas + moveTo）を読み出す。`useUniverseArrangementWorldLine`
 * は呼ばないので commit/rehydrate の二重起動は起きない。
 *
 * 各ノードの「要約」（含まれる bubble 数）も graph / cas 変更時にだけ計算する。
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

  return (
    <WorldLinesCanvasView
      graph={scope.graph}
      apexNodeId={apexId}
      getNodeSummary={(id) => summaries.get(id) ?? ""}
      onSelectNode={scope.moveTo}
      background="rgba(15,18,28,0.85)"
    />
  );
};
