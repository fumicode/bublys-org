"use client";
import { CSSProperties, FC, useCallback, useMemo } from "react";
import type { CasScopeValue } from "@bublys-org/world-line-graph";
import { useKeyBindings, type KeyBinding } from "../hooks/useKeyBindings.js";
import { WorldLinesCanvasView } from "./WorldLinesCanvasView.js";

const EMPTY_BINDINGS: KeyBinding[] = [];

/**
 * world-line-graph の scope を canvas（左→右・分岐は下・横魚眼・自前スクロール）で
 * 表示する共通ビュー。apex を強調し、ノードクリックで moveTo する。
 *
 * 操作はすべて宣言的に注入する: `keyBindings` で「このキー → この動作」を渡す
 * （undo の有無やフォーカスゲートなど方針がドメインごとに異なるため、ここでは
 * 個別の useEffect を持たず {@link useKeyBindings} で一括登録するだけ）。
 * 兄弟移動など定番の動作は {@link moveToSiblingBranch} を使うとよい。
 */
export type WorldLineScopeViewProps = {
  scope: CasScopeValue;
  /** ノード ID → ラベル要約。{@link useScopeNodeSummaries} で作るのが楽。 */
  getNodeSummary?: (nodeId: string) => string;
  /** 「このキー → この動作」。無効化したいときは空配列でよい。 */
  keyBindings?: KeyBinding[];
  /** ラッパの style。既定はバブルいっぱい（100%）。 */
  style?: CSSProperties;
};

export const WorldLineScopeView: FC<WorldLineScopeViewProps> = ({
  scope,
  getNodeSummary,
  keyBindings,
  style,
}) => {
  useKeyBindings(keyBindings ?? EMPTY_BINDINGS);
  const apexId = scope.graph.getApex()?.id ?? null;
  return (
    <div style={{ width: "100%", height: "100%", ...style }}>
      <WorldLinesCanvasView
        graph={scope.graph}
        apexNodeId={apexId}
        getNodeSummary={getNodeSummary}
        onSelectNode={scope.moveTo}
      />
    </div>
  );
};

/**
 * scope の各ノードに置かれた (objectType, objectId) のオブジェクトを引き、
 * format で文字列化したノード要約関数を返す（{@link WorldLineScopeView} の
 * getNodeSummary 用）。format は呼び出し側で安定化（module 直置き等）する想定。
 */
export function useScopeNodeSummaries(
  scope: CasScopeValue,
  objectType: string,
  objectId: string,
  format: (obj: unknown) => string,
): (nodeId: string) => string {
  const map = useMemo(() => {
    const m = new Map<string, string>();
    for (const id of Object.keys(scope.graph.state.nodes)) {
      const obj = scope.getObjectAt(id, objectType, objectId);
      m.set(id, obj != null ? format(obj) : "");
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.graph, scope.getObjectAt, objectType, objectId]);
  return useCallback((nodeId: string) => map.get(nodeId) ?? "", [map]);
}

/**
 * apex の兄弟ノードへ delta（-1=上, +1=下）だけ移動する（分岐間の切替）。
 * 範囲外・親なしなら何もしない。keyBindings の ↑↓ から使う。
 */
export function moveToSiblingBranch(scope: CasScopeValue, delta: number): void {
  const apex = scope.graph.getApex();
  if (!apex || apex.parentId === null) return;
  const siblings = scope.graph.getChildrenMap()[apex.parentId] ?? [];
  const idx = siblings.indexOf(apex.id);
  if (idx < 0) return;
  const next = siblings[idx + delta];
  if (next) scope.moveTo(next);
}
