'use client';

/**
 * MemberGanttEditor — 局員ガントビューフィーチャー
 *
 * Redux連携：シフト案の配置データを読み書きする。
 * - シフトパレットからのD&Dで ShiftAssignment を生成
 * - 既存配置のドラッグ移動（行内・行間）
 * - リサイズハンドルによる開始/終了時刻変更
 * - 制約違反（overlap/unavailable/excess）の視覚的フィードバック
 * - ドラッグ中の行可否表示（available/warning/unavailable）
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
  ShiftPlan,
  ShiftAssignment,
  type DayType,
} from '../domain/index.js';
import { createSampleMemberList } from '../data/sampleMember.js';
import { createDefaultShifts, DAY_TYPE_ORDER } from '../data/sampleData.js';
import {
  MemberGanttView,
  type GanttConfig,
  type DragState,
  type RowAvailability,
  type ViolationLevel,
} from '../ui/MemberGanttView.js';
import { draggingTaskId } from '../ui/TaskListView.js';
import { draggingAssignmentId } from '../ui/MemberGanttView.js';
import { UrledPlace } from '@bublys-org/bubbles-ui';
import WarningIcon from '@mui/icons-material/Warning';
import TableChartIcon from '@mui/icons-material/TableChart';
import { Button, ToggleButton, ToggleButtonGroup } from '@mui/material';

// ========== 型定義 ==========

type MemberGanttEditorProps = {
  shiftPlanId: string;
  initialDayType?: DayType;
  onAssignmentClick?: (assignmentId: string) => void;
  onOpenTaskListClick?: () => void;
  onTableViewClick?: () => void;
};

// ========== コンポーネント ==========

export const MemberGanttEditor: FC<MemberGanttEditorProps> = ({
  shiftPlanId,
  initialDayType,
  onAssignmentClick,
  onOpenTaskListClick,
  onTableViewClick,
}) => {
  const dispatch = useAppDispatch();
  const memberList = useAppSelector(selectShiftPuzzleMemberList);
  const shiftPlan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));

  const [selectedDayType, setSelectedDayType] = useState<DayType | undefined>(initialDayType);
  const [minuteGranularity, setMinuteGranularity] = useState<GanttConfig['minuteGranularity']>(60);

  /** window dragstart/dragend を監視してドラッグ状態を React state に同期 */
  const [dragState, setDragState] = useState<DragState>(null);

  // マスターデータ
  const shifts = useMemo(() => createDefaultShifts(), []);

  // 初期データのロード
  useEffect(() => {
    if (memberList.length === 0) {
      const sampleData = createSampleMemberList();
      dispatch(setMemberList(sampleData.map((m) => m.state)));
    }
  }, [dispatch, memberList.length]);

  // シフト案がなければ作成
  useEffect(() => {
    if (!shiftPlan) {
      const newPlan = ShiftPlan.create('シフト案1', '晴れ');
      dispatch(addShiftPlan({ ...newPlan.state, id: shiftPlanId }));
    }
  }, [dispatch, shiftPlan, shiftPlanId]);

  // ドラッグ状態の window 監視
  useEffect(() => {
    const handleWindowDragStart = () => {
      // モジュール変数を参照（HTML5 DnD制約でdragover中にgetData不可なため）
      const taskId = draggingTaskId;
      const assignmentId = draggingAssignmentId;

      // Q3: DayType未選択時はtask dragを受け付けない
      if (taskId && selectedDayType) {
        setDragState({ type: 'task', taskId });
      } else if (assignmentId && shiftPlan) {
        const assignment = shiftPlan.assignments.find((a) => a.id === assignmentId);
        if (assignment) {
          const shift = shifts.find((s) => s.id === assignment.shiftId);
          if (shift) {
            setDragState({
              type: 'assignment',
              assignmentId,
              shiftId: shift.id,
              durationMinutes: assignment.assignedEndMinute - assignment.assignedStartMinute,
              taskId: shift.taskId,
            });
          }
        }
      }
    };

    const handleWindowDragEnd = () => {
      setDragState(null);
    };

    window.addEventListener('dragstart', handleWindowDragStart);
    window.addEventListener('dragend', handleWindowDragEnd);
    return () => {
      window.removeEventListener('dragstart', handleWindowDragStart);
      window.removeEventListener('dragend', handleWindowDragEnd);
    };
  }, [shifts, shiftPlan, selectedDayType]);

  // ---------------------------------------------------------------
  // 制約違反マップの計算
  // ---------------------------------------------------------------

  const violationMap = useMemo((): Map<string, ViolationLevel> => {
    if (!shiftPlan) return new Map();
    const map = new Map<string, ViolationLevel>();

    // 1. overlap: ドメインが検出した時間重複（最優先）
    for (const violation of shiftPlan.constraintViolations) {
      for (const id of violation.assignmentIds) {
        map.set(id, 'overlap');
      }
    }

    // 2. excess: シフトごとの配置数が maxCount 超え
    const shiftCountMap = new Map<string, string[]>(); // shiftId → assignmentIds
    for (const a of shiftPlan.assignments) {
      const list = shiftCountMap.get(a.shiftId) ?? [];
      list.push(a.id);
      shiftCountMap.set(a.shiftId, list);
    }
    for (const shift of shifts) {
      const assignmentIds = shiftCountMap.get(shift.id) ?? [];
      if (assignmentIds.length > shift.maxCount) {
        for (const id of assignmentIds) {
          if (!map.has(id)) map.set(id, 'excess');
        }
      }
    }

    // 3. unavailable: member.isAvailableFor(shiftId) === false
    const memberMap = new Map(memberList.map((m) => [m.id, m]));
    for (const a of shiftPlan.assignments) {
      if (map.has(a.id)) continue; // 上位違反がある場合はスキップ
      const member = memberMap.get(a.staffId);
      if (member && !member.isAvailableFor(a.shiftId)) {
        map.set(a.id, 'unavailable');
      }
    }

    // 4. outOfRange: 配置時間がShiftの[startMinute, endMinute]からはみ出している
    const shiftMap = new Map(shifts.map((s) => [s.id, s]));
    for (const a of shiftPlan.assignments) {
      if (map.has(a.id)) continue;
      const shift = shiftMap.get(a.shiftId);
      if (shift && (a.assignedStartMinute < shift.startMinute || a.assignedEndMinute > shift.endMinute)) {
        map.set(a.id, 'outOfRange');
      }
    }

    return map;
  }, [shiftPlan, shifts, memberList]);

  // ---------------------------------------------------------------
  // 行の受け入れ可否マップの計算（タスク→ガント D&D 中のみ）
  //
  // taskは選択dayType内に複数Shiftを持ちうる：
  // - 参加可否：いずれかのshiftに参加可なら available 候補
  // - 担当局：いずれかのshiftが member.department と一致すれば一致扱い
  // - 重複：いずれかのshift時間帯と既存配置が重複する場合は unavailable
  // ---------------------------------------------------------------

  const rowAvailabilityMap = useMemo((): Map<string, RowAvailability> => {
    if (!dragState || dragState.type !== 'task') return new Map();
    if (!selectedDayType) return new Map();

    const taskShifts = shifts.filter(
      (s) => s.taskId === dragState.taskId && s.dayType === selectedDayType,
    );
    if (taskShifts.length === 0) return new Map();

    const map = new Map<string, RowAvailability>();

    for (const member of memberList) {
      // 1. 参加可否：いずれかのshiftに参加可ならOK
      const anyAvailable = taskShifts.some((s) => member.isAvailableFor(s.id));
      if (!anyAvailable) {
        map.set(member.id, 'unavailable');
        continue;
      }

      // 2. 既存配置との時間重複チェック（いずれかのshift時間帯と被ったらNG）
      if (shiftPlan) {
        const memberAssignments = shiftPlan.getAssignmentsByMember(member.id);
        const wouldOverlap = taskShifts.some((s) =>
          memberAssignments.some(
            (a) => s.startMinute < a.assignedEndMinute && a.assignedStartMinute < s.endMinute,
          ),
        );
        if (wouldOverlap) {
          map.set(member.id, 'unavailable');
          continue;
        }
      }

      // 3. 担当局：いずれかのshiftが一致すればOK、全部不一致なら警告
      const departmentMatches = taskShifts.some(
        (s) => !s.responsibleDepartment || member.department === s.responsibleDepartment,
      );
      if (!departmentMatches) {
        map.set(member.id, 'warning');
        continue;
      }

      map.set(member.id, 'available');
    }

    return map;
  }, [dragState, shifts, memberList, shiftPlan, selectedDayType]);

  // ---------------------------------------------------------------
  // ハンドラ
  // ---------------------------------------------------------------

  const handleDropShift = (
    memberId: string,
    shiftId: string,
    assignedStartMinute: number,
    assignedEndMinute: number,
  ) => {
    if (!shiftPlan) return;

    // 重複チェック（同じ局員×シフト×開始時刻の配置を排除）
    const exists = shiftPlan.assignments.some(
      (a) => a.staffId === memberId && a.shiftId === shiftId && a.assignedStartMinute === assignedStartMinute,
    );
    if (exists) return;

    const assignment = ShiftAssignment.create(shiftId, memberId, assignedStartMinute, assignedEndMinute, false);
    const updated = shiftPlan.addAssignment(assignment);
    dispatch(updateShiftPlan(updated.state));
  };

  const handleMoveAssignment = (
    assignmentId: string,
    newStaffId: string,
    newStart: number,
    newEnd: number,
  ) => {
    if (!shiftPlan) return;
    const updated = shiftPlan.moveAssignment(assignmentId, newStaffId, newStart, newEnd);
    dispatch(updateShiftPlan(updated.state));
  };

  const handleResizeAssignment = (
    assignmentId: string,
    newStart: number,
    newEnd: number,
  ) => {
    if (!shiftPlan) return;
    const assignment = shiftPlan.assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;
    const updated = shiftPlan.moveAssignment(assignmentId, assignment.staffId, newStart, newEnd);
    dispatch(updateShiftPlan(updated.state));
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    if (!shiftPlan) return;
    const updated = shiftPlan.removeAssignment(assignmentId);
    dispatch(updateShiftPlan(updated.state));
  };

  const ganttConfig: GanttConfig = useMemo(
    () => ({ hourPx: 80, minuteGranularity }),
    [minuteGranularity],
  );

  const violations = shiftPlan?.constraintViolations ?? [];

  if (!shiftPlan) {
    return <div style={{ padding: 16 }}>読み込み中...</div>;
  }

  return (
    <StyledContainer>
      {/* ヘッダー */}
      <div className="e-header">
        <div className="e-header-left">
          <h3>{shiftPlan.name} — ガント配置</h3>
        </div>
        <div className="e-header-right">
          {/* dayType セレクター */}
          <ToggleButtonGroup
            size="small"
            exclusive
            value={selectedDayType ?? null}
            onChange={(_, v) => setSelectedDayType(v ?? undefined)}
          >
            {DAY_TYPE_ORDER.map((dt) => (
              <ToggleButton key={dt} value={dt} sx={{ fontSize: '0.72em', py: 0.3, px: 0.8 }}>
                {dt}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {/* タスク一覧を開く（dayType未選択時はクエリ無し） */}
          <UrledPlace url={`shift-puzzle/tasks${selectedDayType ? `?dayType=${encodeURIComponent(selectedDayType)}` : ''}`}>
            <Button
              variant="outlined"
              size="small"
              onClick={onOpenTaskListClick}
              sx={{ ml: 1 }}
            >
              タスク一覧
            </Button>
          </UrledPlace>

          {/* 既存の表形式ビューへ */}
          <UrledPlace url={`shift-puzzle/shift-plans/${shiftPlanId}`}>
            <Button
              variant="text"
              size="small"
              startIcon={<TableChartIcon />}
              onClick={onTableViewClick}
              sx={{ ml: 1 }}
            >
              表形式
            </Button>
          </UrledPlace>

          {violations.length > 0 && (
            <span className="e-violation-warning">
              <WarningIcon fontSize="small" />
              制約違反: {violations.length}件
            </span>
          )}
          <span className="e-stats">配置: {shiftPlan.assignments.length}件</span>
        </div>
      </div>

      {/* ガント設定バー */}
      <div className="e-config-bar">
        <div className="e-config-item">
          <span className="e-config-label">グリッド粒度</span>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={minuteGranularity}
            onChange={(_, v) => { if (v) setMinuteGranularity(v); }}
          >
            <ToggleButton value={60} sx={{ fontSize: '0.72em', py: 0.2, px: 0.8 }}>1h</ToggleButton>
            <ToggleButton value={30} sx={{ fontSize: '0.72em', py: 0.2, px: 0.8 }}>30m</ToggleButton>
            <ToggleButton value={15} sx={{ fontSize: '0.72em', py: 0.2, px: 0.8 }}>15m</ToggleButton>
          </ToggleButtonGroup>
        </div>
      </div>

      {/* ガント本体 */}
      <div className="e-gantt-area">
        <MemberGanttView
          shifts={shifts}
          members={memberList}
          assignments={shiftPlan.assignments}
          selectedDayType={selectedDayType}
          ganttConfig={ganttConfig}
          buildAssignmentUrl={(id) =>
            `shift-puzzle/shift-plans/${shiftPlanId}/assignments/${id}/evaluation`
          }
          onDropShift={handleDropShift}
          onMoveAssignment={handleMoveAssignment}
          onResizeAssignment={handleResizeAssignment}
          onRemoveAssignment={handleRemoveAssignment}
          onAssignmentClick={onAssignmentClick}
          rowAvailabilityMap={rowAvailabilityMap}
          violationMap={violationMap}
          dragState={dragState}
        />
      </div>
    </StyledContainer>
  );
};

// ========== スタイル ==========

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .e-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
    gap: 8px;
    flex-wrap: wrap;

    h3 {
      margin: 0;
      font-size: 1em;
    }
  }

  .e-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .e-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .e-stats {
    font-size: 0.85em;
    color: #666;
  }

  .e-violation-warning {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #f44336;
    font-weight: bold;
    font-size: 0.85em;
    background: #ffebee;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid #f44336;
  }

  .e-config-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 4px 12px;
    background: #fafafa;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .e-config-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.82em;
    color: #555;
  }

  .e-config-label {
    white-space: nowrap;
  }

  .e-config-value {
    white-space: nowrap;
    color: #888;
    min-width: 48px;
  }

  .e-gantt-area {
    flex: 1;
    overflow: auto;
  }
`;
