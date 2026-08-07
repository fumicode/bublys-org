'use client';

/**
 * PlacementBoardWorldLineView — 配置表ごとのローカル世界線（canvas 版）
 *
 * 配置表専用のローカル世界線スコープ（`PlacementBoard:${boardId}`）を、共通ビュー
 * {@link WorldLineScopeView}（既定の左→右 canvas 魚眼）で描く。
 *   - ノードクリック / 矢印キーでその時点の配置表状態へ時間移動（restore でアプリ全体
 *     リポジトリへ反映するので、グリッド表示も戻る）。onSelectNode に restore を渡す。
 *   - nameable で apex（選択中の世界）に名前をつけられる（setNodeLabel）。
 *   - 各ノードの要約は配置件数。
 */
import { FC, useMemo } from "react";
import styled from "styled-components";
import {
  WorldLineScopeView,
  useScopeNodeSummaries,
  type KeyBinding,
} from "@bublys-org/bubbles-ui";
import { PlacementBoard } from "@bublys-org/construction-shift-puzzle-model";
import { useBoardHistory } from "./useBoardHistory.js";
import { PLACEMENT_BOARD_TYPE, MAIN_BOARD_ID } from "../objects/constructionObjects.js";

type Props = {
  boardId?: string;
};

const formatSummary = (b: unknown) =>
  `配置 ${(b as PlacementBoard).assignments.length}件`;

export const PlacementBoardWorldLineView: FC<Props> = ({ boardId = MAIN_BOARD_ID }) => {
  const { scope, restore } = useBoardHistory(boardId);
  const getNodeSummary = useScopeNodeSummaries(
    scope,
    PLACEMENT_BOARD_TYPE,
    boardId,
    formatSummary
  );

  // 矢印キーで時間移動（← 親 / → 子 / ↑↓ 分岐の兄弟切替）。すべて restore 経由。
  const keyBindings = useMemo<KeyBinding[]>(() => {
    const restoreSibling = (delta: number) => {
      const apex = scope.graph.getApex();
      if (!apex || apex.parentId === null) return;
      const siblings = scope.graph.getChildrenMap()[apex.parentId] ?? [];
      const idx = siblings.indexOf(apex.id);
      const next = siblings[idx + delta];
      if (next) restore(next);
    };
    return [
      {
        key: "ArrowLeft",
        run: () => {
          const apex = scope.graph.getApex();
          if (apex?.parentId) restore(apex.parentId);
        },
      },
      {
        key: "ArrowRight",
        run: () => {
          const apex = scope.graph.getApex();
          const child = apex && scope.graph.getChildrenMap()[apex.id]?.[0];
          if (child) restore(child);
        },
      },
      { key: "ArrowUp", run: () => restoreSibling(-1) },
      { key: "ArrowDown", run: () => restoreSibling(1) },
    ];
  }, [scope, restore]);

  if (!scope.graph.state.rootNodeId) {
    return (
      <div style={{ padding: 24, color: "#ccc", fontSize: "0.85em" }}>
        履歴がありません。配置表を編集すると記録されます。
      </div>
    );
  }

  // canvas はバブルいっぱい（WorldLineScopeView が 100% に広がる）。
  return (
    <StyledWrap>
      <WorldLineScopeView
        scope={scope}
        getNodeSummary={getNodeSummary}
        keyBindings={keyBindings}
        onSelectNode={restore}
        nameable
      />
    </StyledWrap>
  );
};

const StyledWrap = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;
