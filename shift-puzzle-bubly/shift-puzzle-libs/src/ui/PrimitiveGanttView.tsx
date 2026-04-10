'use client';

/**
 * PrimitiveGanttView — セルグリッド型ガント（プリミティブUI）
 *
 * 既存の MemberGanttView（D&Dブロック操作）とは別コンポーネント。
 * Excelのようにセル単位でクリック/ドラッグして局員を配置する。
 *
 * レンダリング計算:
 *   displayCells per shift = durationMinutes / minuteGranularity
 *   セル幅 = hourPx / (60 / minuteGranularity)
 *   displayCellIndex → blockIndex変換:
 *     blocksPerCell = minuteGranularity / 15
 *     startBlock = displayCellIndex * blocksPerCell
 */

import React, { FC, useMemo, useState, useCallback } from 'react';
import styled from 'styled-components';
import { Shift, TimeSchedule, Member, type DayType } from '../domain/index.js';
import { type GanttConfig } from './MemberGanttView.js';

// ========== 型定義 ==========

export type PrimitiveGanttViewProps = {
  shifts: readonly Shift[];
  timeSchedules: readonly TimeSchedule[];
  members: readonly Member[];
  selectedDayType?: DayType;
  ganttConfig?: GanttConfig;
  /** 選択中のブラシ（シフトID） */
  activeShiftId: string | null;
  onCellClick?: (shiftId: string, memberId: string, blockIndex: number) => void;
  /** ドラッグ範囲確定時 (startBlock 以上 endBlock 未満) */
  onCellDragRange?: (shiftId: string, memberId: string, startBlock: number, endBlock: number) => void;
  /** "shiftId:memberId" → boolean (true=violation) */
  violationMap?: Map<string, boolean>;
};

// ========== 定数 ==========

const MEMBER_COLUMN_WIDTH = 130;
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

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ========== セル塗りつぶし判定 ==========

function isCellFilled(
  shift: Shift,
  memberId: string,
  displayCellIndex: number,
  minuteGranularity: number,
): boolean {
  const blocksPerCell = minuteGranularity / 15;
  const startBlock = displayCellIndex * blocksPerCell;
  const bl = shift.blockList;
  for (let b = startBlock; b < startBlock + blocksPerCell; b++) {
    if (bl.hasUser(b, memberId)) return true;
  }
  return false;
}

// ========== ShiftHeaderRow ==========

type ShiftHeaderRowProps = {
  shift: Shift;
  cellWidth: number;
  displayCells: number;
  minuteGranularity: number;
};

const ShiftHeaderRow: FC<ShiftHeaderRowProps> = ({
  shift,
  cellWidth,
  displayCells,
  minuteGranularity,
}) => {
  const color = getTaskColor(shift.taskId);
  const totalWidth = cellWidth * displayCells;

  return (
    <StyledShiftHeader
      $bg={color.bg}
      $border={color.border}
      $text={color.text}
      style={{ width: totalWidth }}
    >
      <span className="e-shift-name">{shift.taskName}</span>
      <span className="e-shift-time">{shift.startTime}–{shift.endTime}</span>
      <div className="e-time-cells">
        {Array.from({ length: displayCells }).map((_, i) => {
          const minute = shift.startMinute + i * minuteGranularity;
          return (
            <div key={i} className="e-time-cell" style={{ width: cellWidth }}>
              <span className="e-time-label">{minutesToTime(minute)}</span>
            </div>
          );
        })}
      </div>
    </StyledShiftHeader>
  );
};

// ========== MemberShiftRow ==========

type DragInfo = {
  shiftId: string;
  memberId: string;
  startCell: number;
  currentCell: number;
  mode: 'add' | 'remove';
};

type MemberShiftRowProps = {
  member: Member;
  shift: Shift;
  cellWidth: number;
  displayCells: number;
  minuteGranularity: number;
  isViolation: boolean;
  activeBrush: boolean;
  dragInfo: DragInfo | null;
  onPointerDown: (shiftId: string, memberId: string, cellIndex: number, e: React.PointerEvent) => void;
  onPointerEnter: (shiftId: string, memberId: string, cellIndex: number) => void;
  onPointerUp: () => void;
};

const MemberShiftRow: FC<MemberShiftRowProps> = ({
  member,
  shift,
  cellWidth,
  displayCells,
  minuteGranularity,
  isViolation,
  activeBrush,
  dragInfo,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
}) => {
  const color = getTaskColor(shift.taskId);

  const isInDragPreview = (cellIndex: number): boolean => {
    if (!dragInfo || dragInfo.shiftId !== shift.id || dragInfo.memberId !== member.id) return false;
    const lo = Math.min(dragInfo.startCell, dragInfo.currentCell);
    const hi = Math.max(dragInfo.startCell, dragInfo.currentCell);
    return cellIndex >= lo && cellIndex <= hi;
  };

  return (
    <StyledMemberShiftRow $activeBrush={activeBrush}>
      {Array.from({ length: displayCells }).map((_, cellIndex) => {
        const filled = isCellFilled(shift, member.id, cellIndex, minuteGranularity);
        const inPreview = isInDragPreview(cellIndex);
        const previewMode = dragInfo?.mode ?? 'add';

        return (
          <StyledCell
            key={cellIndex}
            $width={cellWidth}
            $filled={filled}
            $inPreview={inPreview}
            $previewMode={previewMode}
            $bg={color.bg}
            $border={color.border}
            $isViolation={isViolation}
            $activeBrush={activeBrush}
            onPointerDown={(e) => onPointerDown(shift.id, member.id, cellIndex, e)}
            onPointerEnter={() => onPointerEnter(shift.id, member.id, cellIndex)}
            onPointerUp={onPointerUp}
          />
        );
      })}
    </StyledMemberShiftRow>
  );
};

// ========== メインコンポーネント ==========

export const PrimitiveGanttView: FC<PrimitiveGanttViewProps> = ({
  shifts,
  timeSchedules: _timeSchedules,
  members,
  selectedDayType,
  ganttConfig = {},
  activeShiftId,
  onCellClick,
  onCellDragRange,
  violationMap,
}) => {
  const hourPx = ganttConfig.hourPx ?? 60;
  const minuteGranularity = ganttConfig.minuteGranularity ?? 15;
  const cellWidth = (hourPx / 60) * minuteGranularity;

  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);


  // dayType でフィルタ
  const filteredShifts = useMemo(() => {
    if (!selectedDayType) return shifts;
    return shifts.filter((s) => s.dayType === selectedDayType);
  }, [shifts, selectedDayType]);

  const handlePointerDown = useCallback(
    (shiftId: string, memberId: string, cellIndex: number, e: React.PointerEvent) => {
      if (!activeShiftId || activeShiftId !== shiftId) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      const shift = filteredShifts.find((s) => s.id === shiftId);
      if (!shift) return;

      const blocksPerCell = minuteGranularity / 15;
      const startBlock = cellIndex * blocksPerCell;
      const filled = shift.blockList.hasUser(startBlock, memberId);

      setDragInfo({
        shiftId,
        memberId,
        startCell: cellIndex,
        currentCell: cellIndex,
        mode: filled ? 'remove' : 'add',
      });
    },
    [activeShiftId, filteredShifts, minuteGranularity]
  );

  const handlePointerEnter = useCallback(
    (shiftId: string, memberId: string, cellIndex: number) => {
      setDragInfo((prev) => {
        if (!prev || prev.shiftId !== shiftId || prev.memberId !== memberId) return prev;
        return { ...prev, currentCell: cellIndex };
      });
    },
    []
  );

  const handlePointerUp = useCallback(() => {
    if (!dragInfo) return;
    const { shiftId, memberId, startCell, currentCell, mode } = dragInfo;
    const lo = Math.min(startCell, currentCell);
    const hi = Math.max(startCell, currentCell);

    if (lo === hi) {
      // 単セルクリック
      const blocksPerCell = minuteGranularity / 15;
      const blockIndex = lo * blocksPerCell;
      onCellClick?.(shiftId, memberId, blockIndex);
    } else {
      // 範囲ドラッグ（modeに関わらずonCellDragRangeで通知、外部でadd/remove判定）
      const blocksPerCell = minuteGranularity / 15;
      const startBlock = lo * blocksPerCell;
      const endBlock = (hi + 1) * blocksPerCell;
      if (mode === 'add') {
        onCellDragRange?.(shiftId, memberId, startBlock, endBlock);
      } else {
        // remove: 各ブロックを onCellClick で通知（外部が remove として扱う）
        for (let b = startBlock; b < endBlock; b++) {
          onCellClick?.(shiftId, memberId, b);
        }
      }
    }

    setDragInfo(null);
  }, [dragInfo, minuteGranularity, onCellClick, onCellDragRange]);

  if (filteredShifts.length === 0) {
    return (
      <StyledGantt>
        <div className="e-empty">表示するシフトがありません</div>
      </StyledGantt>
    );
  }

  return (
    <StyledGantt>
      {filteredShifts.map((shift) => {
        const displayCells = Math.ceil(shift.durationMinutes / minuteGranularity);
        const isActiveBrush = activeShiftId === shift.id;

        return (
          <div key={shift.id} className="e-shift-section">
            {/* シフトヘッダー */}
            <div className="e-shift-header-row">
              <div className="e-member-col-header" style={{ width: MEMBER_COLUMN_WIDTH }} />
              <ShiftHeaderRow
                shift={shift}
                cellWidth={cellWidth}
                displayCells={displayCells}
                minuteGranularity={minuteGranularity}
              />
            </div>

            {/* 局員行 */}
            {members.map((member) => {
              const violationKey = `${shift.id}:${member.id}`;
              const isViolation = violationMap?.get(violationKey) ?? false;

              return (
                <div key={member.id} className="e-gantt-row">
                  {/* 局員ラベル（固定列） */}
                  <div className="e-member-label" style={{ width: MEMBER_COLUMN_WIDTH }}>
                    <span className="e-member-name">{member.name}</span>
                    {member.isNewMember && <span className="e-new-badge">新</span>}
                    <span className="e-dept-badge">{member.state.department.slice(0, 2)}</span>
                  </div>
                  {/* セルグリッド行 */}
                  <MemberShiftRow
                    member={member}
                    shift={shift}
                    cellWidth={cellWidth}
                    displayCells={displayCells}
                    minuteGranularity={minuteGranularity}
                    isViolation={isViolation}
                    activeBrush={isActiveBrush}
                    dragInfo={dragInfo}
                    onPointerDown={handlePointerDown}
                    onPointerEnter={handlePointerEnter}
                    onPointerUp={handlePointerUp}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </StyledGantt>
  );
};

// ========== スタイル ==========

const StyledGantt = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
  font-size: 0.82em;
  user-select: none;

  .e-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #aaa;
    font-size: 1.1em;
  }

  .e-shift-section {
    margin-bottom: 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
  }

  .e-shift-header-row {
    display: flex;
    align-items: stretch;
    background: #f8f8f8;
    border-bottom: 1px solid #ddd;
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
    background: #f8f8f8;
  }

  .e-gantt-row {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid #f0f0f0;
    min-height: 28px;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background-color: #fafafa;
    }
  }

  .e-member-label {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-right: 2px solid #ddd;
    position: sticky;
    left: 0;
    z-index: 10;
    background: inherit;
    min-height: 28px;

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

type StyledShiftHeaderProps = React.HTMLAttributes<HTMLDivElement> & {
  $bg: string;
  $border: string;
  $text: string;
};
const StyledShiftHeader = styled.div<StyledShiftHeaderProps>`
  display: flex;
  flex-direction: column;
  padding: 2px 4px;
  background: ${(p) => p.$bg};
  border-left: 3px solid ${(p) => p.$border};
  color: ${(p) => p.$text};
  flex-shrink: 0;

  .e-shift-name {
    font-weight: 600;
    font-size: 0.9em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .e-shift-time {
    font-size: 0.78em;
    opacity: 0.75;
  }

  .e-time-cells {
    display: flex;
    margin-top: 2px;
  }

  .e-time-cell {
    flex-shrink: 0;
    border-left: 1px solid rgba(0,0,0,0.1);
    font-size: 0.68em;
    color: rgba(0,0,0,0.5);
    padding-left: 2px;
    height: 12px;
    overflow: hidden;

    .e-time-label {
      white-space: nowrap;
    }
  }
`;

const StyledMemberShiftRow = styled.div<React.HTMLAttributes<HTMLDivElement> & { $activeBrush: boolean }>`
  display: flex;
  align-items: center;
  height: 28px;
  cursor: ${(p) => p.$activeBrush ? 'crosshair' : 'default'};
`;

type StyledCellProps = React.HTMLAttributes<HTMLDivElement> & {
  $width: number;
  $filled: boolean;
  $inPreview: boolean;
  $previewMode: 'add' | 'remove';
  $bg: string;
  $border: string;
  $isViolation: boolean;
  $activeBrush: boolean;
};

const StyledCell = styled.div<StyledCellProps>`
  width: ${(p) => p.$width}px;
  height: 22px;
  flex-shrink: 0;
  border-right: 1px solid #e8e8e8;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  box-sizing: border-box;
  cursor: ${(p) => p.$activeBrush ? 'crosshair' : 'default'};
  transition: background-color 0.05s;

  background-color: ${(p) => {
    if (p.$inPreview) {
      return p.$previewMode === 'add' ? `${p.$border}55` : '#ffebee';
    }
    if (p.$filled) {
      return p.$isViolation ? '#ffebee' : p.$bg;
    }
    return 'transparent';
  }};

  border: ${(p) => {
    if (p.$filled && p.$isViolation) return '1px solid #f44336';
    if (p.$filled) return `1px solid ${p.$border}`;
    return '1px solid transparent';
  }};

  border-right: 1px solid #e8e8e8;

  &:hover {
    background-color: ${(p) => {
      if (!p.$activeBrush) return p.$filled ? p.$bg : 'transparent';
      return p.$filled ? `${p.$border}44` : `${p.$border}22`;
    }};
  }
`;
