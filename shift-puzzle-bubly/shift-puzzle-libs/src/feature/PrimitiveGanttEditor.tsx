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
import { useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import {
  selectShiftPuzzleMemberList,
  selectShiftPuzzlePlanById,
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
} from '../domain/index.js';
import { createSampleMemberList } from '../data/sampleMember.js';
import { createDefaultShifts, createDefaultTimeSchedules, DAY_TYPE_ORDER } from '../data/sampleData.js';
import { PrimitiveGanttView, type RowAvailability } from '../ui/PrimitiveGanttView.js';
import { type GanttConfig } from '../ui/MemberGanttView.js';
import { draggingTaskId } from '../ui/TaskListView.js';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

// ========== 型定義 ==========

type PrimitiveGanttEditorProps = {
  shiftPlanId: string;
  initialDayType?: DayType;
  /** セル（既配置）クリックでタスク詳細などへ遷移する callback */
  onAssignedCellClick?: (taskId: string) => void;
};

// ========== コンポーネント ==========

export const PrimitiveGanttEditor: FC<PrimitiveGanttEditorProps> = ({
  shiftPlanId,
  initialDayType,
  onAssignedCellClick,
}) => {
  const dispatch = useAppDispatch();
  const members = useAppSelector(selectShiftPuzzleMemberList);
  const shiftPlan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));

  const [selectedDayType, setSelectedDayType] = useState<DayType | undefined>(initialDayType);
  const [minuteGranularity, setMinuteGranularity] = useState<60 | 30 | 15>(15);

  /** TaskList ドラッグ中の taskId を購読してブラシ状態に反映 */
  const [brushTaskId, setBrushTaskId] = useState<string | null>(null);

  const allShifts = useMemo(() => createDefaultShifts(), []);
  const allTimeSchedules = useMemo(() => createDefaultTimeSchedules(), []);

  // 初期データロード
  useEffect(() => {
    if (members.length === 0) {
      dispatch(setMemberList(createSampleMemberList().map((m) => m.state)));
    }
  }, [dispatch, members.length]);

  // ShiftPlan 初期化（BlockList は TimeSchedule-scoped で確保）
  // 既存プランがあっても shifts が空なら BlockList 付きシフトを補充する
  // （旧D&Dガント版で作成された assignments[] のみのプランとも共存可能にする）
  useEffect(() => {
    const tsMap = new Map(allTimeSchedules.map((ts) => [ts.id, ts]));
    const buildShiftsWithBlockList = () => allShifts.map((s) => {
      const ts = s.timeScheduleId ? tsMap.get(s.timeScheduleId) : undefined;
      const totalBlocks = ts ? ts.totalBlocks : Math.ceil(s.durationMinutes / 15);
      return {
        ...s.state,
        blockList: { blocks: Array.from({ length: totalBlocks }, () => [] as string[]) },
      };
    });

    if (!shiftPlan) {
      const plan = ShiftPlan.create('プリミティブガント用プラン', '晴れ');
      const updatedPlan = new ShiftPlan({
        ...plan.state,
        id: shiftPlanId,
        shifts: buildShiftsWithBlockList(),
        timeSchedules: allTimeSchedules.map((ts) => ts.state),
      });
      dispatch(addShiftPlan(updatedPlan.state));
      return;
    }

    // 既存プランで shifts が未初期化 → 補充（assignments等は温存）
    if (shiftPlan.shifts.length === 0) {
      dispatch(updateShiftPlan({
        ...shiftPlan.state,
        shifts: buildShiftsWithBlockList(),
        timeSchedules: allTimeSchedules.map((ts) => ts.state),
      }));
    }
  }, [shiftPlan, shiftPlanId, dispatch, allShifts, allTimeSchedules]);

  // window の dragstart/dragend を監視してブラシ状態を同期
  useEffect(() => {
    const handleDragStart = () => {
      if (draggingTaskId) setBrushTaskId(draggingTaskId);
    };
    const handleDragEnd = () => {
      setBrushTaskId(null);
    };
    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('dragend', handleDragEnd);
    return () => {
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  // プランから shifts / timeSchedules を取得
  const planShifts = useMemo(() => {
    if (!shiftPlan) return allShifts;
    return shiftPlan.shifts.length > 0 ? shiftPlan.shifts : allShifts;
  }, [shiftPlan, allShifts]);

  const planTimeSchedules = useMemo(() => {
    if (!shiftPlan) return allTimeSchedules;
    return shiftPlan.timeSchedules.length > 0 ? shiftPlan.timeSchedules : allTimeSchedules;
  }, [shiftPlan, allTimeSchedules]);

  const ganttConfig: GanttConfig = { hourPx: 60, minuteGranularity };

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
      const anyAvailable = taskShifts.some((s) => member.isAvailableFor(s.id));
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

  // 既配置バークリック → 親に taskId を通知（タスク詳細バブルへ遷移など）
  const handleAssignedRunClick = (shiftId: string) => {
    const shift = planShifts.find((s) => s.id === shiftId);
    if (shift && onAssignedCellClick) onAssignedCellClick(shift.taskId);
  };

  return (
    <StyledEditor>
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

        {/* 粒度切替 */}
        <div className="e-granularity">
          <span className="e-granularity-label">表示粒度:</span>
          <ToggleButtonGroup
            value={minuteGranularity}
            exclusive
            onChange={(_, v) => v && setMinuteGranularity(v as 60 | 30 | 15)}
            size="small"
          >
            <ToggleButton value={60}>1h</ToggleButton>
            <ToggleButton value={30}>30m</ToggleButton>
            <ToggleButton value={15}>15m</ToggleButton>
          </ToggleButtonGroup>
        </div>

        {/* ブラシ表示 */}
        {brushTaskId && (
          <div className="e-active-brush">
            <span className="e-brush-label">
              ブラシ: {planShifts.find((s) => s.taskId === brushTaskId)?.taskName ?? brushTaskId}
            </span>
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
          rowAvailabilityMap={rowAvailabilityMap}
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

  .e-gantt-container {
    flex: 1;
    overflow: auto;
  }
`;
