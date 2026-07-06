'use client';

/**
 * ScheduleWorldLineView — 勤務表ごとのローカル世界線（canvas版）
 *
 * 勤務表専用のローカル世界線スコープ（schedule:${id}）を、共通ラッパ
 * {@link WorldLineScopeView} ＋ ホテル専用の下→上・木登りビュー
 * {@link ClimberWorldLineCanvasView}（renderCanvas で差し替え）で描く。
 *   - ノードクリック / 矢印キーでその時点の勤務表状態へ時間移動（restore でアプリ全体
 *     リポジトリへ反映するので、グリッドの表示も戻る）。onSelectNode に restore を渡す。
 *   - nameable で apex（選択中の世界）に名前をつけられる（setNodeLabel）。
 *   - 各ノードの要約は勤務表の割当件数。
 *   - Cmd+Z はデータ undo 用に予約のため使わない。矢印キーのみ。
 */
import { FC, useMemo } from "react";
import {
  WorldLineScopeView,
  useScopeNodeSummaries,
  type KeyBinding,
} from "@bublys-org/bubbles-ui";
import { MonthlyStaffSchedule } from "@bublys-org/hotel-shift-puzzle-model";
import { ClimberWorldLineCanvasView } from "../ui/ClimberWorldLineCanvasView.js";
import { useScheduleHistory } from "./useScheduleHistory.js";
import { SCHEDULE_TYPE } from "../objects/hotelObjects.js";

type Props = {
  scheduleId: string;
};

const formatAssignments = (s: unknown) =>
  `${(s as MonthlyStaffSchedule).assignments.length}件`;

export const ScheduleWorldLineView: FC<Props> = ({ scheduleId }) => {
  const { scope, restore } = useScheduleHistory(scheduleId);
  const getNodeSummary = useScopeNodeSummaries(
    scope,
    SCHEDULE_TYPE,
    scheduleId,
    formatAssignments
  );

  // 矢印キーで時間移動（下→上の木登りビューに合わせる: ↑ 子＝未来へ登る / ↓ 親＝過去へ降りる
  // / ←→ 分岐の兄弟切替）。すべて restore 経由でアプリ全体スコープへ反映する
  // （共通の moveToSiblingBranch は scope.moveTo を使うのでここでは restore 版を自前で持つ）。
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
        key: "ArrowDown",
        run: () => {
          const apex = scope.graph.getApex();
          if (apex?.parentId) restore(apex.parentId);
        },
      },
      {
        key: "ArrowUp",
        run: () => {
          const apex = scope.graph.getApex();
          const child = apex && scope.graph.getChildrenMap()[apex.id]?.[0];
          if (child) restore(child);
        },
      },
      { key: "ArrowLeft", run: () => restoreSibling(-1) },
      { key: "ArrowRight", run: () => restoreSibling(1) },
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
    <WorldLineScopeView
      scope={scope}
      getNodeSummary={getNodeSummary}
      keyBindings={keyBindings}
      onSelectNode={restore}
      nameable
      renderCanvas={(p) => <ClimberWorldLineCanvasView {...p} />}
    />
  );
};
