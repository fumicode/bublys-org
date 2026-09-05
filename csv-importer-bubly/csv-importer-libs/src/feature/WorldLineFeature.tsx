"use client";

import { FC, useCallback } from "react";
import { CsvSheet } from "@bublys-org/csv-importer-model";
import { useCasScope } from "@bublys-org/world-line-graph";
import { removeBubble } from "@bublys-org/bubbles-ui";
import { useAppDispatch } from "@bublys-org/state-management";
import { WorldLineView } from "../ui/WorldLineView.js";
import { sheetScopeId } from "./CsvSheetProvider.js";

export type WorldLineFeatureProps = {
  sheetId: string;
  bubbleId?: string;
};

/**
 * 世界線ビュー — シートの世界線グラフを表示し、任意のノードに移動できる
 * 別バブルとしてpopChildで開かれることを想定
 */
export const WorldLineFeature: FC<WorldLineFeatureProps> = ({ sheetId, bubbleId }) => {
  const dispatch = useAppDispatch();
  const scope = useCasScope(sheetScopeId(sheetId));

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      scope.moveTo(nodeId);
    },
    [scope]
  );

  // ダブルクリック: ノード選択 + バブルを閉じる
  const handleSelectNodeAndClose = useCallback(
    (nodeId: string) => {
      scope.moveTo(nodeId);
      if (bubbleId) {
        dispatch(removeBubble(bubbleId));
      }
    },
    [scope, dispatch, bubbleId]
  );

  // 各ノードのサマリー
  const renderNodeSummary = useCallback(
    (nodeId: string): string => {
      const sheet = scope.getObjectAt<CsvSheet>(nodeId, "csv-sheet", sheetId);
      if (!sheet) return "";
      return `${sheet.columns.length}列 ${sheet.rows.length}行`;
    },
    [scope, sheetId]
  );

  return (
    <WorldLineView
      graph={scope.graph}
      onSelectNode={handleSelectNode}
      onSelectNodeAndClose={handleSelectNodeAndClose}
      renderNodeSummary={renderNodeSummary}
    />
  );
};
