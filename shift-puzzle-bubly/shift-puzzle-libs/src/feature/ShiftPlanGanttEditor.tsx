'use client';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import {
  Assignment,
  type AssignmentReasonState,
  type AssignmentState,
} from '@bublys-org/shift-puzzle-model';
import {
  selectShiftPlanById,
  selectMembersForEvent,
  selectRolesForEvent,
  selectTimeSlotsForEvent,
  selectViolationsForPlan,
  selectGanttHourPx,
  selectGanttAxisMode,
  selectGanttDayIndex,
  addAssignment,
  moveAssignment,
  setGanttAxisMode,
  setGanttDayIndex,
  setGanttHourPx,
} from '../slice/index.js';
import { GanttChartView } from '../ui/index.js';

interface ShiftPlanGanttEditorProps {
  shiftPlanId: string;
  eventId: string;
  /** 配置クリック時のコールバック（理由詳細表示等） */
  onAssignmentClick?: (assignmentId: string) => void;
}

/** ガントチャート編集画面（Redux連携） */
export const ShiftPlanGanttEditor: React.FC<ShiftPlanGanttEditorProps> = ({
  shiftPlanId,
  eventId,
  onAssignmentClick,
}) => {
  const dispatch = useAppDispatch();

  const shiftPlan = useAppSelector(selectShiftPlanById(shiftPlanId));
  const members = useAppSelector(selectMembersForEvent(eventId));
  const roles = useAppSelector(selectRolesForEvent(eventId));
  const timeSlots = useAppSelector(selectTimeSlotsForEvent(eventId));
  const violations = useAppSelector(selectViolationsForPlan(shiftPlanId, eventId));
  const hourPx = useAppSelector(selectGanttHourPx);
  const axisMode = useAppSelector(selectGanttAxisMode);
  const dayIndex = useAppSelector(selectGanttDayIndex);

  // 利用可能なdayIndex一覧
  const availableDays = useMemo(() => {
    const indices = [...new Set(timeSlots.map((s) => s.dayIndex))].sort((a, b) => a - b);
    return indices;
  }, [timeSlots]);

  const assignments = shiftPlan?.state.assignments ?? [];

  // ========== ハンドラ ==========

  const handleCreateAssignment = (
    memberId: string,
    timeSlotId: string,
    roleId: string,
    reason: AssignmentReasonState
  ) => {
    if (!shiftPlan) return;

    // 重複チェック（同じメンバー × 時間帯 × 役割）
    const exists = assignments.some(
      (a: AssignmentState) => a.memberId === memberId && a.timeSlotId === timeSlotId && a.roleId === roleId
    );
    if (exists) return;

    const assignment = Assignment.create({
      memberId,
      roleId,
      timeSlotId,
      shiftPlanId,
      reason,
    });

    dispatch(addAssignment({ shiftPlanId, assignment: assignment.toJSON() }));
  };

  const handleMoveAssignment = (assignmentId: string, newTimeSlotId: string) => {
    if (!shiftPlan) return;

    // ロック確認
    const target = assignments.find((a: AssignmentState) => a.id === assignmentId);
    if (target?.locked) return;

    dispatch(moveAssignment({ shiftPlanId, assignmentId, newTimeSlotId }));
  };

  if (!shiftPlan) {
    return <div style={{ padding: 16, color: '#666' }}>シフト案を読み込み中...</div>;
  }

  return (
    <StyledContainer>
      {/* ツールバー */}
      <div className="e-toolbar">
        <span className="e-plan-name">{shiftPlan.name}</span>
        {shiftPlan.scenarioLabel && (
          <span className="e-scenario-label">{shiftPlan.scenarioLabel}</span>
        )}

        {/* 表示モード切替 */}
        <div className="e-mode-switcher">
          <button
            className={`e-mode-btn ${axisMode === 'role' ? 'is-active' : ''}`}
            onClick={() => dispatch(setGanttAxisMode('role'))}
          >
            役割ビュー
          </button>
          <button
            className={`e-mode-btn ${axisMode === 'member' ? 'is-active' : ''}`}
            onClick={() => dispatch(setGanttAxisMode('member'))}
          >
            メンバービュー
          </button>
        </div>

        {/* 日付タブ（複数日の場合） */}
        {availableDays.length > 1 && (
          <div className="e-day-tabs">
            {availableDays.map((d) => (
              <button
                key={d}
                className={`e-day-tab ${dayIndex === d ? 'is-active' : ''}`}
                onClick={() => dispatch(setGanttDayIndex(d))}
              >
                Day {d + 1}
              </button>
            ))}
          </div>
        )}

        {/* ズーム */}
        <div className="e-zoom">
          <button
            className="e-zoom-btn"
            onClick={() => dispatch(setGanttHourPx(hourPx - 10))}
            disabled={hourPx <= 40}
          >
            −
          </button>
          <span className="e-zoom-label">{hourPx}px/h</span>
          <button
            className="e-zoom-btn"
            onClick={() => dispatch(setGanttHourPx(hourPx + 10))}
            disabled={hourPx >= 120}
          >
            ＋
          </button>
        </div>

        {/* 統計 */}
        <div className="e-stats">
          <span>配置数: {assignments.length}</span>
          {violations.length > 0 && (
            <span className="e-violation-badge">⚠ {violations.length}件の違反</span>
          )}
        </div>
      </div>

      {/* ガントチャート本体 */}
      <div className="e-gantt-wrapper">
        <GanttChartView
          members={members.map((m) => m.state)}
          roles={roles.map((r) => r.state)}
          timeSlots={timeSlots}
          assignments={[...assignments]}
          violations={violations}
          dayIndex={dayIndex}
          hourPx={hourPx}
          axisMode={axisMode}
          onCreateAssignment={handleCreateAssignment}
          onMoveAssignment={handleMoveAssignment}
          onAssignmentClick={(id) => {
            onAssignmentClick?.(id);
          }}
        />
      </div>
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .e-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    background: #fafafa;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .e-plan-name {
    font-weight: 600;
    font-size: 0.95em;
  }

  .e-scenario-label {
    background: #e8eaf6;
    color: #3949ab;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8em;
  }

  .e-mode-switcher {
    display: flex;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
  }

  .e-mode-btn {
    padding: 4px 10px;
    border: none;
    background: white;
    cursor: pointer;
    font-size: 0.8em;
    color: #555;

    &.is-active {
      background: #1976d2;
      color: white;
    }

    &:not(:last-child) {
      border-right: 1px solid #ddd;
    }
  }

  .e-day-tabs {
    display: flex;
    gap: 4px;
  }

  .e-day-tab {
    padding: 3px 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 0.8em;

    &.is-active {
      background: #1976d2;
      color: white;
      border-color: #1976d2;
    }
  }

  .e-zoom {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  .e-zoom-btn {
    width: 24px;
    height: 24px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 0.9em;
    display: flex;
    align-items: center;
    justify-content: center;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .e-zoom-label {
    font-size: 0.8em;
    color: #777;
    min-width: 50px;
    text-align: center;
  }

  .e-stats {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85em;
    color: #666;
  }

  .e-violation-badge {
    background: #fff3e0;
    color: #e65100;
    padding: 2px 8px;
    border-radius: 3px;
    border: 1px solid #ff8f00;
    font-weight: 500;
  }

  .e-gantt-wrapper {
    flex: 1;
    overflow: hidden;
  }
`;
