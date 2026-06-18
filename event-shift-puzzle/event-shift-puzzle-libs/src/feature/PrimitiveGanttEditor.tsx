'use client';

/**
 * PrimitiveGanttEditor — プリミティブUIガントエディター
 *
 * Redux連携：BlockList ベースのシフト配置データを読み書きする。
 * - ブラシソース：別バブル（shift-puzzle/tasks の TaskList）からタスクをドラッグ
 * - PrimitiveGanttView でセルにホバー連続ペイントして局員を配置
 * - シフト表はシフト表リストから作成し、このエディターは表示のみ担当
 */

import { FC, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector, useAppStore } from '@bublys-org/state-management';
import {
  selectShiftPuzzleMemberList,
  selectShiftPuzzlePlanById,
  selectSelectedTaskId,
  setSelectedTaskId,
  setMemberList,
} from '../slice/index.js';
import {
  addUserToBlockRange,
  removeUserFromBlockRange,
  moveUserBlocks,
  ensureBlockListSizes,
} from '../slice/shift-plan-slice.js';
import { createSampleMemberList } from '../data/sampleMember.js';
import { PrimitiveGanttView, type RowAvailability } from '../ui/PrimitiveGanttView.js';
import { UrledPlace } from '@bublys-org/bubbles-ui';
import { type GanttConfig } from '../ui/ganttTypes.js';
import { draggingTaskId, DRAG_TYPE_TASK_LIST } from '../ui/TaskListView.js';
import { draggingMemberIds, DRAG_TYPE_MEMBER_LIST } from './MemberCollection.js';
import { draggingTaskGroups } from './TaskCollection.js';
import { computeAiPlacements } from './aiShiftPlacement.js';
import { moveBackInPlan, moveForwardInPlan } from '../world-line/index.js';

// ========== 型定義 ==========

type PrimitiveGanttEditorProps = {
  shiftPlanId: string;
  /** 既配置run（バー）クリックで配置状況バブル等へ遷移する callback */
  onAssignedRunOpen?: (shiftId: string, taskId: string) => void;
  /** 既配置run を展開元としてマークするための URL ビルダ。LinkBubbleの曲線描画に利用 */
  buildRunUrl?: (shiftId: string) => string;
  /** 履歴ボタン押下時に呼ばれる callback（世界線バブルを開くなど、親が処理する） */
  onHistoryOpen?: () => void;
  /** 履歴バブルの URL ビルダー（UrledPlace の curve 起点に使用） */
  buildHistoryUrl?: () => string;
  /** タスクガントボタン押下時に呼ばれる callback */
  onTaskGanttOpen?: () => void;
  /** タスクガントバブルの URL ビルダー（UrledPlace の curve 起点に使用） */
  buildTaskGanttUrl?: () => string;
  /** 局員ラベルクリック時のコールバック（親バブルが bubble.id を使って openBubble する） */
  onMemberClick?: (memberId: string) => void;
  /** 局員ラベルの URL ビルダー（UrledPlace の curve 起点に使用） */
  buildMemberUrl?: (memberId: string) => string;
};

// ========== コンポーネント ==========

export const PrimitiveGanttEditor: FC<PrimitiveGanttEditorProps> = ({
  shiftPlanId,
  onAssignedRunOpen,
  buildRunUrl,
  onHistoryOpen,
  buildHistoryUrl,
  onTaskGanttOpen,
  buildTaskGanttUrl,
  onMemberClick,
  buildMemberUrl,
}) => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const members = useAppSelector(selectShiftPuzzleMemberList);
  const shiftPlan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));
  const selectedTaskId = useAppSelector(selectSelectedTaskId);

  /** TaskList ドラッグ中の taskId（ブラシ優先度：ドラッグ > クリック選択） */
  const [dragBrushTaskId, setDragBrushTaskId] = useState<string | null>(null);

  /** MemberList ドラッグ中かどうか（ドロップゾーンオーバーレイ表示用） */
  const [isMemberListDragging, setIsMemberListDragging] = useState(false);

  /** TaskCollection まとめドラッグ中かどうか（AI配置ドロップゾーン表示用） */
  const [isTaskListDragging, setIsTaskListDragging] = useState(false);


  /** ガントに表示する局員IDのフィルター（null = 全局員） */
  const [filteredMemberIds, setFilteredMemberIds] = useState<string[] | null>(null);

  /**
   * 実効ブラシ ID：ドラッグ中はドラッグ対象を、そうでなければ TaskList のクリック選択を使う。
   */
  const brushTaskId = dragBrushTaskId ?? selectedTaskId;

  // 初期データロード
  useEffect(() => {
    if (members.length === 0) {
      dispatch(setMemberList(createSampleMemberList().map((m) => m.state)));
    }
  }, [dispatch, members.length]);

  // window の dragstart/dragend を監視してドラッグ中ブラシ・局員ドラッグを同期
  useEffect(() => {
    const handleDragStart = () => {
      if (draggingTaskId) setDragBrushTaskId(draggingTaskId);
      if (draggingMemberIds) setIsMemberListDragging(true);
    };
    const handleDragEnd = () => {
      setDragBrushTaskId(null);
      setIsMemberListDragging(false);
      setIsTaskListDragging(false);
    };
    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('dragend', handleDragEnd);
    return () => {
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  // Ctrl+Z / Ctrl+Shift+Z（Mac は Cmd）で世界線を undo/redo。
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

  // BlockList サイズを TimeSchedule の totalBlocks に揃える（フォールバックの修正）
  const activeScheduleTotalBlocks = planTimeSchedules[0]?.totalBlocks;
  useEffect(() => {
    if (!activeScheduleTotalBlocks) return;
    dispatch(ensureBlockListSizes({ planId: shiftPlanId, totalBlocks: activeScheduleTotalBlocks }));
  }, [dispatch, shiftPlanId, activeScheduleTotalBlocks]);

  const ganttConfig: GanttConfig = { hourPx: 60 };

  /** 表示する局員（フィルター適用済み） */
  const displayMembers = useMemo(() => {
    if (!filteredMemberIds) return members;
    return filteredMemberIds.flatMap(id => {
      const m = members.find(m => m.id === id);
      return m ? [m] : [];
    });
  }, [members, filteredMemberIds]);

  /**
   * 行の受け入れ可否マップ（ブラシ中のみ意味がある）。
   */
  const rowAvailabilityMap = useMemo((): Map<string, RowAvailability> => {
    if (!brushTaskId) return new Map();
    const taskShifts = planShifts.filter((s) => s.taskId === brushTaskId);
    if (taskShifts.length === 0) return new Map();

    const map = new Map<string, RowAvailability>();
    for (const member of displayMembers) {
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

  const handlePaintRange = (shiftId: string, memberId: string, startBlock: number, endBlock: number) => {
    dispatch(addUserToBlockRange({ planId: shiftPlanId, shiftId, startBlock, endBlock, userId: memberId }));
  };

  const handleRemoveRange = (shiftId: string, memberId: string, startBlock: number, endBlock: number) => {
    dispatch(removeUserFromBlockRange({ planId: shiftPlanId, shiftId, startBlock, endBlock, userId: memberId }));
  };

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

  const handleTaskListDrop = () => {
    if (!draggingTaskGroups || !planTimeSchedules[0]) return;
    const actions = computeAiPlacements(
      draggingTaskGroups,
      planShifts,
      displayMembers,
      planTimeSchedules[0],
    );
    for (const action of actions) {
      dispatch(addUserToBlockRange({
        planId: shiftPlanId,
        shiftId: action.shiftId,
        startBlock: action.startBlock,
        endBlock: action.endBlock,
        userId: action.memberId,
      }));
    }
  };

  const handleAssignedRunClick = (shiftId: string) => {
    const shift = planShifts.find((s) => s.id === shiftId);
    if (shift && onAssignedRunOpen) onAssignedRunOpen(shift.id, shift.taskId);
  };

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
        {/* タイトル */}
        <span className="e-plan-name">{shiftPlan.name}</span>

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

        {/* 局員フィルターリセットボタン */}
        {filteredMemberIds && (
          <button
            type="button"
            className="e-member-filter-reset"
            onClick={() => setFilteredMemberIds(null)}
            title="全局員表示に戻す"
          >
            👥 {filteredMemberIds.length}名 → 全員表示に戻す
          </button>
        )}

        {/* タスクガントボタン */}
        {buildTaskGanttUrl ? (
          <UrledPlace url={buildTaskGanttUrl()}>
            <button
              type="button"
              className="e-task-gantt-btn"
              onClick={onTaskGanttOpen}
              title="タスク軸ガントを開く"
            >
              タスク軸
            </button>
          </UrledPlace>
        ) : onTaskGanttOpen ? (
          <button
            type="button"
            className="e-task-gantt-btn"
            onClick={onTaskGanttOpen}
            title="タスク軸ガントを開く"
          >
            タスク軸
          </button>
        ) : null}

        {/* 履歴ボタン */}
        {buildHistoryUrl ? (
          <UrledPlace url={buildHistoryUrl()}>
            <button
              type="button"
              className="e-history-btn"
              onClick={onHistoryOpen}
              title="世界線の履歴を表示"
            >
              履歴
            </button>
          </UrledPlace>
        ) : (
          <button
            type="button"
            className="e-history-btn"
            onClick={onHistoryOpen}
            title="世界線の履歴を表示"
          >
            履歴
          </button>
        )}
      </div>

      {/* ガントビュー */}
      <div
        className="e-gantt-container"
        onDragOver={(e) => {
          const types = e.dataTransfer.types;
          if (types.includes(DRAG_TYPE_MEMBER_LIST)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (!isMemberListDragging) setIsMemberListDragging(true);
            return;
          }
          if (types.includes(DRAG_TYPE_TASK_LIST)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (!isTaskListDragging) setIsTaskListDragging(true);
          }
        }}
        onDrop={(e) => {
          if (e.dataTransfer.types.includes(DRAG_TYPE_MEMBER_LIST)) {
            e.preventDefault();
            if (draggingMemberIds) setFilteredMemberIds([...draggingMemberIds]);
            setIsMemberListDragging(false);
            return;
          }
          if (e.dataTransfer.types.includes(DRAG_TYPE_TASK_LIST)) {
            e.preventDefault();
            handleTaskListDrop();
            setIsTaskListDragging(false);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setIsMemberListDragging(false);
            setIsTaskListDragging(false);
          }
        }}
      >
        {isMemberListDragging && (
          <div className="e-member-drop-overlay">
            ここにドロップして局員を絞り込む
          </div>
        )}
        {isTaskListDragging && (
          <div className="e-task-list-drop-overlay">
            ここにドロップしてAI配置
          </div>
        )}
        <PrimitiveGanttView
          shifts={planShifts}
          timeSchedules={planTimeSchedules}
          members={displayMembers}
          ganttConfig={ganttConfig}
          brushTaskId={brushTaskId}
          onPaintRange={handlePaintRange}
          onRemoveRange={handleRemoveRange}
          onMoveRun={handleMoveRun}
          onAssignedRunClick={handleAssignedRunClick}
          buildRunUrl={buildRunUrl}
          onMemberClick={onMemberClick}
          buildMemberUrl={buildMemberUrl}
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

  .e-task-gantt-btn {
    padding: 2px 10px;
    border: 1px solid #a5d6a7;
    border-radius: 12px;
    background: #f1f8e9;
    color: #33691e;
    font-size: 0.82em;
    cursor: pointer;
    white-space: nowrap;
    &:hover {
      background: #dcedc8;
      border-color: #558b2f;
    }
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

  .e-member-filter-reset {
    padding: 2px 10px;
    border: 1px solid #7986cb;
    border-radius: 12px;
    background: #e8eaf6;
    color: #3949ab;
    font-size: 0.82em;
    cursor: pointer;
    white-space: nowrap;
    &:hover {
      background: #c5cae9;
      border-color: #3949ab;
    }
  }

  .e-gantt-container {
    flex: 1;
    overflow: auto;
    position: relative;
  }

  .e-member-drop-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    background: rgba(57, 73, 171, 0.15);
    border: 2px dashed #3949ab;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1em;
    font-weight: 600;
    color: #3949ab;
    pointer-events: none;
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
