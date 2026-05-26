'use client';

/**
 * TaskGanttEditor — タスク軸×時間軸ガントエディター
 *
 * PrimitiveGanttEditor の逆転版:
 *   Y軸=シフト(タスク)行、X軸=時間
 *   MemberCollection からメンバーカードをドラッグしてシフト行に配置
 *   ブラシ: ドラッグ中メンバーの参加可能時間とシフト時間のマッチを緑色で表示
 */

import { FC, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector, useAppStore } from '@bublys-org/state-management';
import {
  selectShiftPuzzleMemberList,
  selectShiftPuzzlePlanById,
  setMemberList,
} from '../slice/index.js';
import {
  addUserToBlockRange,
  removeUserFromBlockRange,
  moveUserBlocks,
  ensureBlockListSizes,
} from '../slice/shift-plan-slice.js';
import { createSampleMemberList } from '../data/sampleMember.js';
import { TaskGanttView, type RowAvailability } from '../ui/TaskGanttView.js';
import { UrledPlace } from '@bublys-org/bubbles-ui';
import { type GanttConfig } from '../ui/MemberGanttView.js';
import { draggingMemberId, DRAG_TYPE_MEMBER_INDIVIDUAL } from '../ui/MemberListView.js';
import { draggingTaskGroups } from './TaskCollection.js';
import { DRAG_TYPE_TASK_LIST } from '../ui/TaskListView.js';
import { moveBackInPlan, moveForwardInPlan } from '../world-line/index.js';

// ========== 型定義 ==========

type TaskGanttEditorProps = {
  shiftPlanId: string;
  onAssignedRunOpen?: (shiftId: string, memberId: string) => void;
  buildRunUrl?: (shiftId: string, memberId: string) => string;
  onTaskClick?: (taskId: string) => void;
  buildTaskUrl?: (taskId: string) => string;
  onHistoryOpen?: () => void;
  buildHistoryUrl?: () => string;
  onMemberClick?: (memberId: string) => void;
  buildMemberUrl?: (memberId: string) => string;
};

// ========== コンポーネント ==========

export const TaskGanttEditor: FC<TaskGanttEditorProps> = ({
  shiftPlanId,
  onAssignedRunOpen,
  buildRunUrl,
  onTaskClick,
  buildTaskUrl,
  onHistoryOpen,
  buildHistoryUrl,
  onMemberClick,
  buildMemberUrl,
}) => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const members = useAppSelector(selectShiftPuzzleMemberList);
  const shiftPlan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));

  /** MemberCollection の個別カードドラッグ中のmemberId */
  const [dragBrushMemberId, setDragBrushMemberId] = useState<string | null>(null);
  /** task-list からドロップされたフィルター済みタスクID */
  const [filteredTaskIds, setFilteredTaskIds] = useState<Set<string> | null>(null);

  /** TaskCollection まとめドラッグ中かどうか（フィルタードロップゾーン表示用） */
  const [isTaskListDragging, setIsTaskListDragging] = useState(false);
  const brushMemberId = dragBrushMemberId;

  // 初期データロード
  useEffect(() => {
    if (members.length === 0) {
      dispatch(setMemberList(createSampleMemberList().map((m) => m.state)));
    }
  }, [dispatch, members.length]);

  // window の dragstart/dragend を監視してブラシを同期
  useEffect(() => {
    const handleDragStart = () => {
      if (draggingMemberId) setDragBrushMemberId(draggingMemberId);
    };
    const handleDragEnd = () => {
      setDragBrushMemberId(null);
      setIsTaskListDragging(false);
    };
    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('dragend', handleDragEnd);
    return () => {
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  // Ctrl+Z / Ctrl+Shift+Z で世界線を undo/redo
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

  const planShifts = useMemo(() => shiftPlan?.shifts ?? [], [shiftPlan]);
  const planTimeSchedules = useMemo(() => shiftPlan?.timeSchedules ?? [], [shiftPlan]);

  const visibleShifts = useMemo(() => {
    if (!filteredTaskIds) return planShifts;
    return planShifts.filter((s) => filteredTaskIds.has(s.taskId));
  }, [planShifts, filteredTaskIds]);

  // BlockList サイズを TimeSchedule の totalBlocks に揃える
  const activeScheduleTotalBlocks = planTimeSchedules[0]?.totalBlocks;
  useEffect(() => {
    if (!activeScheduleTotalBlocks) return;
    dispatch(ensureBlockListSizes({ planId: shiftPlanId, totalBlocks: activeScheduleTotalBlocks }));
  }, [dispatch, shiftPlanId, activeScheduleTotalBlocks]);

  const ganttConfig: GanttConfig = { hourPx: 60 };

  /**
   * 行の受け入れ可否マップ（ブラシ中のみ意味がある）。
   * key = shiftId
   */
  const rowAvailabilityMap = useMemo((): Map<string, RowAvailability> => {
    if (!brushMemberId) return new Map();
    const member = members.find((m) => m.id === brushMemberId);
    if (!member) return new Map();
    const map = new Map<string, RowAvailability>();
    for (const shift of planShifts) {
      const anyAvailable = member.isAvailableForShift(shift);
      if (!anyAvailable) {
        map.set(shift.id, 'unavailable');
        continue;
      }
      const deptOk = !shift.responsibleDepartment || member.department === shift.responsibleDepartment;
      map.set(shift.id, deptOk ? 'available' : 'warning');
    }
    return map;
  }, [brushMemberId, planShifts, members]);

  const handlePaintRange = (shiftId: string, memberId: string, startBlock: number, endBlock: number) => {
    dispatch(addUserToBlockRange({ planId: shiftPlanId, shiftId, startBlock, endBlock, userId: memberId }));
  };

  const handleRemoveRange = (shiftId: string, memberId: string, startBlock: number, endBlock: number) => {
    dispatch(removeUserFromBlockRange({ planId: shiftPlanId, shiftId, startBlock, endBlock, userId: memberId }));
  };

  const handleMoveRun = (
    oldShiftId: string,
    oldMemberId: string,
    oldStart: number,
    oldEnd: number,
    newShiftId: string,
    newMemberId: string,
    newStart: number,
    newEnd: number,
  ) => {
    dispatch(moveUserBlocks({
      planId: shiftPlanId,
      shiftId: oldShiftId,
      newShiftId: newShiftId !== oldShiftId ? newShiftId : undefined,
      oldUserId: oldMemberId,
      oldStart,
      oldEnd,
      newUserId: newMemberId,
      newStart,
      newEnd,
    }));
  };

  const handleAssignedRunClick = (shiftId: string, memberId: string) => {
    if (onAssignedRunOpen) onAssignedRunOpen(shiftId, memberId);
  };

  const brushMemberName = useMemo(() => {
    if (!brushMemberId) return null;
    return members.find((m) => m.id === brushMemberId)?.name ?? null;
  }, [brushMemberId, members]);

  if (!shiftPlan) {
    return (
      <StyledEditor>
        <div className="e-not-found">シフト表が見つかりません</div>
      </StyledEditor>
    );
  }

  return (
    <StyledEditor>
      {/* ツールバー */}
      <div className="e-toolbar">
        <span className="e-plan-name">{shiftPlan.name}</span>

        {filteredTaskIds && (
          <div className="e-filter-badge">
            <span>{filteredTaskIds.size}件フィルター中</span>
            <button type="button" className="e-filter-clear" onClick={() => setFilteredTaskIds(null)}>✕</button>
          </div>
        )}

        {brushMemberName && (
          <div className="e-active-brush">
            <span className="e-brush-label">ブラシ: {brushMemberName}</span>
          </div>
        )}

        {/* 履歴ボタン */}
        {buildHistoryUrl ? (
          <UrledPlace url={buildHistoryUrl()}>
            <button type="button" className="e-history-btn" onClick={onHistoryOpen} title="世界線の履歴を表示">
              履歴
            </button>
          </UrledPlace>
        ) : (
          <button type="button" className="e-history-btn" onClick={onHistoryOpen} title="世界線の履歴を表示">
            履歴
          </button>
        )}
      </div>

      {/* ガントビュー */}
      <div
        className="e-gantt-container"
        onDragOver={(e) => {
          const types = e.dataTransfer.types;
          if (types.includes(DRAG_TYPE_TASK_LIST)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (!isTaskListDragging) setIsTaskListDragging(true);
            return;
          }
          if (types.includes(DRAG_TYPE_MEMBER_INDIVIDUAL)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={(e) => {
          if (e.dataTransfer.types.includes(DRAG_TYPE_TASK_LIST)) {
            e.preventDefault();
            if (draggingTaskGroups && draggingTaskGroups.length > 0) {
              setFilteredTaskIds(new Set(draggingTaskGroups.map((g) => g.taskId)));
            }
            setIsTaskListDragging(false);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setIsTaskListDragging(false);
          }
        }}
      >
        {isTaskListDragging && (
          <div className="e-task-list-drop-overlay">
            ここにドロップしてタスク行をフィルタリング
          </div>
        )}
        <TaskGanttView
          shifts={visibleShifts}
          timeSchedules={planTimeSchedules}
          members={members}
          ganttConfig={ganttConfig}
          brushMemberId={brushMemberId}
          rowAvailabilityMap={rowAvailabilityMap}
          onPaintRange={handlePaintRange}
          onRemoveRange={handleRemoveRange}
          onMoveRun={handleMoveRun}
          onAssignedRunClick={handleAssignedRunClick}
          buildRunUrl={buildRunUrl}
          onTaskClick={onTaskClick}
          buildTaskUrl={buildTaskUrl}
          onMemberClick={onMemberClick}
          buildMemberUrl={buildMemberUrl}
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

  .e-not-found {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #aaa;
    font-size: 1.1em;
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

  .e-plan-name {
    font-size: 0.9em;
    font-weight: 600;
    color: #333;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .e-filter-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px 2px 8px;
    background: #fff3e0;
    border: 1px solid #ffa000;
    border-radius: 12px;
    font-size: 0.82em;
    color: #e65100;
    font-weight: 600;

    .e-filter-clear {
      background: none;
      border: none;
      cursor: pointer;
      color: #e65100;
      font-size: 0.85em;
      padding: 0 2px;
      line-height: 1;
      &:hover { color: #bf360c; }
    }
  }

  .e-active-brush {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    background: #e8f5e9;
    border: 1px solid #a5d6a7;
    border-radius: 12px;
  }

  .e-brush-label {
    font-size: 0.82em;
    color: #1b5e20;
    font-weight: 600;
  }

  .e-history-btn {
    padding: 2px 10px;
    border: 1px solid #b0bec5;
    border-radius: 12px;
    background: #fff;
    color: #455a64;
    font-size: 0.82em;
    cursor: pointer;
    white-space: nowrap;
    &:hover {
      background: #eceff1;
      border-color: #607d8b;
    }
  }

  .e-gantt-container {
    flex: 1;
    overflow: auto;
    position: relative;
  }

  .e-task-list-drop-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    background: rgba(230, 81, 0, 0.12);
    border: 2px dashed #e65100;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1em;
    font-weight: 600;
    color: #e65100;
    pointer-events: none;
  }
`;
