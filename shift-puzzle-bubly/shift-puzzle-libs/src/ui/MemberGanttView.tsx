'use client';

/**
 * MemberGanttView — 局員×時間のガントチャートビュー（ピクセルベース）
 *
 * 仕様:
 * - hourPx: 1時間当たりのピクセル幅 (デフォルト: 60)
 * - minuteGranularity: 15 | 30 | 60 グリッド粒度（ユーザー設定でオプション）
 * - タスクブロック幅: durationMinutes * minutePx
 * - タスクブロック左位置: (startMinute - dayStartMinute) * minutePx
 * - 15分グリッド: CSS repeating-linear-gradient
 *
 * インタラクション:
 * - パレット→ガント D&D: シフト配置
 * - ブロックドラッグ: 行内/行間移動
 * - リサイズハンドル: Pointer Events で開始/終了時刻を変更（15分スナップ）
 * - 制約違反: overlap/unavailable/excess の3段階表示
 */

import React, { FC, useRef, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Shift } from '../domain/index.js';
import {
  Member,
  ShiftAssignment,
  type DayType,
} from '../domain/index.js';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { IconButton, Tooltip } from '@mui/material';
import { DRAG_TYPE_TASK } from './TaskListView.js';

// ========== 公開定数・型定義 ==========

export const DRAG_TYPE_ASSIGNMENT = 'type/assignment';

/** モジュール変数: 配置ブロックのDnD状態共有（dragover中にgetData不可のため） */
export let draggingAssignmentId: string | null = null;

/** 行の受け入れ可否 */
export type RowAvailability = 'available' | 'warning' | 'unavailable';

/** 制約違反レベル */
export type ViolationLevel = 'overlap' | 'unavailable' | 'excess' | 'outOfRange';

/** ドラッグ中の状態（task / assignment のどちらから来たかを区別） */
export type DragState =
  | { type: 'task'; taskId: string }
  | { type: 'assignment'; assignmentId: string; shiftId: string; durationMinutes: number; taskId: string }
  | null;

/** ガント表示設定 */
export interface GanttConfig {
  /** 1時間あたりピクセル幅 (デフォルト: 60) */
  hourPx?: number;
  /**
   * グリッド粒度（分）
   * - 60: 1時間ごとのグリッド（デフォルト）
   * - 30: 30分ごとのグリッド
   * - 15: 15分ごとのグリッド（15分単位オプション）
   */
  minuteGranularity?: 60 | 30 | 15;
}

export type MemberGanttViewProps = {
  shifts: readonly Shift[];
  members: readonly Member[];
  assignments: readonly ShiftAssignment[];
  selectedDayType?: DayType;
  ganttConfig?: GanttConfig;
  buildAssignmentUrl?: (assignmentId: string) => string;
  /** タスク→ガント D&D でのドロップ（taskId と dropX由来の開始時刻、ガント側でshift解決） */
  onDropShift?: (memberId: string, shiftId: string, assignedStartMinute: number, assignedEndMinute: number) => void;
  /** 既存配置の移動（行内/行間） */
  onMoveAssignment?: (assignmentId: string, newStaffId: string, newStart: number, newEnd: number) => void;
  /** 既存配置のリサイズ */
  onResizeAssignment?: (assignmentId: string, newStart: number, newEnd: number) => void;
  onRemoveAssignment?: (assignmentId: string) => void;
  onAssignmentClick?: (assignmentId: string) => void;
  /** 行の受け入れ可否マップ（ドラッグ中に背景色表示用） */
  rowAvailabilityMap?: Map<string, RowAvailability>;
  /** 配置IDごとの違反レベルマップ */
  violationMap?: Map<string, ViolationLevel>;
  /** 現在のドラッグ状態（ゴーストブロック・行色表示用） */
  dragState?: DragState;
};

// ========== 定数 ==========

const MEMBER_COLUMN_WIDTH = 130;

// タスクカテゴリー別カラー
const TASK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'task-reception': { bg: '#e3f2fd', border: '#1976d2', text: '#0d47a1' },
  'task-setup':     { bg: '#e8f5e9', border: '#388e3c', text: '#1b5e20' },
  'task-teardown':  { bg: '#fce4ec', border: '#c62828', text: '#b71c1c' },
  'task-mc':        { bg: '#f3e5f5', border: '#7b1fa2', text: '#4a148c' },
  'task-record':    { bg: '#fff8e1', border: '#f57f17', text: '#e65100' },
  'task-general':   { bg: '#f5f5f5', border: '#757575', text: '#212121' },
  'task-break':     { bg: '#e0f7fa', border: '#0097a7', text: '#006064' },
};

const DEFAULT_TASK_COLOR = { bg: '#f0f4ff', border: '#5c6bc0', text: '#283593' };

function getTaskColor(taskId: string) {
  return TASK_COLORS[taskId] ?? DEFAULT_TASK_COLOR;
}

// ========== ヘルパー ==========

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function snapTo15(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

// ========== GanttShiftBlock ==========

type GanttShiftBlockProps = {
  assignment: ShiftAssignment;
  shift: Shift;
  member: Member | undefined;
  minutePx: number;
  dayStartMinute: number;
  violationLevel: ViolationLevel | null;
  isDragging: boolean;
  url: string;
  onRemove: (assignmentId: string) => void;
  onClick: (assignmentId: string) => void;
  onResize: (assignmentId: string, newStart: number, newEnd: number) => void;
};

type ResizeState = {
  handle: 'left' | 'right';
  initialPointerX: number;
  previewStart: number;
  previewEnd: number;
};

const GanttShiftBlock: FC<GanttShiftBlockProps> = ({
  assignment,
  shift,
  member,
  minutePx,
  dayStartMinute,
  violationLevel,
  isDragging,
  onRemove,
  onClick,
  onResize,
}) => {
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);

  const color = getTaskColor(shift.taskId);
  const isNewMember = member?.isNewMember ?? false;
  const isBreak = shift.taskId === 'task-break';

  // リサイズ中はプレビュー値を使用
  const displayStart = resizeState?.previewStart ?? assignment.assignedStartMinute;
  const displayEnd = resizeState?.previewEnd ?? assignment.assignedEndMinute;
  const displayTimeLabel = `${minutesToTime(displayStart)}–${minutesToTime(displayEnd)}`;

  const left = (displayStart - dayStartMinute) * minutePx;
  const width = Math.max((displayEnd - displayStart) * minutePx - 2, 20);

  // ========== ドラッグ（配置移動） ==========

  const handleDragStart = (e: React.DragEvent) => {
    if (resizeState) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(DRAG_TYPE_ASSIGNMENT, assignment.id);
    draggingAssignmentId = assignment.id;
  };

  const handleDragEnd = () => {
    draggingAssignmentId = null;
  };

  // ========== リサイズ（Pointer Events + setPointerCapture） ==========
  // ハンドル要素でキャプチャを確保し、pointermove/pointerup もハンドル上で処理

  const startResize = (e: React.PointerEvent, handle: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setResizeState({
      handle,
      initialPointerX: e.clientX,
      previewStart: assignment.assignedStartMinute,
      previewEnd: assignment.assignedEndMinute,
    });
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizeState) return;
    const deltaX = e.clientX - resizeState.initialPointerX;
    const deltaMinutes = deltaX / minutePx;

    if (resizeState.handle === 'right') {
      const raw = assignment.assignedEndMinute + deltaMinutes;
      const snapped = Math.max(assignment.assignedStartMinute + 15, snapTo15(raw));
      setResizeState((s) => s ? { ...s, previewEnd: snapped } : null);
    } else {
      const raw = assignment.assignedStartMinute + deltaMinutes;
      const snapped = Math.min(assignment.assignedEndMinute - 15, snapTo15(raw));
      setResizeState((s) => s ? { ...s, previewStart: snapped } : null);
    }
  };

  const handleResizeUp = (e: React.PointerEvent) => {
    if (!resizeState) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    onResize(assignment.id, resizeState.previewStart, resizeState.previewEnd);
    setResizeState(null);
  };

  return (
    <StyledShiftBlock
      draggable={!resizeState}
      style={{ left, width }}
      $bg={color.bg}
      $border={color.border}
      $text={color.text}
      $violationLevel={violationLevel}
      $isDragging={isDragging}
      $isResizing={!!resizeState}
      title={`${shift.taskName} (${displayTimeLabel})`}
      onClick={() => !resizeState && onClick(assignment.id)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* 左リサイズハンドル */}
      <StyledResizeHandle
        side="left"
        onPointerDown={(e) => startResize(e, 'left')}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeUp}
        onDragStart={(e) => e.preventDefault()}
      />

      <span className="e-block-name">
        {isBreak ? '休憩' : shift.taskName}
      </span>
      {!isBreak && (
        <span className={`e-badge ${isNewMember ? 'is-new' : 'is-senior'}`}>
          {isNewMember ? '新' : '経'}
        </span>
      )}
      {violationLevel && (
        <Tooltip title={
          violationLevel === 'overlap' ? '時間重複' :
          violationLevel === 'unavailable' ? '参加不可' :
          violationLevel === 'outOfRange' ? 'タスク時間外' :
          '定員超過'
        }>
          <WarningAmberIcon className="e-warning" fontSize="inherit" />
        </Tooltip>
      )}
      <IconButton
        className="e-remove-btn"
        size="small"
        onClick={(e) => { e.stopPropagation(); onRemove(assignment.id); }}
      >
        <CloseIcon fontSize="inherit" />
      </IconButton>

      {/* 右リサイズハンドル */}
      <StyledResizeHandle
        side="right"
        onPointerDown={(e) => startResize(e, 'right')}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeUp}
        onDragStart={(e) => e.preventDefault()}
      />
    </StyledShiftBlock>
  );
};

// ========== GanttMemberRow ==========

type GanttMemberRowProps = {
  member: Member;
  rowAssignments: ShiftAssignment[];
  shifts: readonly Shift[];
  dayStartMinute: number;
  minutePx: number;
  minuteGranularity: 60 | 30 | 15;
  totalWidthPx: number;
  rowAvailability?: RowAvailability;
  dragState?: DragState;
  violationMap?: Map<string, ViolationLevel>;
  draggingAssignmentIdProp?: string | null;
  buildAssignmentUrl: (assignmentId: string) => string;
  onDropShift: (memberId: string, shiftId: string, assignedStartMinute: number, assignedEndMinute: number) => void;
  onDropAssignment: (assignmentId: string, newStaffId: string, newStart: number, newEnd: number) => void;
  onRemove: (assignmentId: string) => void;
  onClick: (assignmentId: string) => void;
  onResize: (assignmentId: string, newStart: number, newEnd: number) => void;
};

const GanttMemberRow: FC<GanttMemberRowProps> = ({
  member,
  rowAssignments,
  shifts,
  dayStartMinute,
  minutePx,
  minuteGranularity,
  totalWidthPx,
  rowAvailability,
  dragState,
  violationMap,
  draggingAssignmentIdProp,
  buildAssignmentUrl,
  onDropShift,
  onDropAssignment,
  onRemove,
  onClick,
  onResize,
}) => {
  const [ghostMinute, setGhostMinute] = useState<number | null>(null);

  const calcSnappedStartFromX = (clientX: number, rowElement: Element): number => {
    const rect = rowElement.getBoundingClientRect();
    const dropX = Math.max(0, clientX - rect.left);
    return snapTo15(dayStartMinute + dropX / minutePx);
  };

  /**
   * タスクIDに対応するshiftをsnappedStart位置で1つ選ぶ。
   * - 同一dayType内に複数のshiftがある場合：snappedStart を含むshift優先、なければ中点距離が最小のものを採用
   * - shiftsは selectedDayType で絞り込み済みの前提
   */
  const resolveShiftForTask = (taskId: string, snappedStart: number): Shift | null => {
    const candidates = shifts.filter((s) => s.taskId === taskId);
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    const containing = candidates.find((s) => snappedStart >= s.startMinute && snappedStart < s.endMinute);
    if (containing) return containing;
    return candidates.reduce((best, s) => {
      const mid = (s.startMinute + s.endMinute) / 2;
      const bestMid = (best.startMinute + best.endMinute) / 2;
      return Math.abs(mid - snappedStart) < Math.abs(bestMid - snappedStart) ? s : best;
    });
  };

  // ghost用のシフト解決（task drag時はsnappedStart位置で動的に決まる、assignment drag時は固定）
  const ghostShift: Shift | null = (() => {
    if (!dragState || ghostMinute === null) return null;
    if (dragState.type === 'assignment') {
      return shifts.find((s) => s.id === dragState.shiftId) ?? null;
    }
    return resolveShiftForTask(dragState.taskId, ghostMinute);
  })();

  const ghostDuration: number = (() => {
    if (!dragState) return 0;
    if (dragState.type === 'assignment') return dragState.durationMinutes;
    return ghostShift?.durationMinutes ?? 60;
  })();

  const handleDragOver = (e: React.DragEvent) => {
    const isTask = e.dataTransfer.types.includes(DRAG_TYPE_TASK);
    const isAssignment = e.dataTransfer.types.includes(DRAG_TYPE_ASSIGNMENT);
    if (!isTask && !isAssignment) return;
    // task drag時、selectedDayType未選択（=対応shift解決不可）の場合はドロップ不可
    if (isTask && dragState?.type === 'task' && shifts.filter((s) => s.taskId === dragState.taskId).length === 0) {
      return;
    }
    e.preventDefault();
    e.currentTarget.classList.add('is-drag-over');

    if (dragState) {
      const snapped = calcSnappedStartFromX(e.clientX, e.currentTarget);
      setGhostMinute(snapped);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('is-drag-over');
    setGhostMinute(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('is-drag-over');
    setGhostMinute(null);

    const assignmentId = e.dataTransfer.getData(DRAG_TYPE_ASSIGNMENT);
    if (assignmentId) {
      // 既存配置の移動
      const snappedStart = calcSnappedStartFromX(e.clientX, e.currentTarget);
      const srcAssignment = rowAssignments.find((a) => a.id === assignmentId)
        ?? (() => {
          // 別の行から来た場合は dragState から duration を取得
          if (dragState?.type === 'assignment') {
            return { id: assignmentId, assignedStartMinute: 0, assignedEndMinute: dragState.durationMinutes } as unknown as ShiftAssignment;
          }
          return null;
        })();
      if (!srcAssignment) return;
      const duration = dragState?.type === 'assignment'
        ? dragState.durationMinutes
        : srcAssignment.assignedEndMinute - srcAssignment.assignedStartMinute;
      onDropAssignment(assignmentId, member.id, snappedStart, snappedStart + duration);
      return;
    }

    if (!dragState || dragState.type !== 'task') return;
    const snappedStart = calcSnappedStartFromX(e.clientX, e.currentTarget);
    const shift = resolveShiftForTask(dragState.taskId, snappedStart);
    if (!shift) return;
    onDropShift(member.id, shift.id, snappedStart, snappedStart + shift.durationMinutes);
  };

  // ゴーストブロックのレンダリング
  const renderGhost = () => {
    if (ghostMinute === null || !dragState || !ghostShift) return null;
    const color = getTaskColor(ghostShift.taskId);
    const ghostLeft = (ghostMinute - dayStartMinute) * minutePx;
    const ghostWidth = Math.max(ghostDuration * minutePx - 2, 20);
    return (
      <StyledGhostBlock
        style={{ left: ghostLeft, width: ghostWidth }}
        $bg={color.bg}
        $border={color.border}
      >
        {ghostShift.taskName}
      </StyledGhostBlock>
    );
  };

  return (
    <StyledMemberRow
      $width={totalWidthPx}
      $availability={dragState ? (rowAvailability ?? null) : null}
      $gridStepPx={minutePx * minuteGranularity}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {rowAssignments.map((assignment) => {
        const shift = shifts.find((s) => s.id === assignment.shiftId);
        if (!shift) return null;
        const violationLevel = violationMap?.get(assignment.id) ?? null;
        const isDragging = draggingAssignmentIdProp === assignment.id;
        return (
          <GanttShiftBlock
            key={assignment.id}
            assignment={assignment}
            shift={shift}
            member={member}
            minutePx={minutePx}
            dayStartMinute={dayStartMinute}
            violationLevel={violationLevel}
            isDragging={isDragging}
            url={buildAssignmentUrl(assignment.id)}
            onRemove={onRemove}
            onClick={onClick}
            onResize={onResize}
          />
        );
      })}
      {renderGhost()}
    </StyledMemberRow>
  );
};

// ========== メインコンポーネント ==========

export const MemberGanttView: FC<MemberGanttViewProps> = ({
  shifts,
  members,
  assignments,
  selectedDayType,
  ganttConfig = {},
  buildAssignmentUrl,
  onDropShift,
  onMoveAssignment,
  onResizeAssignment,
  onRemoveAssignment,
  onAssignmentClick,
  rowAvailabilityMap,
  violationMap,
  dragState,
}) => {
  const hourPx = ganttConfig.hourPx ?? 60;
  const minuteGranularity = ganttConfig.minuteGranularity ?? 60;
  const minutePx = hourPx / 60;

  const scrollRef = useRef<HTMLDivElement>(null);

  // dayType でフィルタ
  const filteredShifts = useMemo(() => {
    if (!selectedDayType) return shifts;
    return shifts.filter((s) => s.dayType === selectedDayType);
  }, [shifts, selectedDayType]);

  // 当日の時間範囲を計算
  const { dayStartMinute, dayEndMinute } = useMemo(() => {
    if (filteredShifts.length === 0) return { dayStartMinute: 9 * 60, dayEndMinute: 20 * 60 };
    const starts = filteredShifts.map((s) => s.startMinute);
    const ends = filteredShifts.map((s) => s.endMinute);
    const start = Math.floor(Math.min(...starts) / 30) * 30;
    const end = Math.ceil(Math.max(...ends) / 30) * 30 + 30;
    return { dayStartMinute: start, dayEndMinute: end };
  }, [filteredShifts]);

  const totalMinutes = dayEndMinute - dayStartMinute;
  const totalWidthPx = totalMinutes * minutePx;

  // グリッド目盛りを生成
  const gridTicks = useMemo(() => {
    const ticks: { minute: number; isHour: boolean }[] = [];
    for (let m = dayStartMinute; m <= dayEndMinute; m += minuteGranularity) {
      ticks.push({ minute: m, isHour: m % 60 === 0 });
    }
    return ticks;
  }, [dayStartMinute, dayEndMinute, minuteGranularity]);

  // draggingAssignmentId を React state として伝播（re-render を起こすためにprop経由）
  // 実際には MemberGanttEditor から dragState で渡される
  const draggingAssignmentIdProp = dragState?.type === 'assignment' ? dragState.assignmentId : null;

  const buildUrl = buildAssignmentUrl ?? ((id: string) => `shift-puzzle/assignments/${id}`);

  return (
    <StyledGantt>
      {/* ヘッダー行（sticky top） */}
      <div className="e-gantt-header">
        {/* 局員列ヘッダー（固定） */}
        <div className="e-member-col-header" style={{ width: MEMBER_COLUMN_WIDTH }}>
          局員
        </div>
        {/* 時間軸 */}
        <div className="e-time-axis" style={{ width: totalWidthPx }}>
          {/* 時刻ラベル */}
          <div className="e-time-labels">
            {gridTicks.map(({ minute, isHour }) => (
              <div
                key={minute}
                className={`e-tick ${isHour ? 'is-hour' : 'is-sub'}`}
                style={{ left: (minute - dayStartMinute) * minutePx }}
              >
                {isHour && <span className="e-tick-label">{minutesToTime(minute)}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ボディ（縦横スクロール） */}
      <div className="e-gantt-body" ref={scrollRef}>
        {members.map((member) => {
          const rowAssignments = assignments.filter(
            (a) => a.staffId === member.id && filteredShifts.some((s) => s.id === a.shiftId),
          );
          return (
            <div key={member.id} className="e-gantt-row">
              {/* 局員ラベル（固定列） */}
              <div className="e-member-label" style={{ width: MEMBER_COLUMN_WIDTH }}>
                <span className="e-member-name">{member.name}</span>
                {member.isNewMember && <span className="e-new-badge">新</span>}
                <span className="e-dept-badge">{member.state.department.slice(0, 2)}</span>
              </div>
              {/* ガント本体 */}
              <GanttMemberRow
                member={member}
                rowAssignments={rowAssignments}
                shifts={filteredShifts}
                dayStartMinute={dayStartMinute}
                minutePx={minutePx}
                minuteGranularity={minuteGranularity}
                totalWidthPx={totalWidthPx}
                rowAvailability={rowAvailabilityMap?.get(member.id)}
                dragState={dragState}
                violationMap={violationMap}
                draggingAssignmentIdProp={draggingAssignmentIdProp}
                buildAssignmentUrl={buildUrl}
                onDropShift={onDropShift ?? (() => { /* noop */ })}
                onDropAssignment={onMoveAssignment ?? (() => {})}
                onRemove={onRemoveAssignment ?? (() => {})}
                onClick={onAssignmentClick ?? (() => {})}
                onResize={onResizeAssignment ?? (() => {})}
              />
            </div>
          );
        })}
      </div>
    </StyledGantt>
  );
};

// ========== スタイル ==========

const StyledGantt = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-size: 0.82em;
  user-select: none;

  .e-gantt-header {
    display: flex;
    align-items: stretch;
    border-bottom: 2px solid #ddd;
    background: #f8f8f8;
    position: sticky;
    top: 0;
    z-index: 20;
    flex-shrink: 0;
  }

  .e-member-col-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    border-right: 2px solid #ddd;
    padding: 4px;
    color: #555;
    font-size: 0.85em;
    position: sticky;
    left: 0;
    z-index: 25;
    background: #f8f8f8;
  }

  .e-time-axis {
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }

  .e-time-labels {
    position: relative;
    height: 24px;
  }

  .e-tick {
    position: absolute;
    top: 0;
    height: 100%;

    &.is-hour {
      border-left: 1px solid #bbb;
    }

    &.is-sub {
      border-left: 1px solid #e0e0e0;
    }
  }

  .e-tick-label {
    position: absolute;
    left: 3px;
    top: 4px;
    font-size: 0.8em;
    color: #666;
    white-space: nowrap;
  }

  .e-gantt-body {
    flex: 1;
    overflow: auto;
  }

  .e-gantt-row {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid #eee;
    min-height: 36px;

    &:hover {
      background-color: #fafafa;
    }
  }

  .e-member-label {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px;
    border-right: 2px solid #ddd;
    position: sticky;
    left: 0;
    z-index: 10;
    background: inherit;
    min-height: 36px;

    .e-member-name {
      font-weight: 500;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .e-new-badge {
      background: #e3f2fd;
      color: #1565c0;
      border: 1px solid #90caf9;
      border-radius: 3px;
      padding: 0 3px;
      font-size: 0.75em;
      flex-shrink: 0;
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
  }
`;

// 行の可否に応じた背景・左ボーダー色
function getAvailabilityStyle(availability: RowAvailability | null) {
  if (!availability) return '';
  if (availability === 'available') return `
    border-left: 4px solid #4caf50;
    background-color: rgba(76, 175, 80, 0.06);
  `;
  if (availability === 'warning') return `
    border-left: 4px solid #ff9800;
    background-color: rgba(255, 152, 0, 0.06);
  `;
  return `
    border-left: 4px solid #f44336;
    background-color: rgba(244, 67, 54, 0.06);
  `;
}

type StyledMemberRowProps = React.HTMLAttributes<HTMLDivElement> & {
  $width: number;
  $availability: RowAvailability | null;
  /** グリッド線の周期（ピクセル）。minutePx * minuteGranularity と一致 */
  $gridStepPx: number;
};
const StyledMemberRow = styled.div<StyledMemberRowProps>`
  position: relative;
  height: 36px;
  width: ${(p) => p.$width}px;
  flex-shrink: 0;
  transition: background-color 0.1s, border-left 0.15s;
  ${(p) => getAvailabilityStyle(p.$availability)}

  /* グリッド線（時間軸ヘッダーの目盛りと同周期） */
  background-image: repeating-linear-gradient(
    to right,
    transparent,
    transparent ${(p) => p.$gridStepPx - 1}px,
    #e0e0e0 ${(p) => p.$gridStepPx - 1}px,
    #e0e0e0 ${(p) => p.$gridStepPx}px
  );

  &.is-drag-over {
    background-color: rgba(25, 118, 210, 0.08);
    outline: 2px dashed #1976d2;
    outline-offset: -2px;
  }
`;

// 違反スタイル
function getViolationStyle(violationLevel: ViolationLevel | null) {
  if (!violationLevel) return '';
  if (violationLevel === 'overlap') return `
    border: 2px solid #f44336 !important;
    background: #ffebee !important;
    animation: gantt-violation-pulse 1.5s ease-in-out infinite;
  `;
  if (violationLevel === 'unavailable') return `
    border: 2px solid #f44336 !important;
    background: #ffebee !important;
  `;
  if (violationLevel === 'outOfRange') return `
    border: 2px dashed #f44336 !important;
    background: repeating-linear-gradient(45deg, #ffebee, #ffebee 6px, #ffcdd2 6px, #ffcdd2 12px) !important;
  `;
  return `
    border: 2px dashed #ff9800 !important;
    background: #fff3e0 !important;
  `;
}

type StyledShiftBlockProps = React.HTMLAttributes<HTMLDivElement> & {
  $bg: string;
  $border: string;
  $text: string;
  $violationLevel: ViolationLevel | null;
  $isDragging: boolean;
  $isResizing: boolean;
};

const StyledShiftBlock = styled.div<StyledShiftBlockProps>`
  position: absolute;
  top: 3px;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0 10px;
  border-radius: 4px;
  border: 1px solid ${(p) => p.$border};
  background: ${(p) => p.$bg};
  color: ${(p) => p.$text};
  cursor: ${(p) => p.$isResizing ? 'ew-resize' : 'grab'};
  overflow: visible;
  box-sizing: border-box;
  transition: box-shadow 0.1s, opacity 0.1s;
  z-index: 5;
  opacity: ${(p) => p.$isDragging ? 0.4 : 1};

  ${(p) => getViolationStyle(p.$violationLevel)}

  &:hover {
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    z-index: 10;
  }

  &:hover .e-resize-handle {
    opacity: 1;
  }

  &:active {
    cursor: grabbing;
  }

  .e-block-name {
    font-size: 0.78em;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .e-badge {
    font-size: 0.68em;
    padding: 0 3px;
    border-radius: 2px;
    flex-shrink: 0;

    &.is-new {
      background: #e3f2fd;
      color: #1565c0;
    }

    &.is-senior {
      background: #e8f5e9;
      color: #2e7d32;
    }
  }

  .e-warning {
    color: #ff9800;
    font-size: 1em;
    flex-shrink: 0;
  }

  .e-remove-btn {
    padding: 0;
    font-size: 0.85em;
    opacity: 0;
    flex-shrink: 0;
    transition: opacity 0.1s;
    color: inherit;
  }

  &:hover .e-remove-btn {
    opacity: 0.7;
  }

  @keyframes gantt-violation-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4); }
    50%        { box-shadow: 0 0 0 4px rgba(244, 67, 54, 0.2); }
  }
`;

type StyledResizeHandleProps = React.HTMLAttributes<HTMLDivElement> & { side: 'left' | 'right' };
const StyledResizeHandle = styled.div<StyledResizeHandleProps>`
  position: absolute;
  top: 0;
  ${(p) => p.side === 'left' ? 'left: 0;' : 'right: 0;'}
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  opacity: 0;
  transition: opacity 0.1s, background 0.1s;
  border-radius: ${(p) => p.side === 'left' ? '4px 0 0 4px' : '0 4px 4px 0'};
  background: rgba(0, 0, 0, 0.15);
  z-index: 2;

  &:hover {
    background: rgba(0, 0, 0, 0.3);
  }
`;
StyledResizeHandle.displayName = 'ResizeHandle';

type StyledGhostBlockProps = React.HTMLAttributes<HTMLDivElement> & { $bg: string; $border: string };
const StyledGhostBlock = styled.div<StyledGhostBlockProps>`
  position: absolute;
  top: 3px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border-radius: 4px;
  border: 2px dashed ${(p) => p.$border};
  background: ${(p) => p.$bg};
  opacity: 0.55;
  pointer-events: none;
  z-index: 6;
  font-size: 0.78em;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
`;
