'use client';

/**
 * TaskGanttView — タスク軸×時間軸ガント（PrimitiveGanttView の逆転版）
 *
 * レイアウト:
 *   Y軸 = シフト(タスク)行
 *   X軸 = 時間（TimeSchedule の startMinute から endMinute まで、15分刻み）
 *
 * 配置表示:
 *   同一メンバーの連続セルは1本のバーにマージして表示（名前は中央1つ）
 *   run カラー = メンバーIDハッシュから生成
 *
 * ブラシ機能:
 *   MemberCollection からメンバーカードをドラッグ中 (brushMemberId が設定) に
 *   各シフト行の「メンバー参加可能 × タスク有効範囲」セルを緑、不可を赤で表示
 *
 * 操作:
 *   メンバーカードドラッグ → シフト行ホバー中プレビュー → ドロップで onPaintRange
 *   既配置バーホバーで削除、ドラッグ移動・リサイズ
 */

import React, { FC, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Shift, TimeSchedule, Member } from '../domain/index.js';
import { type GanttConfig } from './MemberGanttView.js';
import { DRAG_TYPE_MEMBER_INDIVIDUAL, draggingMemberId } from './MemberListView.js';
import CloseIcon from '@mui/icons-material/Close';
import { createPortal } from 'react-dom';
import { UrledPlace } from '@bublys-org/bubbles-ui';

export type { RowAvailability } from './MemberGanttView.js';
import type { RowAvailability } from './MemberGanttView.js';

// ========== 公開型 ==========

export type TaskGanttViewProps = {
  shifts: readonly Shift[];
  timeSchedules: readonly TimeSchedule[];
  members: readonly Member[];
  ganttConfig?: GanttConfig;
  /** ドラッグ中メンバーID（ブラシ用） */
  brushMemberId?: string | null;
  /** シフト行の受け入れ可否マップ（key = shiftId） */
  rowAvailabilityMap?: Map<string, RowAvailability>;
  onPaintRange?: (shiftId: string, memberId: string, startBlock: number, endBlock: number) => void;
  onRemoveRange?: (shiftId: string, memberId: string, startBlock: number, endBlock: number) => void;
  onMoveRun?: (
    oldShiftId: string,
    oldMemberId: string,
    oldStart: number,
    oldEnd: number,
    newShiftId: string,
    newMemberId: string,
    newStart: number,
    newEnd: number,
  ) => void;
  onAssignedRunClick?: (shiftId: string, memberId: string, startBlock: number) => void;
  buildRunUrl?: (shiftId: string, memberId: string) => string;
  onTaskClick?: (taskId: string) => void;
  buildTaskUrl?: (taskId: string) => string;
  onMemberClick?: (memberId: string) => void;
  buildMemberUrl?: (memberId: string) => string;
};

// ========== 定数 ==========

const SHIFT_LABEL_WIDTH = 180;
const ROW_HEIGHT = 32;

// ========== ユーティリティ ==========

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getMemberColor(memberId: string): { bg: string; border: string; text: string } {
  let hash = 5381;
  for (let i = 0; i < memberId.length; i++) {
    hash = ((hash << 5) + hash) ^ memberId.charCodeAt(i);
  }
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 55%, 88%)`,
    border: `hsl(${hue}, 65%, 55%)`,
    text: `hsl(${hue}, 65%, 28%)`,
  };
}

// ========== run バー計算 ==========

type ShiftRunBar = {
  memberId: string;
  startBlock: number;
  endBlock: number; // 半開区間
  isOverlap: boolean;
  outOfRangeBlocks: number[];
  unavailableBlocks: number[];
  crossConflictBlocks: number[]; // 別シフトでも同時刻に配置されているブロック
};

/**
 * 全シフトを横断して「同一メンバーが同一ブロックに複数シフトで配置」されている
 * (memberId, blockIndex) の集合を返す。
 */
function buildCrossShiftConflictSet(
  shifts: readonly Shift[],
  totalBlocks: number,
): Set<string> {
  const seen = new Map<string, number>(); // "${memberId}:${blockIndex}" → 出現シフト数
  for (const shift of shifts) {
    const bl = shift.blockList;
    for (let b = 0; b < totalBlocks; b++) {
      for (const userId of bl.getUsersAt(b)) {
        const key = `${userId}:${b}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
    }
  }
  const conflicts = new Set<string>();
  for (const [key, count] of seen) {
    if (count > 1) conflicts.add(key);
  }
  return conflicts;
}

/** あるシフト行の全メンバー run を計算する */
function buildRunsForShift(
  shift: Shift,
  members: readonly Member[],
  timeSchedule: TimeSchedule,
  totalBlocks: number,
  crossConflictSet: Set<string>,
): ShiftRunBar[] {
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const dayType = timeSchedule.dayType;
  const bl = shift.blockList;

  // userId → blocks[] を収集
  type UserEntry = {
    blocks: number[];
    outOfRangeSet: Set<number>;
    overlapSet: Set<number>;
  };
  const userMap = new Map<string, UserEntry>();

  for (let b = 0; b < totalBlocks; b++) {
    const userIds = bl.getUsersAt(b);
    if (userIds.length === 0) continue;
    const isOutOfRange = !shift.isBlockInRange(b, timeSchedule);
    const hasOverlap = userIds.length > 1;
    for (const userId of userIds) {
      if (!userMap.has(userId)) {
        userMap.set(userId, { blocks: [], outOfRangeSet: new Set(), overlapSet: new Set() });
      }
      const entry = userMap.get(userId)!;
      entry.blocks.push(b);
      if (isOutOfRange) entry.outOfRangeSet.add(b);
      if (hasOverlap) entry.overlapSet.add(b);
    }
  }

  const runs: ShiftRunBar[] = [];

  for (const [userId, { blocks, outOfRangeSet, overlapSet }] of userMap.entries()) {
    if (blocks.length === 0) continue;
    const member = memberMap.get(userId);

    let runStart = blocks[0];
    let runPrev = blocks[0];
    const oorBlocks: number[] = [];
    const unaBlocks: number[] = [];
    const crossBlocks: number[] = [];
    let isOverlap = false;

    const accumulate = (b: number) => {
      if (outOfRangeSet.has(b)) oorBlocks.push(b);
      if (member && !member.isAvailableAt(dayType, timeSchedule.startMinute + b * 15)) unaBlocks.push(b);
      if (overlapSet.has(b)) isOverlap = true;
      if (crossConflictSet.has(`${userId}:${b}`)) crossBlocks.push(b);
    };
    accumulate(blocks[0]);

    for (let i = 1; i <= blocks.length; i++) {
      if (i === blocks.length || blocks[i] !== runPrev + 1) {
        runs.push({
          memberId: userId,
          startBlock: runStart,
          endBlock: runPrev + 1,
          isOverlap,
          outOfRangeBlocks: [...oorBlocks],
          unavailableBlocks: [...unaBlocks],
          crossConflictBlocks: [...crossBlocks],
        });
        if (i < blocks.length) {
          runStart = blocks[i];
          runPrev = blocks[i];
          oorBlocks.length = 0;
          unaBlocks.length = 0;
          crossBlocks.length = 0;
          isOverlap = false;
          accumulate(blocks[i]);
        }
      } else {
        runPrev = blocks[i];
        accumulate(blocks[i]);
      }
    }
  }

  runs.sort((a, b) => a.startBlock - b.startBlock || a.memberId.localeCompare(b.memberId));
  return runs;
}

function computeRunLevels(runs: ShiftRunBar[]): number[] {
  const levels = new Array<number>(runs.length).fill(0);
  const levelEnds: number[] = [];
  for (let i = 0; i < runs.length; i++) {
    const { startBlock, endBlock } = runs[i];
    let assigned = -1;
    for (let lvl = 0; lvl < levelEnds.length; lvl++) {
      if (levelEnds[lvl] <= startBlock) {
        assigned = lvl;
        levelEnds[lvl] = endBlock;
        break;
      }
    }
    if (assigned === -1) {
      assigned = levelEnds.length;
      levelEnds.push(endBlock);
    }
    levels[i] = assigned;
  }
  return levels;
}

// ========== プレビュー状態 ==========

type PreviewState = {
  shiftId: string;
  anchorBlock: number;
  currentBlock: number;
};

// ========== メインコンポーネント ==========

export const TaskGanttView: FC<TaskGanttViewProps> = ({
  shifts,
  timeSchedules,
  members,
  ganttConfig = {},
  brushMemberId,
  rowAvailabilityMap,
  onPaintRange,
  onRemoveRange,
  onMoveRun,
  onAssignedRunClick,
  buildRunUrl,
  onTaskClick,
  buildTaskUrl,
  onMemberClick,
  buildMemberUrl,
}) => {
  const hourPx = ganttConfig.hourPx ?? 60;
  const minutePx = hourPx / 60;
  const blockPx = minutePx * 15;

  const activeTimeSchedule = useMemo(() => timeSchedules[0] ?? null, [timeSchedules]);

  const activeShifts = useMemo(() => {
    if (!activeTimeSchedule) return [] as Shift[];
    return shifts.filter((s) => s.timeScheduleId === activeTimeSchedule.id);
  }, [shifts, activeTimeSchedule]);

  const brushMember = useMemo(() => {
    if (!brushMemberId) return null;
    return members.find((m) => m.id === brushMemberId) ?? null;
  }, [brushMemberId, members]);

  /** クロスシフト競合セット（同一メンバーが同一ブロックに複数シフトで配置） */
  const crossConflictSet = useMemo(
    () => buildCrossShiftConflictSet(activeShifts, activeTimeSchedule?.totalBlocks ?? 0),
    [activeShifts, activeTimeSchedule],
  );

  // ========== 移動・リサイズ EditState ==========

  type EditState = {
    kind: 'move' | 'resize-L' | 'resize-R';
    shiftId: string;
    oldMemberId: string;
    oldStart: number;
    oldEnd: number;
    initialPointerX: number;
    initialPointerY: number;
    previewStart: number;
    previewEnd: number;
    targetShiftId: string;
    moved: boolean;
  };
  const [editState, setEditState] = useState<EditState | null>(null);
  const suppressClickRef = useRef(false);

  /** run移動中のブラシメンバー（kind==='move' かつ実際に動いた場合に有効） */
  const moveBrushMember = useMemo(() => {
    if (!editState || editState.kind !== 'move' || !editState.moved) return null;
    return members.find((m) => m.id === editState.oldMemberId) ?? null;
  }, [editState, members]);

  const activeBrushMember = brushMember ?? moveBrushMember;
  const isPainting = activeBrushMember !== null;

  /** run移動時に内部計算する行受け入れ可否マップ */
  const moveRowAvailabilityMap = useMemo((): Map<string, RowAvailability> => {
    if (!moveBrushMember) return new Map();
    const map = new Map<string, RowAvailability>();
    for (const shift of activeShifts) {
      const anyAvailable = moveBrushMember.isAvailableForShift(shift);
      if (!anyAvailable) {
        map.set(shift.id, 'unavailable');
      } else {
        const deptOk = !shift.responsibleDepartment || moveBrushMember.department === shift.responsibleDepartment;
        map.set(shift.id, deptOk ? 'available' : 'warning');
      }
    }
    return map;
  }, [moveBrushMember, activeShifts]);

  type HoveredRunInfo = {
    key: string;
    run: ShiftRunBar;
    shiftId: string;
    rect: DOMRect;
  };
  const [hoveredRunInfo, setHoveredRunInfo] = useState<HoveredRunInfo | null>(null);
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const findShiftIdAtPoint = useCallback((clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const row = (el as Element).closest('[data-shift-id]');
    return row ? row.getAttribute('data-shift-id') : null;
  }, []);

  // ========== ブラシペイントプレビュー ==========

  const [preview, setPreview] = useState<PreviewState | null>(null);

  useEffect(() => {
    const handleDragEnd = () => {
      setPreview(null);
    };
    window.addEventListener('dragend', handleDragEnd);
    return () => window.removeEventListener('dragend', handleDragEnd);
  }, []);

  useEffect(() => {
    if (!brushMemberId) setPreview(null);
  }, [brushMemberId]);

  const calcBlockIndex = useCallback(
    (clientX: number, rowEl: Element): number => {
      const rect = rowEl.getBoundingClientRect();
      const x = Math.max(0, clientX - rect.left);
      return Math.min(Math.floor(x / blockPx), (activeTimeSchedule?.totalBlocks ?? 1) - 1);
    },
    [blockPx, activeTimeSchedule],
  );

  const handleRowDragOver = useCallback(
    (shiftId: string, e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE_MEMBER_INDIVIDUAL)) return;
      if (!brushMember) return;
      if (editState) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const blockIndex = calcBlockIndex(e.clientX, e.currentTarget);
      setPreview((prev) => {
        if (!prev || prev.shiftId !== shiftId) {
          return { shiftId, anchorBlock: blockIndex, currentBlock: blockIndex };
        }
        if (prev.currentBlock === blockIndex) return prev;
        return { ...prev, currentBlock: blockIndex };
      });
    },
    [brushMember, calcBlockIndex, editState],
  );

  const handleRowDrop = useCallback(
    (shiftId: string, e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_TYPE_MEMBER_INDIVIDUAL)) return;
      const memberId = draggingMemberId;
      if (!memberId || !activeTimeSchedule) {
        setPreview(null);
        return;
      }
      e.preventDefault();
      const blockIndex = calcBlockIndex(e.clientX, e.currentTarget);
      let startBlock = blockIndex;
      let endBlockExclusive = blockIndex + 1;
      if (preview && preview.shiftId === shiftId) {
        startBlock = Math.min(preview.anchorBlock, blockIndex);
        endBlockExclusive = Math.max(preview.anchorBlock, blockIndex) + 1;
      }
      onPaintRange?.(shiftId, memberId, startBlock, endBlockExclusive);
      setPreview(null);
    },
    [preview, activeTimeSchedule, calcBlockIndex, onPaintRange],
  );

  const handleRunDoubleClick = useCallback(
    (run: ShiftRunBar, shiftId: string, e: React.MouseEvent) => {
      if (suppressClickRef.current) return;
      if (e.defaultPrevented) return;
      onAssignedRunClick?.(shiftId, run.memberId, run.startBlock);
    },
    [onAssignedRunClick],
  );

  const handleRunMouseEnter = useCallback(
    (run: ShiftRunBar, shiftId: string, e: React.MouseEvent<HTMLElement>) => {
      if (hoverLeaveTimerRef.current) {
        clearTimeout(hoverLeaveTimerRef.current);
        hoverLeaveTimerRef.current = null;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredRunInfo({ key: `${shiftId}-${run.memberId}-${run.startBlock}`, run, shiftId, rect });
    },
    [],
  );

  const scheduleHoverLeave = useCallback(() => {
    hoverLeaveTimerRef.current = setTimeout(() => {
      setHoveredRunInfo(null);
      hoverLeaveTimerRef.current = null;
    }, 120);
  }, []);

  const cancelHoverLeave = useCallback(() => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
  }, []);

  // ========== 移動・リサイズ pointer handlers ==========

  const startEdit = useCallback(
    (kind: EditState['kind'], run: ShiftRunBar, shiftId: string, e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      if (hoverLeaveTimerRef.current) {
        clearTimeout(hoverLeaveTimerRef.current);
        hoverLeaveTimerRef.current = null;
      }
      setHoveredRunInfo(null);
      setEditState({
        kind,
        shiftId,
        oldMemberId: run.memberId,
        oldStart: run.startBlock,
        oldEnd: run.endBlock,
        initialPointerX: e.clientX,
        initialPointerY: e.clientY,
        previewStart: run.startBlock,
        previewEnd: run.endBlock,
        targetShiftId: shiftId,
        moved: false,
      });
    },
    [],
  );

  const handleEditMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!editState) return;
      e.preventDefault();
      const tb = activeTimeSchedule?.totalBlocks ?? 1;
      const dxBlocks = Math.round((e.clientX - editState.initialPointerX) / blockPx);
      const dxPx = e.clientX - editState.initialPointerX;
      const dyPx = e.clientY - editState.initialPointerY;
      const moved = editState.moved || Math.abs(dxPx) >= 3 || Math.abs(dyPx) >= 3;

      if (editState.kind === 'move') {
        const runLen = editState.oldEnd - editState.oldStart;
        const newStart = Math.max(0, Math.min(tb - runLen, editState.oldStart + dxBlocks));
        const newEnd = newStart + runLen;
        const targetId = findShiftIdAtPoint(e.clientX, e.clientY) ?? editState.targetShiftId;
        setEditState({ ...editState, previewStart: newStart, previewEnd: newEnd, targetShiftId: targetId, moved });
      } else if (editState.kind === 'resize-R') {
        const newEnd = Math.min(tb, Math.max(editState.oldStart + 1, editState.oldEnd + dxBlocks));
        setEditState({ ...editState, previewEnd: newEnd, moved });
      } else {
        const newStart = Math.max(0, Math.min(editState.oldEnd - 1, editState.oldStart + dxBlocks));
        setEditState({ ...editState, previewStart: newStart, moved });
      }
    },
    [editState, blockPx, findShiftIdAtPoint, activeTimeSchedule],
  );

  const handleEditUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!editState) return;
      e.preventDefault();
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (editState.moved) {
        const targetShiftId = editState.kind === 'move' ? editState.targetShiftId : editState.shiftId;
        const noChange =
          targetShiftId === editState.shiftId &&
          editState.previewStart === editState.oldStart &&
          editState.previewEnd === editState.oldEnd;
        if (!noChange) {
          onMoveRun?.(
            editState.shiftId,
            editState.oldMemberId,
            editState.oldStart,
            editState.oldEnd,
            targetShiftId,
            editState.oldMemberId,
            editState.previewStart,
            editState.previewEnd,
          );
          suppressClickRef.current = true;
          setTimeout(() => { suppressClickRef.current = false; }, 400);
        }
      }
      setEditState(null);
    },
    [editState, onMoveRun],
  );

  const handleEditCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!editState) return;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      setEditState(null);
    },
    [editState],
  );

  if (!activeTimeSchedule) {
    return (
      <StyledGantt>
        <div className="e-empty">スケジュールが設定されていません</div>
      </StyledGantt>
    );
  }

  const totalBlocks = activeTimeSchedule.totalBlocks;
  const totalWidth = totalBlocks * blockPx;
  const dayStartMinute = activeTimeSchedule.startMinute;

  return (
    <StyledGantt>
      {/* ヘッダー行（grid row 1） */}
      <div className="e-shift-col-header">タスク</div>
      <div className="e-time-axis" style={{ width: totalWidth }}>
        {Array.from({ length: totalBlocks + 1 }).map((_, i) => {
          const minute = dayStartMinute + i * 15;
          const isHour = minute % 60 === 0;
          return (
            <div key={i} className={`e-tick ${isHour ? 'is-hour' : ''}`} style={{ left: i * blockPx }}>
              {isHour && <span className="e-tick-label">{minutesToTime(minute)}</span>}
            </div>
          );
        })}
      </div>

      {/* ホバー時アクションパネル */}
      {hoveredRunInfo && !editState && createPortal(
        <StyledRunActionPanel
          style={{
            position: 'fixed',
            left: hoveredRunInfo.rect.left + hoveredRunInfo.rect.width / 2,
            top: hoveredRunInfo.rect.top > 40
              ? hoveredRunInfo.rect.top - 32
              : hoveredRunInfo.rect.bottom + 4,
          }}
          onMouseEnter={cancelHoverLeave}
          onMouseLeave={() => setHoveredRunInfo(null)}
        >
          <button
            type="button"
            className="e-action-btn e-action-btn--delete"
            title="削除"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveRange?.(
                hoveredRunInfo.shiftId,
                hoveredRunInfo.run.memberId,
                hoveredRunInfo.run.startBlock,
                hoveredRunInfo.run.endBlock,
              );
              setHoveredRunInfo(null);
            }}
          >
            <CloseIcon style={{ fontSize: 13 }} />
          </button>
        </StyledRunActionPanel>,
        document.body,
      )}

      {/* シフト行（grid row 2 以降） */}
      {activeShifts.map((shift) => {
        const runs = buildRunsForShift(shift, members, activeTimeSchedule, totalBlocks, crossConflictSet);
        const runLevels = computeRunLevels(runs);
        const previewActive = preview && preview.shiftId === shift.id;
        const previewStart = previewActive ? Math.min(preview.anchorBlock, preview.currentBlock) : -1;
        const previewEnd = previewActive ? Math.max(preview.anchorBlock, preview.currentBlock) + 1 : -1;

        // クロス行ムーブの転送先プレビュー
        const editPreviewInThisRow =
          editState && editState.moved && editState.kind === 'move' && editState.targetShiftId === shift.id
            ? { start: editState.previewStart, end: editState.previewEnd, memberId: editState.oldMemberId }
            : null;

        const rowAvailability = rowAvailabilityMap?.get(shift.id) ?? moveRowAvailabilityMap.get(shift.id);

        return (
          <React.Fragment key={shift.id}>
            {/* シフト行ラベル */}
            {buildTaskUrl ? (
              <UrledPlace url={buildTaskUrl(shift.taskId)}>
                <div
                  className={`e-shift-label availability-${rowAvailability ?? 'none'} is-clickable`}
                  data-shift-id={shift.id}
                  onClick={() => onTaskClick?.(shift.taskId)}
                >
                  <span className="e-task-name">
                    {shift.taskName ?? shift.taskId}
                  </span>
                  {shift.responsibleDepartment && (
                    <span className="e-dept-badge">{shift.responsibleDepartment.slice(0, 2)}</span>
                  )}
                  {rowAvailability === 'available' && <span className="e-avail-dot is-available" />}
                  {rowAvailability === 'warning' && <span className="e-avail-dot is-warning" />}
                  {rowAvailability === 'unavailable' && <span className="e-avail-dot is-unavailable" />}
                </div>
              </UrledPlace>
            ) : (
              <div
                className={`e-shift-label availability-${rowAvailability ?? 'none'}`}
                data-shift-id={shift.id}
              >
                <span className="e-task-name">{shift.taskName ?? shift.taskId}</span>
                {shift.responsibleDepartment && (
                  <span className="e-dept-badge">{shift.responsibleDepartment.slice(0, 2)}</span>
                )}
                {rowAvailability === 'available' && <span className="e-avail-dot is-available" />}
                {rowAvailability === 'warning' && <span className="e-avail-dot is-warning" />}
                {rowAvailability === 'unavailable' && <span className="e-avail-dot is-unavailable" />}
              </div>
            )}

            {/* セル描画エリア */}
            <div
              className="e-cell-strip"
              style={{ width: totalWidth }}
              data-shift-id={shift.id}
              onDragOver={(e) => handleRowDragOver(shift.id, e)}
              onDrop={(e) => handleRowDrop(shift.id, e)}
            >
              {/* グリッド背景線 */}
              {Array.from({ length: totalBlocks }).map((_, b) => {
                const isHour = ((dayStartMinute + b * 15) % 60) === 0;
                let brushState: 'available' | 'unavailable' | null = null;
                if (isPainting && activeBrushMember && shift.isBlockInRange(b, activeTimeSchedule)) {
                  const minute = activeTimeSchedule.startMinute + b * 15;
                  brushState = activeBrushMember.isAvailableAt(activeTimeSchedule.dayType, minute)
                    ? 'available'
                    : 'unavailable';
                }
                return (
                  <StyledGridCell
                    key={b}
                    $left={b * blockPx}
                    $width={blockPx}
                    $isHour={isHour}
                    $brushState={brushState}
                  />
                );
              })}

              {/* 既配置バー */}
              {runs.map((run, runIdx) => {
                const stackLevel = runLevels[runIdx] ?? 0;
                const color = getMemberColor(run.memberId);
                const memberName = members.find((m) => m.id === run.memberId)?.name ?? run.memberId;

                const isBeingEdited =
                  stackLevel === 0 &&
                  editState &&
                  editState.shiftId === shift.id &&
                  editState.oldMemberId === run.memberId &&
                  editState.oldStart === run.startBlock &&
                  editState.oldEnd === run.endBlock;
                const isMovingToOtherRow =
                  isBeingEdited && editState.kind === 'move' && editState.targetShiftId !== shift.id;
                const start = isBeingEdited && !isMovingToOtherRow ? editState.previewStart : run.startBlock;
                const end = isBeingEdited && !isMovingToOtherRow ? editState.previewEnd : run.endBlock;
                const left = start * blockPx;
                const width = (end - start) * blockPx;
                const runUrl = stackLevel === 0 ? buildRunUrl?.(shift.id, run.memberId) : undefined;
                const hasUnavailable = run.unavailableBlocks.length > 0;
                const hasOutOfRange = run.outOfRangeBlocks.length > 0;
                const hasCrossConflict = run.crossConflictBlocks.length > 0;

                const runBar = (
                  <StyledRunBar
                    key={`${run.memberId}-${run.startBlock}-${stackLevel}`}
                    $left={left}
                    $width={width}
                    $bg={color.bg}
                    $border={color.border}
                    $text={color.text}
                    $isOutOfRange={hasOutOfRange}
                    $isOverlap={run.isOverlap}
                    $isGhost={!!isMovingToOtherRow}
                    $isUnavailable={hasUnavailable}
                    $isCrossConflict={hasCrossConflict}
                    $stackLevel={stackLevel}
                    title={`${memberName}${hasOutOfRange ? '（タスク時間外）' : ''}${run.isOverlap ? '（同行重複）' : ''}${hasCrossConflict ? '（時間帯競合：他タスクと重複）' : ''}`}
                    {...(stackLevel === 0 ? {
                      onDoubleClick: (e: React.MouseEvent) => handleRunDoubleClick(run, shift.id, e as React.MouseEvent<HTMLElement>),
                      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => handleRunMouseEnter(run, shift.id, e),
                      onMouseLeave: scheduleHoverLeave,
                      onPointerDown: (e: React.PointerEvent<HTMLElement>) => startEdit('move', run, shift.id, e),
                      onPointerMove: handleEditMove,
                      onPointerUp: handleEditUp,
                      onPointerCancel: handleEditCancel,
                    } : {})}
                  >
                    {stackLevel === 0 && (
                      <StyledResizeHandle
                        $side="left"
                        onPointerDown={(e) => startEdit('resize-L', run, shift.id, e)}
                        onPointerMove={handleEditMove}
                        onPointerUp={handleEditUp}
                        onPointerCancel={handleEditCancel}
                        onDoubleClick={(e) => e.stopPropagation()}
                      />
                    )}
                    {stackLevel === 0 && run.unavailableBlocks.map((b) => (
                      <StyledUnavailableBlock
                        key={`ua-${b}`}
                        style={{ left: (b - run.startBlock) * blockPx, width: blockPx }}
                      />
                    ))}
                    {stackLevel === 0 && run.outOfRangeBlocks.map((b) => (
                      <StyledOutOfRangeBlock
                        key={`oor-${b}`}
                        style={{ left: (b - run.startBlock) * blockPx, width: blockPx }}
                      />
                    ))}
                    {stackLevel === 0 && run.crossConflictBlocks.map((b) => (
                      <StyledCrossConflictBlock
                        key={`cc-${b}`}
                        style={{ left: (b - run.startBlock) * blockPx, width: blockPx }}
                      />
                    ))}
                    <span className="e-run-label">{memberName}</span>
                    {run.isOverlap && <span className="e-overlap-badge">!</span>}
                    {stackLevel === 0 && hasCrossConflict && (
                      <span className="e-cross-conflict-badge" title="他タスクと時間帯が競合">⚡</span>
                    )}
                    {stackLevel === 0 && (
                      <StyledResizeHandle
                        $side="right"
                        onPointerDown={(e) => startEdit('resize-R', run, shift.id, e)}
                        onPointerMove={handleEditMove}
                        onPointerUp={handleEditUp}
                        onPointerCancel={handleEditCancel}
                        onDoubleClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </StyledRunBar>
                );

                return runUrl ? (
                  <UrledPlace key={`${run.memberId}-${run.startBlock}`} url={runUrl}>
                    {runBar}
                  </UrledPlace>
                ) : runBar;
              })}

              {/* クロス行ムーブ転送先プレビュー */}
              {editPreviewInThisRow && (() => {
                const color = getMemberColor(editPreviewInThisRow.memberId);
                return (
                  <StyledRunBar
                    $left={editPreviewInThisRow.start * blockPx}
                    $width={(editPreviewInThisRow.end - editPreviewInThisRow.start) * blockPx}
                    $bg={color.bg}
                    $border={color.border}
                    $text={color.text}
                    $isOutOfRange={false}
                    $isOverlap={false}
                    $isGhost={false}
                    $isUnavailable={false}
                    $isCrossConflict={false}
                    $stackLevel={0}
                    style={{ opacity: 0.65, pointerEvents: 'none' }}
                  >
                    <span className="e-run-label">
                      {members.find((m) => m.id === editPreviewInThisRow.memberId)?.name ?? editPreviewInThisRow.memberId}
                    </span>
                  </StyledRunBar>
                );
              })()}

              {/* ドラッグ中プレビュー */}
              {previewActive && previewStart >= 0 && (
                <StyledPreviewBar
                  style={{ left: previewStart * blockPx, width: (previewEnd - previewStart) * blockPx }}
                />
              )}
            </div>
          </React.Fragment>
        );
      })}
    </StyledGantt>
  );
};

// ========== スタイル ==========

const StyledGantt = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  display: grid;
  grid-template-columns: ${SHIFT_LABEL_WIDTH}px auto;
  grid-template-rows: 24px;
  grid-auto-rows: ${ROW_HEIGHT}px;
  height: 100%;
  overflow: auto;
  font-size: 0.82em;
  user-select: none;

  .e-empty {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #aaa;
    font-size: 1.1em;
  }

  .e-shift-col-header {
    position: sticky;
    top: 0;
    left: 0;
    z-index: 25;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    border-right: 2px solid #ddd;
    border-bottom: 2px solid #ddd;
    padding: 4px;
    color: #555;
    font-size: 0.85em;
    background: #f8f8f8;
  }

  .e-time-axis {
    position: sticky;
    top: 0;
    z-index: 20;
    background: #f8f8f8;
    border-bottom: 2px solid #ddd;
    position: relative;
  }

  .e-tick {
    position: absolute;
    top: 0;
    height: 100%;
    border-left: 1px solid #e0e0e0;

    &.is-hour {
      border-left: 1px solid #bbb;
    }
  }

  .e-tick-label {
    position: absolute;
    left: 3px;
    top: 4px;
    font-size: 0.78em;
    color: #666;
    white-space: nowrap;
  }

  .e-shift-label {
    position: sticky;
    left: 0;
    z-index: 10;
    background: #fff;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 3px;
    padding: 3px 6px;
    border-right: 2px solid #ddd;
    border-bottom: 1px solid #eee;
    overflow: hidden;

    .e-task-name {
      font-weight: 600;
      font-size: 0.88em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    .e-dept-badge {
      background: #f5f5f5;
      color: #757575;
      border: 1px solid #e0e0e0;
      border-radius: 3px;
      padding: 0 3px;
      font-size: 0.72em;
      flex-shrink: 0;
    }

    .e-avail-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;

      &.is-available {
        background: #4caf50;
      }
      &.is-warning {
        background: #ff9800;
      }
      &.is-unavailable {
        background: #f44336;
      }
    }

    &.availability-available {
      background: rgba(76, 175, 80, 0.07);
    }
    &.availability-unavailable {
      background: rgba(244, 67, 54, 0.06);
    }
    &.availability-warning {
      background: rgba(255, 152, 0, 0.07);
    }
    &.is-clickable {
      cursor: pointer;
      &:hover { background: #f0f4ff; }
    }
  }

  .e-cell-strip {
    position: relative;
    border-bottom: 1px solid #eee;

    &:hover {
      background-color: #fafafa;
    }
  }
`;

type StyledGridCellProps = React.HTMLAttributes<HTMLDivElement> & {
  $left: number;
  $width: number;
  $isHour: boolean;
  $brushState: 'available' | 'unavailable' | null;
};

const StyledGridCell = styled.div<StyledGridCellProps>`
  position: absolute;
  top: 0;
  left: ${(p) => p.$left}px;
  width: ${(p) => p.$width}px;
  height: 100%;
  border-left: 1px solid ${(p) => p.$isHour ? '#d0d0d0' : '#f0f0f0'};
  pointer-events: none;
  ${(p) => p.$brushState === 'available' && `background: rgba(76, 175, 80, 0.22);`}
  ${(p) => p.$brushState === 'unavailable' && `background: rgba(244, 67, 54, 0.10);`}
`;

type StyledRunBarProps = React.HTMLAttributes<HTMLDivElement> & {
  $left: number;
  $width: number;
  $bg: string;
  $border: string;
  $text: string;
  $isOutOfRange: boolean;
  $isOverlap: boolean;
  $isGhost: boolean;
  $isUnavailable: boolean;
  $isCrossConflict: boolean;
  $stackLevel: number;
};

const StyledRunBar = styled.div<StyledRunBarProps>`
  position: absolute;
  left: ${(p) => p.$left}px;
  width: ${(p) => p.$width}px;
  background: ${(p) => p.$bg};
  border: 1px solid ${(p) => p.$border};
  border-radius: 3px;
  color: ${(p) => p.$text};
  display: flex;
  align-items: center;
  padding: 0 6px;
  font-size: 0.78em;
  font-weight: 600;
  overflow: hidden;
  box-sizing: border-box;
  user-select: none;
  touch-action: none;

  ${(p) => p.$stackLevel === 0 ? `
    top: 2px;
    height: ${ROW_HEIGHT - 4}px;
    cursor: grab;
    z-index: 2;
  ` : `
    top: ${ROW_HEIGHT - 12}px;
    height: 10px;
    cursor: default;
    z-index: 3;
    pointer-events: none;
    opacity: 0.85;
    font-size: 0.72em;
    padding: 0 4px;
    border-radius: 2px;
  `}

  ${(p) => p.$isGhost && `opacity: 0.35; border-style: dashed;`}

  &:active { cursor: grabbing; }

  ${(p) => p.$isOutOfRange && `border-color: #f44336; border-style: dashed;`}
  ${(p) => p.$isOverlap && !p.$isCrossConflict && `box-shadow: inset 0 0 0 1px rgba(244, 67, 54, 0.45);`}
  ${(p) => p.$isUnavailable && !p.$isOutOfRange && `border-color: #ff8f00; border-style: dashed;`}
  ${(p) => p.$isCrossConflict && `border: 2px solid #9c27b0 !important; box-shadow: 0 0 4px rgba(156, 39, 176, 0.5);`}

  &:hover { filter: brightness(0.96); }

  .e-run-label {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    position: relative;
    z-index: 3;
  }

  .e-overlap-badge {
    color: #d32f2f;
    font-weight: 800;
    margin-right: 4px;
    position: relative;
    z-index: 3;
  }

  .e-cross-conflict-badge {
    font-size: 0.9em;
    margin-right: 2px;
    position: relative;
    z-index: 3;
    color: #9c27b0;
    font-weight: 800;
  }
`;

type StyledResizeHandleProps = React.HTMLAttributes<HTMLDivElement> & { $side: 'left' | 'right' };
const StyledResizeHandle = styled.div<StyledResizeHandleProps>`
  position: absolute;
  top: 0;
  ${(p) => p.$side === 'left' ? 'left: 0;' : 'right: 0;'}
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  z-index: 3;
  background: transparent;
  border-radius: ${(p) => p.$side === 'left' ? '3px 0 0 3px' : '0 3px 3px 0'};
  transition: background 0.1s;

  &:hover { background: rgba(0, 0, 0, 0.2); }
`;

const StyledOutOfRangeBlock = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  position: absolute;
  top: 0;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  background-image: repeating-linear-gradient(
    45deg,
    rgba(244, 67, 54, 0.55), rgba(244, 67, 54, 0.55) 3px,
    rgba(255, 205, 210, 0.55) 3px, rgba(255, 205, 210, 0.55) 6px
  );
`;

const StyledUnavailableBlock = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  position: absolute;
  top: 0;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(255, 143, 0, 0.55), rgba(255, 143, 0, 0.55) 3px,
    rgba(255, 224, 130, 0.55) 3px, rgba(255, 224, 130, 0.55) 6px
  );
`;

/** 他タスクと時間帯が競合するブロックのオーバーレイ（紫系の縦縞） */
const StyledCrossConflictBlock = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  position: absolute;
  top: 0;
  height: 100%;
  pointer-events: none;
  z-index: 2;
  background-image: repeating-linear-gradient(
    90deg,
    rgba(156, 39, 176, 0.65), rgba(156, 39, 176, 0.65) 3px,
    transparent 3px, transparent 6px
  );
`;

const StyledRunActionPanel = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  transform: translateX(-50%);
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.16);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 5px;
  animation: tgFadeIn 0.13s ease;
  pointer-events: all;
  z-index: 9999;

  @keyframes tgFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .e-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 5px;
    background: transparent;
    cursor: pointer;
    color: #555;
    padding: 0;

    &:hover { background: #f0f0f0; color: #333; }

    &.e-action-btn--delete {
      color: #c62828;
      &:hover { background: #ffebee; }
    }
  }
`;

const StyledPreviewBar = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  position: absolute;
  top: 2px;
  height: ${ROW_HEIGHT - 4}px;
  background: rgba(25, 118, 210, 0.20);
  border: 2px dashed #1976d2;
  border-radius: 3px;
  pointer-events: none;
  z-index: 3;
`;
