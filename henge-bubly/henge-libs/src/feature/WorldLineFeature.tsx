"use client";
import { FC, useCallback } from "react";
import { HengeGame_化ゲーム } from "@bublys-org/henge-model";
import { useCasScope, WorldLineView } from "@bublys-org/world-line-graph";
import { removeBubble } from "@bublys-org/bubbles-ui";
import { useAppDispatch } from "@bublys-org/state-management";
import { gameScopeId, HENGE_GAME_TYPE } from "./HengeGameProvider.js";

export type WorldLineFeatureProps = {
  gameId: string;
  bubbleId?: string;
};

/**
 * 世界線ビュー ── そのゲームの変形の履歴そのもの。
 * 任意の節へ飛べる。飛んだ先から変形すると、そこから枝が割れる。
 */
export const WorldLineFeature: FC<WorldLineFeatureProps> = ({ gameId, bubbleId }) => {
  const dispatch = useAppDispatch();
  const scope = useCasScope(gameScopeId(gameId));

  const handleSelectNode = useCallback((nodeId: string) => scope.moveTo(nodeId), [scope]);

  const handleSelectNodeAndClose = useCallback(
    (nodeId: string) => {
      scope.moveTo(nodeId);
      if (bubbleId) dispatch(removeBubble(bubbleId));
    },
    [scope, dispatch, bubbleId],
  );

  const renderNodeSummary = useCallback(
    (nodeId: string): string => {
      const game = scope.getObjectAt<HengeGame_化ゲーム>(nodeId, HENGE_GAME_TYPE, gameId);
      return game ? `${game.revision} 回目` : "";
    },
    [scope, gameId],
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
