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
 * 「確定してレポート作成」ボタン: apex の勤務表状態からシフト完成レポート
 * （妥協・繁忙日対応・貢献度スコア）を計算して保存し、apex に確定ラベルを付ける
 * （＝成果木への追加。既存の setNodeLabel をそのまま「確定」印として使う）。
 */
import { FC, useMemo, useState } from "react";
import styled from "styled-components";
import {
  WorldLineScopeView,
  type KeyBinding,
} from "@bublys-org/bubbles-ui";
import {
  MonthlyStaffSchedule,
  Staff,
  WorkShiftSet,
  StaffMonthlyShiftWish,
  ScheduleConstraints,
  ScheduleReport,
} from "@bublys-org/hotel-shift-puzzle-model";
import { useScheduleHistory } from "./useScheduleHistory.js";
import { buildScheduleReport } from "./buildScheduleReport.js";
import { buildScheduleConstraints } from "./scheduleConstraints.js";
import { ClimberWorldLineCanvasView } from "../ui/ClimberWorldLineCanvasView.js";
import { useObjects, useObject, useObjectRepo } from "../objects/repository.js";
import { pruneUnusedForecastBranches, localScopeId } from "../objects/commit.js";
import { useAppStore } from "@bublys-org/state-management";
import {
  SCHEDULE_TYPE,
  STAFF_TYPE,
  WORKSHIFT_SET_TYPE,
  STAFF_SHIFT_WISH_TYPE,
  SCHEDULE_CONSTRAINTS_TYPE,
  SCHEDULE_REPORT_TYPE,
} from "../objects/hotelObjects.js";

type Props = {
  scheduleId: string;
  /** レポート確定後に呼ばれる（レポートバブルを開くのは app 層の関心事） */
  onConfirm?: (reportId: string) => void;
};

export const ScheduleWorldLineView: FC<Props> = ({ scheduleId, onConfirm }) => {
  const store = useAppStore();
  const { scope, restore } = useScheduleHistory(scheduleId);
  const [showForecasts, setShowForecasts] = useState(false);
  const [pruneMessage, setPruneMessage] = useState<string | null>(null);

  const staffList = useObjects<Staff>(STAFF_TYPE);
  const workShiftSet = useObject<WorkShiftSet>(WORKSHIFT_SET_TYPE, scheduleId);
  const workShifts = useMemo(() => workShiftSet?.shifts ?? [], [workShiftSet]);
  const allWishes = useObjects<StaffMonthlyShiftWish>(STAFF_SHIFT_WISH_TYPE);
  const scheduleConstraints = useObject<ScheduleConstraints>(
    SCHEDULE_CONSTRAINTS_TYPE,
    scheduleId
  );
  const reportRepo = useObjectRepo<ScheduleReport>(SCHEDULE_REPORT_TYPE);

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

  // 「確定してレポート作成」: apex の勤務表状態からレポートを計算して保存し、
  // apex に確定ラベルを付ける（未命名なら既定ラベルを自動生成。既に名前が
  // 付いていれば尊重してそのまま残す）。
  const handleConfirm = () => {
    const apex = scope.graph.getApex();
    if (!apex) return;
    const schedule = scope.getObjectAt<MonthlyStaffSchedule>(
      apex.id,
      SCHEDULE_TYPE,
      scheduleId
    );
    if (!schedule) return;

    const shiftNameById = new Map(workShifts.map((w) => [w.id, w.name]));
    const wishByStaff = new Map<string, StaffMonthlyShiftWish>();
    for (const w of allWishes) {
      if (w.year === schedule.year && w.month === schedule.month) {
        wishByStaff.set(w.staffId, w);
      }
    }

    // グリッド（ScheduleGrid）の allConstraints と同じ組み立て。連勤・責任者・休日・
    // 休み上限・希望を1本の制約リストにし、妥協判定（buildScheduleReport）とグリッドの
    // ⊿・赤帯表示が同じ基準になるようにする。
    const shiftIdsOf = (shiftName: string) =>
      workShifts.filter((w) => w.name === shiftName).map((w) => w.id);
    const constraints = buildScheduleConstraints({
      modelConstraints: scheduleConstraints?.modelConstraints(shiftIdsOf),
      wish: (scheduleConstraints?.checkShiftWish ?? true)
        ? { wishByStaff, shiftNameById }
        : undefined,
    });

    const draft = buildScheduleReport({
      schedule,
      staffIds: staffList.map((s) => s.id),
      constraints,
    });

    const report = ScheduleReport.create({
      scheduleId,
      worldLineNodeId: apex.id,
      year: schedule.year,
      month: schedule.month,
      storeId: schedule.storeId,
      ...draft,
    });
    reportRepo.save(report);

    if (!apex.label) {
      scope.setNodeLabel(apex.id, `確定: ${schedule.year}年${schedule.month}月`);
    }

    onConfirm?.(report.id);
  };

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
        renderCanvas={(props) => (
          <ClimberWorldLineCanvasView
            {...props}
            showForecasts={showForecasts}
          />
        )}
        nameable
      />
      <button
        type="button"
        className="e-forecast-toggle"
        onClick={() => setShowForecasts((visible) => !visible)}
      >
        {showForecasts ? "予測を折りたたむ" : "予測を展開"}
      </button>
      <button
        type="button"
        className="e-forecast-prune"
        title="今いる地点の可能性枝以外の古い予測ノードを削除します"
        onClick={() => {
          const { removed } = pruneUnusedForecastBranches(
            store,
            localScopeId(SCHEDULE_TYPE, scheduleId)
          );
          setPruneMessage(
            removed > 0
              ? `使われていない予測を${removed}件削除しました`
              : "削除する予測はありませんでした"
          );
        }}
      >
        使っていない予測を削除
      </button>
      {pruneMessage && (
        <div className="e-prune-msg">
          {pruneMessage}
          <button type="button" onClick={() => setPruneMessage(null)}>
            ×
          </button>
        </div>
      )}
      <button
        type="button"
        className="e-confirm"
        onClick={handleConfirm}
        title="今表示している勤務表を確定し、妥協・繁忙日対応・貢献度のレポートを作成します"
      >
        🏁 確定してレポート作成
      </button>
    </StyledWrap>
  );
};

const StyledWrap = styled.div`
  position: relative;
  width: 100%;
  height: 100%;

  .e-confirm {
    position: absolute;
    right: 10px;
    bottom: 10px;
    z-index: 3;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 8px;
    background: rgba(46, 125, 50, 0.85);
    color: #fff;
    font-size: 0.8em;
    font-weight: 600;
    padding: 6px 12px;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;

    &:hover {
      background: rgba(56, 142, 60, 0.95);
      border-color: rgba(255, 255, 255, 0.55);
    }
  }

  .e-forecast-toggle {
    position: absolute;
    left: 10px;
    bottom: 10px;
    z-index: 3;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    background: rgba(63, 81, 181, 0.72);
    color: #fff;
    font-size: 0.76em;
    padding: 6px 10px;
    cursor: pointer;
  }

  .e-forecast-prune {
    position: absolute;
    left: 10px;
    bottom: 44px;
    z-index: 3;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 8px;
    background: rgba(55, 71, 79, 0.75);
    color: #fff;
    font-size: 0.72em;
    padding: 5px 9px;
    cursor: pointer;
  }

  .e-prune-msg {
    position: absolute;
    left: 10px;
    bottom: 78px;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 6px;
    background: rgba(20, 22, 30, 0.85);
    color: rgba(235, 240, 255, 0.95);
    font-size: 0.72em;

    button {
      border: none;
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
  }
`;
