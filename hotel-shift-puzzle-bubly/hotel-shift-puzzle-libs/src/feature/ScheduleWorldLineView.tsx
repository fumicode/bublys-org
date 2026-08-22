'use client';

/**
 * ScheduleWorldLineView — 勤務表ごとのローカル世界線（canvas版）
 *
 * 勤務表専用のローカル世界線スコープ（schedule:${id}）を、囲碁などと同じ共通ビュー
 * {@link WorldLineScopeView}（既定の左→右 canvas）で描く。
 *   - ノードクリック / 矢印キーでその時点の勤務表状態へ時間移動（restore でアプリ全体
 *     リポジトリへ反映するので、グリッドの表示も戻る）。onSelectNode に restore を渡す。
 *   - nameable で apex（選択中の世界）に名前をつけられる（setNodeLabel）。
 *   - ノード要約は出さない（操作の詳細は操作履歴パネルで見る）。
 *   - Cmd+Z はデータ undo 用に予約のため使わない。矢印キーのみ。
 *
 * 「完成レポートを作成」ボタンは勤務表（ScheduleGrid）側に移した。ここは純粋に
 * 世界線の可視化・時間移動だけを担う。
 */
import { FC, useMemo } from "react";
import styled from "styled-components";
import {
  WorldLineScopeView,
  type KeyBinding,
} from "@bublys-org/bubbles-ui";
import { useScheduleHistory } from "./useScheduleHistory.js";
import { ClimberWorldLineCanvasView } from "../ui/ClimberWorldLineCanvasView.js";

type Props = {
  scheduleId: string;
};

export const ScheduleWorldLineView: FC<Props> = ({ scheduleId }) => {
  const { scope, restore } = useScheduleHistory(scheduleId);

  // 矢印キーで時間移動（← 親 / → 子 / ↑↓ 分岐の兄弟切替）。すべて restore 経由で
  // アプリ全体スコープへ反映する（共通の moveToSiblingBranch は scope.moveTo を使うので
  // ここでは restore 版を自前で持つ）。
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
      <div style={{ padding: 24, color: "#888", fontSize: "0.85em" }}>
        履歴がありません。勤務表を編集すると記録されます。
      </div>
    );
  }

  // canvas はバブルいっぱい（WorldLineScopeView が 100% に広がる）。バブルの初期サイズは
  // route の bubbleOptions.initialSize で与え、リサイズすると canvas も伸縮する。
  // nameable で選択中の世界に名前をつけられる。
  return (
    <StyledWrap>
      <WorldLineScopeView
        scope={scope}
        keyBindings={keyBindings}
        onSelectNode={restore}
        renderCanvas={(props) => <ClimberWorldLineCanvasView {...props} />}
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
