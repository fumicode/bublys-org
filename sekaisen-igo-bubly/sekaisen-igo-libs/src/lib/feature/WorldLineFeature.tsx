"use client";

import { FC, useCallback } from "react";
import { IgoGame_囲碁ゲーム } from "@bublys-org/sekaisen-igo-model";
import { useCasScope } from "@bublys-org/world-line-graph";
import { removeBubble } from "@bublys-org/bubbles-ui";
import { useAppDispatch } from "@bublys-org/state-management";
import { WorldLineView } from "../view/WorldLineView.js";
import { gameScopeId } from "./IgoGameProvider.js";

export type WorldLineFeatureProps = {
  gameId: string;
  bubbleId?: string;
};

/**
 * 世界線ビュー — 対局の世界線グラフを表示し、任意のノードに移動できる
 * 別バブルとしてpopChildで開かれることを想定
 */
export const WorldLineFeature: FC<WorldLineFeatureProps> = ({ gameId, bubbleId }) => {
  const dispatch = useAppDispatch();
  const scope = useCasScope(gameScopeId(gameId));

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
      const game = scope.getObjectAt<IgoGame_囲碁ゲーム>(nodeId, "igo-game", gameId);
      if (!game) return "";
      const moveCount = game.state.moveHistory.length;
      const turn = game.currentTurn === "black" ? "黒" : "白";
      return `${moveCount}手目 ${turn}番`;
    },
    [scope, gameId]
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
