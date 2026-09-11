"use client";

import { FC, useMemo } from "react";
import { CsvSheet } from "@bublys-org/csv-importer-model";
import { useCasScope } from "@bublys-org/world-line-graph";
import {
  WorldLineScopeView,
  useScopeNodeSummaries,
  moveToSiblingBranch,
} from "@bublys-org/bubbles-ui";
import { sheetScopeId } from "./CsvSheetProvider.js";

export type WorldLineFeatureProps = {
  sheetId: string;
  /** route から渡ってくる。共通ビューはバブルを閉じないので今は使わない。 */
  bubbleId?: string;
};

/** 各ノードの要約 = その時点の表の大きさ */
const formatSize = (obj: unknown): string => {
  const sheet = obj as CsvSheet;
  return `${sheet.columns.length}列 ${sheet.rows.length}行`;
};

/**
 * 世界線ビュー — シートの世界線グラフを共通の {@link WorldLineScopeView}
 * （canvas: 左→右・分岐は下・横魚眼・自前スクロール）で表示する。
 *
 * ノードクリックでその世界へ移動（既定の scope.moveTo）。
 * ← 親 / → 子 / ↑↓ 兄弟。nameable で選択中の世界に名前をつけられる。
 */
export const WorldLineFeature: FC<WorldLineFeatureProps> = ({ sheetId }) => {
  const scope = useCasScope(sheetScopeId(sheetId));
  const getNodeSummary = useScopeNodeSummaries(scope, "csv-sheet", sheetId, formatSize);

  const keyBindings = useMemo(
    () => [
      { key: "ArrowLeft", run: scope.moveBack },
      { key: "ArrowRight", run: scope.moveForward },
      { key: "ArrowUp", run: () => moveToSiblingBranch(scope, -1) },
      { key: "ArrowDown", run: () => moveToSiblingBranch(scope, 1) },
    ],
    [scope],
  );

  if (!scope.graph.state.rootNodeId) {
    return (
      <div style={{ padding: 24, color: "#888", fontSize: "0.85em" }}>
        履歴がありません。シートを編集すると記録されます。
      </div>
    );
  }

  return (
    <WorldLineScopeView
      scope={scope}
      getNodeSummary={getNodeSummary}
      keyBindings={keyBindings}
      nameable
    />
  );
};
