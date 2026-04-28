'use client';

/**
 * PrimitiveGanttEditor — プリミティブUIガントエディター
 *
 * Redux連携：BlockList ベースのシフト配置データを読み書きする。
 * - ブラシソース：別バブル（shift-puzzle/tasks の TaskList）からタスクをドラッグ
 * - PrimitiveGanttView でセルにホバー連続ペイントして局員を配置
 * - 粒度切替（15/30/60分）で表示変更
 * - 既存D&Dガント（MemberGanttEditor）とは独立して共存
 */

import { FC, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector, useAppStore } from '@bublys-org/state-management';
import {
  selectShiftPuzzleMemberList,
  selectShiftPuzzlePlanById,
  selectSelectedTaskId,
  setSelectedTaskId,
  addShiftPlan,
  updateShiftPlan,
  setMemberList,
} from '../slice/index.js';
import {
  addUserToBlockRange,
  removeUserFromBlockRange,
  moveUserBlocks,
} from '../slice/shift-plan-slice.js';
import {
  ShiftPlan,
  type DayType,
  type ShiftState,
  type BlockListState,
} from '../domain/index.js';
import { createSampleMemberList } from '../data/sampleMember.js';
import { createDefaultShifts, createDefaultTimeSchedules, DAY_TYPE_ORDER } from '../data/sampleData.js';
import { PrimitiveGanttView, type RowAvailability } from '../ui/PrimitiveGanttView.js';
import { type GanttConfig } from '../ui/MemberGanttView.js';
import { draggingTaskId } from '../ui/TaskListView.js';
import { ShiftPlanTabs, type ComparisonMode } from './ShiftPlanTabs.js';
import { selectShiftsAtTab, moveBackInPlan, moveForwardInPlan } from '../world-line/index.js';

// ========== 型定義 ==========

type PrimitiveGanttEditorProps = {
  shiftPlanId: string;
  initialDayType?: DayType;
  /** 既配置run（バー）クリックで配置状況バブル等へ遷移する callback */
  onAssignedRunOpen?: (shiftId: string, taskId: string) => void;
  /** 既配置run を展開元としてマークするための URL ビルダ。LinkBubbleの曲線描画に利用 */
  buildRunUrl?: (shiftId: string) => string;
};

// ========== コンポーネント ==========

export const PrimitiveGanttEditor: FC<PrimitiveGanttEditorProps> = ({
  shiftPlanId,
  initialDayType,
  onAssignedRunOpen,
  buildRunUrl,
}) => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const members = useAppSelector(selectShiftPuzzleMemberList);
  const shiftPlan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));
  const selectedTaskId = useAppSelector(selectSelectedTaskId);

  const [selectedDayType, setSelectedDayType] = useState<DayType | undefined>(initialDayType);

  /** 比較対象タブのノード ID（null = 比較オフ） */
  const [comparisonNodeId, setComparisonNodeId] = useState<string | null>(null);
  /** 表示モード */
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('normal');

  /** TaskList ドラッグ中の taskId（ブラシ優先度：ドラッグ > クリック選択） */
  const [dragBrushTaskId, setDragBrushTaskId] = useState<string | null>(null);

  /**
   * 実効ブラシ ID：ドラッグ中はドラッグ対象を、そうでなければ TaskList のクリック選択を使う。
   * これによりクリックで選択したタスクでも配置可能セルがハイライトされる。
   */
  const brushTaskId = dragBrushTaskId ?? selectedTaskId;

  const allShifts = useMemo(() => createDefaultShifts(), []);
  const allTimeSchedules = useMemo(() => createDefaultTimeSchedules(), []);

  // 初期データロード
  useEffect(() => {
    if (members.length === 0) {
      dispatch(setMemberList(createSampleMemberList().map((m) => m.state)));
    }
  }, [dispatch, members.length]);

  // ShiftPlan 初期化 & master への同期
  //
  // 永続化された plan.shifts が master（sampleData）と乖離すると、
  // TaskList には載るがドラッグ時に配置場所が highlight されないタスクが発生する
  // （candidates フィルタが shift.taskId で空になるため）。
  // このため master の shift 集合を「単一の source of truth」として扱い、
  // 既存プランの blockList だけを id でマッピングして引き継ぐ。
  useEffect(() => {
    const tsMap = new Map(allTimeSchedules.map((ts) => [ts.id, ts]));

    const buildShiftsFromMaster = (existing: readonly ShiftState[] = []): ShiftState[] => {
      const existingBLMap = new Map<string, BlockListState>();
      for (const s of existing) {
        if (s.blockList) existingBLMap.set(s.id, s.blockList);
      }
      return allShifts.map((s) => {
        const ts = s.timeScheduleId ? tsMap.get(s.timeScheduleId) : undefined;
        const totalBlocks = ts ? ts.totalBlocks : Math.ceil(s.durationMinutes / 15);
        const existingBL = existingBLMap.get(s.id);
        // TimeSchedule の範囲が変わって totalBlocks が変わった場合はリセット
        const bl: BlockListState = existingBL && existingBL.blocks.length === totalBlocks
          ? existingBL
          : { blocks: Array.from({ length: totalBlocks }, () => [] as string[]) };
        return {
          ...s.state,
          blockList: bl,
        };
      });
    };

    if (!shiftPlan) {
      const plan = ShiftPlan.create('プリミティブガント用プラン', '晴れ');
      const updatedPlan = new ShiftPlan({
        ...plan.state,
        id: shiftPlanId,
        shifts: buildShiftsFromMaster(),
        timeSchedules: allTimeSchedules.map((ts) => ts.state),
      });
      dispatch(addShiftPlan(updatedPlan.state));
      return;
    }

    // 既存プラン → master と同期が必要か判定
    const planShiftStates = shiftPlan.state.shifts ?? [];
    const masterIds = new Set(allShifts.map((s) => s.id));
    const planIds = new Set(planShiftStates.map((s) => s.id));
    const hasMissing = allShifts.some((s) => !planIds.has(s.id));
    const hasOrphan = planShiftStates.some((s) => !masterIds.has(s.id));

    const planTsStates = shiftPlan.state.timeSchedules ?? [];
    const planTsIds = new Set(planTsStates.map((t) => t.id));
    const tsMismatch = planTsStates.length !== allTimeSchedules.length
      || allTimeSchedules.some((t) => !planTsIds.has(t.id));

    if (hasMissing || hasOrphan || tsMismatch) {
      dispatch(updateShiftPlan({
        ...shiftPlan.state,
        shifts: buildShiftsFromMaster(planShiftStates),
        timeSchedules: allTimeSchedules.map((ts) => ts.state),
      }));
    }
  }, [shiftPlan, shiftPlanId, dispatch, allShifts, allTimeSchedules]);

  // window の dragstart/dragend を監視してドラッグ中ブラシを同期
  useEffect(() => {
    const handleDragStart = () => {
      if (draggingTaskId) setDragBrushTaskId(draggingTaskId);
    };
    const handleDragEnd = () => {
      setDragBrushTaskId(null);
    };
    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('dragend', handleDragEnd);
    return () => {
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  // Ctrl+Z / Ctrl+Shift+Z（Mac は Cmd）で世界線を undo/redo。
  // - apex を 1 ステップ移動 + そのノード時点の shifts を完全復元
  // - 入力フォーカス中は無視（ブラウザ標準の編集 undo を尊重）
  useEffect(() => {
    const isEditableTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key !== 'z' && e.key !== 'Z') return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) {
        moveForwardInPlan(shiftPlanId)(store.dispatch, store.getState);
      } else {
        moveBackInPlan(shiftPlanId)(store.dispatch, store.getState);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shiftPlanId, store]);

  // プランから shifts / timeSchedules を取得
  const planShifts = useMemo(() => {
    if (!shiftPlan) return allShifts;
    return shiftPlan.shifts.length > 0 ? shiftPlan.shifts : allShifts;
  }, [shiftPlan, allShifts]);

  const planTimeSchedules = useMemo(() => {
    if (!shiftPlan) return allTimeSchedules;
    return shiftPlan.timeSchedules.length > 0 ? shiftPlan.timeSchedules : allTimeSchedules;
  }, [shiftPlan, allTimeSchedules]);

  // 比較タブの shifts（CAS から復元）。比較オフなら空配列。
  // タブ＝アンカー（命名時点）ではなく、その系譜の最新 leaf を比較対象として使う
  // （Git ブランチ風モデル）。
  const comparisonShiftStates = useAppSelector((s) =>
    selectShiftsAtTab(s, shiftPlanId, comparisonNodeId)
  );
  const effectiveComparisonMode: ComparisonMode =
    comparisonNodeId === null || comparisonShiftStates.length === 0
      ? 'normal'
      : comparisonMode;

  const ganttConfig: GanttConfig = { hourPx: 60 };

  /**
   * 行の受け入れ可否マップ（ブラシ中のみ意味がある）。
   * - unavailable: ブラシタスクの全シフトに対し参加不可
   * - warning:     参加可能だが担当局が全シフトと不一致
   * - available:   参加可能 + 担当局一致あり
   */
  const rowAvailabilityMap = useMemo((): Map<string, RowAvailability> => {
    if (!brushTaskId) return new Map();
    const taskShifts = planShifts.filter((s) => s.taskId === brushTaskId);
    if (taskShifts.length === 0) return new Map();

    const map = new Map<string, RowAvailability>();
    for (const member of members) {
      const anyAvailable = taskShifts.some((s) => member.isAvailableForShift(s));
      if (!anyAvailable) {
        map.set(member.id, 'unavailable');
        continue;
      }
      const departmentMatches = taskShifts.some(
        (s) => !s.responsibleDepartment || member.department === s.responsibleDepartment,
      );
      map.set(member.id, departmentMatches ? 'available' : 'warning');
    }
    return map;
  }, [brushTaskId, planShifts, members]);

  // 範囲ペイント（drop確定時）
  const handlePaintRange = (shiftId: string, memberId: string, startBlock: number, endBlock: number) => {
    dispatch(addUserToBlockRange({ planId: shiftPlanId, shiftId, startBlock, endBlock, userId: memberId }));
  };

  // 範囲削除（×ボタン）
  const handleRemoveRange = (shiftId: string, memberId: string, startBlock: number, endBlock: number) => {
    dispatch(removeUserFromBlockRange({ planId: shiftPlanId, shiftId, startBlock, endBlock, userId: memberId }));
  };

  // 既配置バーの移動・リサイズ
  const handleMoveRun = (
    shiftId: string,
    oldMemberId: string,
    oldStart: number,
    oldEnd: number,
    newMemberId: string,
    newStart: number,
    newEnd: number,
  ) => {
    dispatch(moveUserBlocks({
      planId: shiftPlanId,
      shiftId,
      oldUserId: oldMemberId,
      oldStart,
      oldEnd,
      newUserId: newMemberId,
      newStart,
      newEnd,
    }));
  };

  // 既配置バー（run）クリック → 親に shiftId + taskId を通知（配置状況バブルへ遷移など）
  const handleAssignedRunClick = (shiftId: string) => {
    const shift = planShifts.find((s) => s.id === shiftId);
    if (shift && onAssignedRunOpen) onAssignedRunOpen(shift.id, shift.taskId);
  };

  return (
    <StyledEditor>
      {/* 世界線タブ + 比較コントロール */}
      <ShiftPlanTabs
        planId={shiftPlanId}
        comparisonNodeId={comparisonNodeId}
        comparisonMode={comparisonMode}
        onChangeComparison={setComparisonNodeId}
        onChangeMode={setComparisonMode}
      />

      {/* ツールバー */}
      <div className="e-toolbar">
        {/* 日程フィルター */}
        <div className="e-day-filter">
          {DAY_TYPE_ORDER.map((dt) => (
            <button
              key={dt}
              className={`e-day-btn ${selectedDayType === dt ? 'is-active' : ''}`}
              onClick={() => setSelectedDayType(dt)}
            >
              {dt}
            </button>
          ))}
        </div>

        {/* ブラシ表示（クリック選択中はクリアボタンを併設） */}
        {brushTaskId && (
          <div className="e-active-brush">
            <span className="e-brush-label">
              ブラシ: {planShifts.find((s) => s.taskId === brushTaskId)?.taskName ?? brushTaskId}
            </span>
            {!dragBrushTaskId && selectedTaskId && (
              <button
                type="button"
                className="e-brush-clear"
                onClick={() => dispatch(setSelectedTaskId(null))}
                aria-label="ブラシを解除"
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* ガントビュー */}
      <div className="e-gantt-container">
        <PrimitiveGanttView
          shifts={planShifts}
          timeSchedules={planTimeSchedules}
          members={members}
          selectedDayType={selectedDayType}
          ganttConfig={ganttConfig}
          brushTaskId={brushTaskId}
          onPaintRange={handlePaintRange}
          onRemoveRange={handleRemoveRange}
          onMoveRun={handleMoveRun}
          onAssignedRunClick={handleAssignedRunClick}
          buildRunUrl={buildRunUrl}
          rowAvailabilityMap={rowAvailabilityMap}
          comparisonShifts={comparisonShiftStates}
          comparisonMode={effectiveComparisonMode}
        />
      </div>
    </StyledEditor>
  );
};

// ========== スタイル ==========

const StyledEditor = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-size: 0.9em;

  .e-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 10px;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .e-day-filter {
    display: flex;
    gap: 4px;
  }

  .e-day-btn {
    padding: 2px 8px;
    border: 1px solid #ccc;
    border-radius: 12px;
    background: #fff;
    cursor: pointer;
    font-size: 0.82em;
    color: #555;
    transition: background 0.1s;

    &:hover { background: #f5f5f5; }
    &.is-active {
      background: #1976d2;
      border-color: #1976d2;
      color: #fff;
    }
  }

  .e-granularity {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .e-granularity-label {
    font-size: 0.82em;
    color: #666;
  }

  .e-active-brush {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    background: #e3f2fd;
    border: 1px solid #90caf9;
    border-radius: 12px;
  }

  .e-brush-label {
    font-size: 0.82em;
    color: #1565c0;
    font-weight: 600;
  }

  .e-brush-clear {
    border: none;
    background: transparent;
    color: #1565c0;
    font-size: 1.1em;
    line-height: 1;
    cursor: pointer;
    padding: 0 2px;
    border-radius: 10px;
    &:hover {
      background: rgba(21, 101, 192, 0.15);
    }
  }

  .e-gantt-container {
    flex: 1;
    overflow: auto;
  }
`;
