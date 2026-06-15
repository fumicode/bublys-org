"use client";
import { FC, useMemo } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import { BubbleArrangement } from "../BubbleArrangement.domain.js";
import { useUniverseId } from "../context/UniverseContext.js";
import {
  BUBBLE_ARRANGEMENT_TYPE,
  BUBBLE_ARRANGEMENT_ID,
} from "./bubbleArrangementDomain.js";
import {
  WorldLineScopeView,
  useScopeNodeSummaries,
  moveToSiblingBranch,
} from "./WorldLineScopeView.js";

// 各ノードの要約 = その arrangement に含まれるバブル数。
const formatBubbleCount = (v: unknown) =>
  `${Object.keys((v as BubbleArrangement).bubbles ?? {}).length}`;

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
  const getNodeSummary = useScopeNodeSummaries(
    scope,
    BUBBLE_ARRANGEMENT_TYPE,
    BUBBLE_ARRANGEMENT_ID,
    formatBubbleCount,
  );

  // 操作: Cmd/Ctrl+Z / ← = 戻る, Cmd/Ctrl+Shift+Z / → = 進む, ↑↓ = 兄弟切替。
  const keyBindings = useMemo(
    () => [
      { key: "z", meta: true, run: scope.moveBack },
      { key: "z", meta: true, shift: true, run: scope.moveForward },
      { key: "ArrowLeft", run: scope.moveBack },
      { key: "ArrowRight", run: scope.moveForward },
      { key: "ArrowUp", run: () => moveToSiblingBranch(scope, -1) },
      { key: "ArrowDown", run: () => moveToSiblingBranch(scope, 1) },
    ],
    [scope],
  );

  return (
    <WorldLineScopeView
      scope={scope}
      getNodeSummary={getNodeSummary}
      keyBindings={keyBindings}
      style={{ width: 600, height: 320, maxWidth: "80vw", maxHeight: "70vh" }}
    />
  );
};
