'use client';

/**
 * PrimitiveGanttEditor — プリミティブUIガントエディター
 *
 * Redux連携：BlockList ベースのシフト配置データを読み書きする。
 * - TaskSelectionPanelView でタスクをブラシとして選択
 * - PrimitiveGanttView でセルをクリック/ドラッグして局員を配置
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
  setMemberList,
} from '../slice/index.js';
import {
  addUserToBlock,
  removeUserFromBlock,
  addUserToBlockRange,
} from '../slice/shift-plan-slice.js';
import {
  ShiftPlan,
  type DayType,
} from '../domain/index.js';
import { createSampleMemberList } from '../data/sampleMember.js';
import { createDefaultShifts, createDefaultTimeSchedules, DAY_TYPE_ORDER } from '../data/sampleData.js';
import { PrimitiveGanttView } from '../ui/PrimitiveGanttView.js';
import { TaskSelectionPanelView } from '../ui/TaskSelectionPanelView.js';
import { type GanttConfig } from '../ui/MemberGanttView.js';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';

// ========== 型定義 ==========

type PrimitiveGanttEditorProps = {
  shiftPlanId: string;
  initialDayType?: DayType;
};

// ========== コンポーネント ==========

export const PrimitiveGanttEditor: FC<PrimitiveGanttEditorProps> = ({
  shiftPlanId,
  initialDayType,
}) => {
  const dispatch = useAppDispatch();
  const members = useAppSelector(selectShiftPuzzleMemberList);
  const shiftPlan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));

  const [selectedDayType, setSelectedDayType] = useState<DayType | undefined>(initialDayType);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [minuteGranularity, setMinuteGranularity] = useState<60 | 30 | 15>(15);
  const [filterDayType, setFilterDayType] = useState<DayType | undefined>(initialDayType);

  const allShifts = useMemo(() => createDefaultShifts(), []);
  const allTimeSchedules = useMemo(() => createDefaultTimeSchedules(), []);

  // ShiftPlan がなければ初期化
  useEffect(() => {
    if (members.length === 0) {
      dispatch(setMemberList(createSampleMemberList().map((m) => m.state)));
    }
  }, [dispatch, members.length]);

  useEffect(() => {
    if (!shiftPlan) {
      const plan = ShiftPlan.create('プリミティブガント用プラン', '晴れ');
      // BlockList付きシフトを追加
      const shiftsWithBlockList = allShifts.map((s) => ({
        ...s.state,
        blockList: { blocks: Array.from({ length: Math.ceil(s.durationMinutes / 15) }, () => [] as string[]) },
      }));
      const updatedPlan = new ShiftPlan({
        ...plan.state,
        id: shiftPlanId,
        shifts: shiftsWithBlockList,
        timeSchedules: allTimeSchedules.map((ts) => ts.state),
      });
      dispatch(addShiftPlan(updatedPlan.state));
    }
  }, [shiftPlan, shiftPlanId, dispatch, allShifts, allTimeSchedules]);

  // プランのシフト（BlockList付き）を使用
  const planShifts = useMemo(() => {
    if (!shiftPlan) return allShifts;
    return shiftPlan.shifts.length > 0 ? shiftPlan.shifts : allShifts;
  }, [shiftPlan, allShifts]);

  const planTimeSchedules = useMemo(() => {
    if (!shiftPlan) return allTimeSchedules;
    return shiftPlan.timeSchedules.length > 0 ? shiftPlan.timeSchedules : allTimeSchedules;
  }, [shiftPlan, allTimeSchedules]);

  const ganttConfig: GanttConfig = { hourPx: 60, minuteGranularity };

  // 各シフトの配置人数マップ（TaskSelectionPanel 用）
  const assignedCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const shift of planShifts) {
      const count = shift.getAssignedUserIds().length;
      map.set(shift.id, count);
    }
    return map;
  }, [planShifts]);

  // セルクリック（単セルトグル）
  const handleCellClick = (shiftId: string, memberId: string, blockIndex: number) => {
    if (!activeShiftId || activeShiftId !== shiftId) return;
    const shift = planShifts.find((s) => s.id === shiftId);
    if (!shift) return;

    if (shift.blockList.hasUser(blockIndex, memberId)) {
      dispatch(removeUserFromBlock({ planId: shiftPlanId, shiftId, blockIndex, userId: memberId }));
    } else {
      dispatch(addUserToBlock({ planId: shiftPlanId, shiftId, blockIndex, userId: memberId }));
    }
  };

  // ドラッグ範囲確定（範囲追加）
  const handleCellDragRange = (shiftId: string, memberId: string, startBlock: number, endBlock: number) => {
    if (!activeShiftId || activeShiftId !== shiftId) return;
    dispatch(addUserToBlockRange({ planId: shiftPlanId, shiftId, startBlock, endBlock, userId: memberId }));
  };

  return (
    <StyledEditor>
      {/* サイドパネル: タスク選択 */}
      <div className="e-side-panel">
        <TaskSelectionPanelView
          shifts={allShifts}
          timeSchedules={allTimeSchedules}
          assignedCountMap={assignedCountMap}
          activeShiftId={activeShiftId}
          filterDayType={filterDayType}
          onSelectDayType={(dt) => {
            setFilterDayType(dt);
            setSelectedDayType(dt);
          }}
          onSelectShift={setActiveShiftId}
        />
      </div>

      {/* メインガント */}
      <div className="e-main-area">
        {/* ツールバー */}
        <div className="e-toolbar">
          {/* 日程フィルター */}
          <div className="e-day-filter">
            <button
              className={`e-day-btn ${!selectedDayType ? 'is-active' : ''}`}
              onClick={() => setSelectedDayType(undefined)}
            >
              全日程
            </button>
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

          {/* アクティブブラシ表示 */}
          {activeShiftId && (
            <div className="e-active-brush">
              <span className="e-brush-label">
                ブラシ: {planShifts.find((s) => s.id === activeShiftId)?.taskName ?? activeShiftId}
              </span>
              <button className="e-clear-brush" onClick={() => setActiveShiftId(null)}>✕</button>
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
            activeShiftId={activeShiftId}
            onCellClick={handleCellClick}
            onCellDragRange={handleCellDragRange}
          />
        </div>
      </div>
    </StyledEditor>
  );
};

// ========== スタイル ==========

const StyledEditor = styled.div`
  display: flex;
  height: 100%;
  overflow: hidden;
  font-size: 0.9em;

  .e-side-panel {
    width: 200px;
    flex-shrink: 0;
    border-right: 2px solid #ddd;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .e-main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

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

  .e-clear-brush {
    border: none;
    background: none;
    cursor: pointer;
    color: #1565c0;
    font-size: 0.85em;
    padding: 0;
    line-height: 1;

    &:hover { opacity: 0.7; }
  }

  .e-gantt-container {
    flex: 1;
    overflow: auto;
    padding: 8px;
  }
`;
