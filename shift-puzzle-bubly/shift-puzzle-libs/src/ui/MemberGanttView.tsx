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
 */

import React, { FC, useRef, useMemo } from 'react';
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
import { DRAG_TYPE_SHIFT } from './ShiftPaletteView.js';

// ========== 型定義 ==========

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
  onDropShift?: (memberId: string, shiftId: string, assignedStartMinute: number, assignedEndMinute: number) => void;
  onRemoveAssignment?: (assignmentId: string) => void;
  onAssignmentClick?: (assignmentId: string) => void;
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

// ========== サブコンポーネント ==========

type GanttShiftBlockProps = {
  assignment: ShiftAssignment;
  shift: Shift;
  member: Member | undefined;
  left: number;
  width: number;
  isViolation: boolean;
  url: string;
  onRemove: (assignmentId: string) => void;
  onClick: (assignmentId: string) => void;
};

const GanttShiftBlock: FC<GanttShiftBlockProps> = ({
  assignment,
  shift,
  member,
  left,
  width,
  isViolation,
  onRemove,
  onClick,
}) => {
  const color = getTaskColor(shift.taskId);
  const isNewMember = member?.isNewMember ?? false;
  const isBreak = shift.taskId === 'task-break';
  const displayStart = minutesToTime(assignment.assignedStartMinute);
  const displayEnd = minutesToTime(assignment.assignedEndMinute);

  return (
    <StyledShiftBlock
      style={{ left, width: Math.max(width - 2, 20) }}
      $bg={color.bg}
      $border={color.border}
      $text={color.text}
      $isViolation={isViolation}
      title={`${shift.taskName} (${displayStart}–${displayEnd})`}
      onClick={() => onClick(assignment.id)}
    >
      <span className="e-block-name">
        {isBreak ? '休憩' : shift.taskName}
      </span>
      {!isBreak && (
        <span className={`e-badge ${isNewMember ? 'is-new' : 'is-senior'}`}>
          {isNewMember ? '新' : '経'}
        </span>
      )}
      {isViolation && (
        <Tooltip title="制約違反">
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
    </StyledShiftBlock>
  );
};

type GanttMemberRowProps = {
  member: Member;
  rowAssignments: ShiftAssignment[];
  shifts: readonly Shift[];
  dayStartMinute: number;
  minutePx: number;
  totalWidthPx: number;
  buildAssignmentUrl: (assignmentId: string) => string;
  onDrop: (memberId: string, shiftId: string, assignedStartMinute: number, assignedEndMinute: number) => void;
  onRemove: (assignmentId: string) => void;
  onClick: (assignmentId: string) => void;
};

const GanttMemberRow: FC<GanttMemberRowProps> = ({
  member,
  rowAssignments,
  shifts,
  dayStartMinute,
  minutePx,
  totalWidthPx,
  buildAssignmentUrl,
  onDrop,
  onRemove,
  onClick,
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_TYPE_SHIFT)) {
      e.preventDefault();
      e.currentTarget.classList.add('is-drag-over');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('is-drag-over');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('is-drag-over');
    const shiftId = e.dataTransfer.getData(DRAG_TYPE_SHIFT);
    if (!shiftId) return;

    // ドロップ行のDOM左端からのX座標を取得し、15分単位の開始時刻を計算
    const rect = e.currentTarget.getBoundingClientRect();
    const dropX = Math.max(0, e.clientX - rect.left);
    const rawMinute = dayStartMinute + dropX / minutePx;
    const snappedStartMinute = Math.round(rawMinute / 15) * 15;

    // シフトの時間長を使って終了時刻を算出
    const shift = shifts.find((s) => s.id === shiftId);
    const duration = shift ? shift.durationMinutes : 60;
    const assignedEndMinute = snappedStartMinute + duration;

    onDrop(member.id, shiftId, snappedStartMinute, assignedEndMinute);
  };

  return (
    <StyledMemberRow
      $width={totalWidthPx}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {rowAssignments.map((assignment) => {
        const shift = shifts.find((s) => s.id === assignment.shiftId);
        if (!shift) return null;
        const startMin = assignment.assignedStartMinute;
        const endMin = assignment.assignedEndMinute;
        const left = (startMin - dayStartMinute) * minutePx;
        const width = (endMin - startMin) * minutePx;
        return (
          <GanttShiftBlock
            key={assignment.id}
            assignment={assignment}
            shift={shift}
            member={member}
            left={left}
            width={width}
            isViolation={false}
            url={buildAssignmentUrl(assignment.id)}
            onRemove={onRemove}
            onClick={onClick}
          />
        );
      })}
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
  onRemoveAssignment,
  onAssignmentClick,
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

  // シフト充足サマリー（時間軸ヘッダー用）
  const fulfillmentByShift = useMemo(() => {
    const map = new Map<string, { assigned: number; required: number; minCount: number; taskName: string }>();
    for (const shift of filteredShifts) {
      const shiftAssignments = assignments.filter((a) => a.shiftId === shift.id);
      map.set(shift.id, {
        assigned: shiftAssignments.length,
        required: shift.requiredCount,
        minCount: shift.minCount,
        taskName: shift.taskName,
      });
    }
    return map;
  }, [filteredShifts, assignments]);

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
          {/* シフト充足サマリー */}
          <div className="e-fulfillment-row" style={{ position: 'relative', height: 20 }}>
            {filteredShifts.map((shift) => {
              const f = fulfillmentByShift.get(shift.id);
              if (!f || shift.requiredCount === 0) return null;
              const left = (shift.startMinute - dayStartMinute) * minutePx;
              const width = shift.durationMinutes * minutePx;
              const isFilled = f.assigned >= f.required;
              const isShortage = f.assigned < f.minCount;
              return (
                <div
                  key={shift.id}
                  className={`e-fulfillment-badge ${isFilled ? 'is-filled' : ''} ${isShortage ? 'is-shortage' : ''}`}
                  style={{ left, width: width - 2 }}
                  title={`${f.taskName}: ${f.assigned}/${f.required}名`}
                >
                  {shift.taskName.slice(0, 2)} {f.assigned}/{f.required}
                </div>
              );
            })}
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
                totalWidthPx={totalWidthPx}
                buildAssignmentUrl={buildUrl}
                onDrop={onDropShift ?? (() => { /* noop */ })}
                onRemove={onRemoveAssignment ?? (() => {})}
                onClick={onAssignmentClick ?? (() => {})}
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

  .e-fulfillment-row {
    overflow: hidden;
  }

  .e-fulfillment-badge {
    position: absolute;
    top: 2px;
    height: 16px;
    border-radius: 3px;
    font-size: 0.72em;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    white-space: nowrap;
    background: #eee;
    border: 1px solid #ccc;
    color: #666;
    cursor: default;

    &.is-filled {
      background: #e8f5e9;
      border-color: #66bb6a;
      color: #2e7d32;
    }

    &.is-shortage {
      background: #ffebee;
      border-color: #ef5350;
      color: #c62828;
      font-weight: bold;
    }
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

type StyledMemberRowProps = React.HTMLAttributes<HTMLDivElement> & { $width: number };
const StyledMemberRow = styled.div<StyledMemberRowProps>`
  position: relative;
  height: 36px;
  width: ${(p) => p.$width}px;
  flex-shrink: 0;
  transition: background-color 0.1s;

  /* 15/30分グリッド（CSS で描画） */
  background-image: repeating-linear-gradient(
    to right,
    transparent,
    transparent calc(var(--minute-px, 1px) * 14),
    #f0f0f0 calc(var(--minute-px, 1px) * 14),
    #f0f0f0 calc(var(--minute-px, 1px) * 15)
  );

  &.is-drag-over {
    background-color: rgba(25, 118, 210, 0.08);
    outline: 2px dashed #1976d2;
    outline-offset: -2px;
  }
`;

type StyledShiftBlockProps = React.HTMLAttributes<HTMLDivElement> & {
  $bg: string;
  $border: string;
  $text: string;
  $isViolation: boolean;
};

const StyledShiftBlock = styled.div<StyledShiftBlockProps>`
  position: absolute;
  top: 3px;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0 4px;
  border-radius: 4px;
  border: 1px solid ${(p) => p.$border};
  background: ${(p) => p.$bg};
  color: ${(p) => p.$text};
  cursor: pointer;
  overflow: hidden;
  box-sizing: border-box;
  transition: box-shadow 0.1s, opacity 0.1s;
  z-index: 5;

  ${(p) =>
    p.$isViolation &&
    `
    border: 2px solid #ff9800;
    background: #fff3e0;
    animation: gantt-violation-pulse 1.5s ease-in-out infinite;
  `}

  &:hover {
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    z-index: 10;
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
    0%, 100% { box-shadow: 0 0 0 0 rgba(255,152,0,0.4); }
    50%        { box-shadow: 0 0 0 4px rgba(255,152,0,0.2); }
  }
`;
