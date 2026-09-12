'use client';

/**
 * ScheduleWorldLineView — 勤務表ごとのローカル世界線（canvas版）
 *
 * 勤務表専用のローカル世界線スコープ（Schedule:${id}）を、囲碁などと同じ共通ビュー
 * {@link WorldLineScopeView}（既定の左→右 canvas）で描く。時間が左から右へ流れ、分岐は
 * 下へ伸びるので、長い世界線を辿りやすい。
 * （勤務表専用の「木登り」ビュー ClimberWorldLineCanvasView も ui に置いてあるが、
 *   いまは使っていない。renderCanvas に渡せば差し替えられる）
 *   - ノードクリック / 矢印キーでその時点の勤務表状態へ時間移動。読みもこの世界から
 *     なので、共通の既定（scope.moveTo）と moveToSiblingBranch がそのまま使える
 *     （以前はアプリ全体スコープへ書き戻す restore 版を自前で持っていた）。
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
  moveToSiblingBranch,
  type KeyBinding,
} from "@bublys-org/bubbles-ui";
import { useScheduleHistory } from "./useScheduleHistory.js";
import { ScheduleWorld } from "./ScheduleWorld.js";

type Props = {
  scheduleId: string;
};

const ScheduleWorldLineViewBody: FC<Props> = () => {
  const { scope } = useScheduleHistory();

  // 矢印キーで時間移動（← 親 / → 子 / ↑↓ 分岐の兄弟切替）。
  const keyBindings = useMemo<KeyBinding[]>(
    () => [
      {
        key: "ArrowLeft",
        run: () => {
          const apex = scope.graph.getApex();
          if (apex?.parentId) scope.moveTo(apex.parentId);
        },
      },
      {
        key: "ArrowRight",
        run: () => {
          const apex = scope.graph.getApex();
          const child = apex && scope.graph.getChildrenMap()[apex.id]?.[0];
          if (child) scope.moveTo(child);
        },
      },
      { key: "ArrowUp", run: () => moveToSiblingBranch(scope, -1) },
      { key: "ArrowDown", run: () => moveToSiblingBranch(scope, 1) },
    ],
    [scope]
  );

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
      <WorldLineScopeView scope={scope} keyBindings={keyBindings} nameable />
    </StyledWrap>
  );
};

/** この勤務表の世界に入ってから世界線を描く */
export const ScheduleWorldLineView: FC<Props> = (props) => (
  <ScheduleWorld scheduleId={props.scheduleId}>
    <ScheduleWorldLineViewBody {...props} />
  </ScheduleWorld>
);

const StyledWrap = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;
