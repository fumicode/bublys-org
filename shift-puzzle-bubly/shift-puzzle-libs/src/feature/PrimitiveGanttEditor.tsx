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
} from '../slice/shift-plan-slice.js';
import { createSampleMemberList } from '../data/sampleMember.js';
import { PrimitiveGanttView, type RowAvailability } from '../ui/PrimitiveGanttView.js';
import { type GanttConfig } from '../ui/MemberGanttView.js';
import { draggingTaskId } from '../ui/TaskListView.js';
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
};

// ========== コンポーネント ==========

export const PrimitiveGanttEditor: FC<PrimitiveGanttEditorProps> = ({
  shiftPlanId,
  onAssignedRunOpen,
  buildRunUrl,
  onHistoryOpen,
}) => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const members = useAppSelector(selectShiftPuzzleMemberList);
  const shiftPlan = useAppSelector(selectShiftPuzzlePlanById(shiftPlanId));
  const selectedTaskId = useAppSelector(selectSelectedTaskId);

  /** TaskList ドラッグ中の taskId（ブラシ優先度：ドラッグ > クリック選択） */
  const [dragBrushTaskId, setDragBrushTaskId] = useState<string | null>(null);

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

  const ganttConfig: GanttConfig = { hourPx: 60 };

  /**
   * 行の受け入れ可否マップ（ブラシ中のみ意味がある）。
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

        {/* 履歴ボタン */}
        <button
          type="button"
          className="e-history-btn"
          onClick={onHistoryOpen}
          title="世界線の履歴を表示"
        >
          履歴
        </button>
      </div>

      {/* ガントビュー */}
      <div className="e-gantt-container">
        <PrimitiveGanttView
          shifts={planShifts}
          timeSchedules={planTimeSchedules}
          members={members}
          ganttConfig={ganttConfig}
          brushTaskId={brushTaskId}
          onPaintRange={handlePaintRange}
          onRemoveRange={handleRemoveRange}
          onMoveRun={handleMoveRun}
          onAssignedRunClick={handleAssignedRunClick}
          buildRunUrl={buildRunUrl}
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
  }
`;
