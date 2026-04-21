'use client';

/**
 * TaskSelectionPanelView — タスク選択パネル（ブラシ選択UI）
 *
 * Excelの塗りつぶし色選択と同概念。
 * シフトカードをクリックして「アクティブブラシ」として選択し、
 * PrimitiveGanttView でセルをクリック/ドラッグして配置する。
 * D&D 機能なし（プリミティブUI専用）。
 */

import React, { FC } from 'react';
import styled from 'styled-components';
import { Shift, TimeSchedule, type DayType } from '../domain/index.js';
import { DAY_TYPE_ORDER } from '../data/sampleData.js';

// ========== 型定義 ==========

export type TaskSelectionPanelViewProps = {
  shifts: readonly Shift[];
  timeSchedules: readonly TimeSchedule[];
  /** 各シフトの現在配置人数 (shiftId → count) */
  assignedCountMap?: Map<string, number>;
  /** 現在選択中のシフトID（アクティブブラシ） */
  activeShiftId: string | null;
  /** 表示するdayTypeを絞る（未指定時は全日程） */
  filterDayType?: DayType;
  onSelectDayType?: (dayType: DayType | undefined) => void;
  /** シフトカードをクリックしてアクティブブラシとして選択 */
  onSelectShift?: (shiftId: string | null) => void;
};

// ========== スタイル定数 ==========

const TASK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'task-reception': { bg: '#e3f2fd', border: '#1976d2', text: '#0d47a1' },
  'task-setup':     { bg: '#e8f5e9', border: '#388e3c', text: '#1b5e20' },
  'task-teardown':  { bg: '#fce4ec', border: '#c62828', text: '#b71c1c' },
  'task-mc':        { bg: '#f3e5f5', border: '#7b1fa2', text: '#4a148c' },
  'task-record':    { bg: '#fff8e1', border: '#f57f17', text: '#e65100' },
  'task-general':   { bg: '#f5f5f5', border: '#757575', text: '#212121' },
  'task-break':     { bg: '#e0f7fa', border: '#0097a7', text: '#006064' },
};
const DEFAULT_COLOR = { bg: '#f0f4ff', border: '#5c6bc0', text: '#283593' };

// ========== コンポーネント ==========

export const TaskSelectionPanelView: FC<TaskSelectionPanelViewProps> = ({
  shifts,
  timeSchedules: _timeSchedules,
  assignedCountMap,
  activeShiftId,
  filterDayType,
  onSelectDayType,
  onSelectShift,
}) => {
  const filtered = filterDayType
    ? shifts.filter((s) => s.dayType === filterDayType)
    : shifts;

  // dayTypeでグループ化
  const grouped = DAY_TYPE_ORDER.reduce((acc, dt) => {
    const dayShifts = filtered.filter((s) => s.dayType === dt);
    if (dayShifts.length > 0) acc[dt] = dayShifts;
    return acc;
  }, {} as Partial<Record<DayType, Shift[]>>);

  const handleShiftClick = (shiftId: string) => {
    if (activeShiftId === shiftId) {
      onSelectShift?.(null); // 同じカードをクリックで選択解除
    } else {
      onSelectShift?.(shiftId);
    }
  };

  return (
    <StyledPanel>
      {/* ヘッダー */}
      <div className="e-panel-header">
        <span className="e-panel-title">タスク選択</span>
        {activeShiftId && (
          <button className="e-clear-btn" onClick={() => onSelectShift?.(null)}>
            解除
          </button>
        )}
      </div>

      {/* dayType フィルター */}
      <div className="e-day-filter">
        <button
          className={`e-day-btn ${!filterDayType ? 'is-active' : ''}`}
          onClick={() => onSelectDayType?.(undefined)}
        >
          全日程
        </button>
        {DAY_TYPE_ORDER.map((dt) => (
          <button
            key={dt}
            className={`e-day-btn ${filterDayType === dt ? 'is-active' : ''}`}
            onClick={() => onSelectDayType?.(dt)}
          >
            {dt}
          </button>
        ))}
      </div>

      {/* シフトリスト */}
      <div className="e-shift-list">
        {Object.entries(grouped).map(([dayType, dayShifts]) => (
          <div key={dayType} className="e-day-group">
            <div className="e-day-label">{dayType}</div>
            {(dayShifts as Shift[]).map((shift) => {
              const assignedCount = assignedCountMap?.get(shift.id) ?? 0;
              const isFilled = assignedCount >= shift.requiredCount;
              const isShortage = shift.requiredCount > 0 && assignedCount < shift.minCount;
              const isActive = activeShiftId === shift.id;
              const color = TASK_COLORS[shift.taskId] ?? DEFAULT_COLOR;

              return (
                <StyledShiftCard
                  key={shift.id}
                  $bg={color.bg}
                  $border={color.border}
                  $text={color.text}
                  $isActive={isActive}
                  onClick={() => handleShiftClick(shift.id)}
                  title="クリックしてブラシとして選択"
                >
                  <div className="e-card-header">
                    <span className="e-task-name">{shift.taskName}</span>
                    <span className="e-time-range">
                      {shift.startTime}–{shift.endTime}
                    </span>
                  </div>
                  <div className="e-card-footer">
                    <span className="e-dept">{shift.responsibleDepartment}</span>
                    {shift.requiredCount > 0 && (
                      <span
                        className={`e-count ${isFilled ? 'is-filled' : ''} ${isShortage ? 'is-shortage' : ''}`}
                      >
                        {assignedCount}/{shift.requiredCount}名
                      </span>
                    )}
                  </div>
                  {isActive && <div className="e-active-indicator" />}
                </StyledShiftCard>
              );
            })}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="e-empty">表示するシフトがありません</div>
        )}
      </div>
    </StyledPanel>
  );
};

// ========== スタイル ==========

const StyledPanel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-size: 0.85em;

  .e-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    border-bottom: 2px solid #ddd;
    flex-shrink: 0;
  }

  .e-panel-title {
    font-weight: bold;
    font-size: 0.9em;
    color: #444;
  }

  .e-clear-btn {
    padding: 2px 8px;
    border: 1px solid #ccc;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    font-size: 0.78em;
    color: #666;

    &:hover {
      background: #f5f5f5;
    }
  }

  .e-day-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 8px;
    border-bottom: 1px solid #eee;
    flex-shrink: 0;
  }

  .e-day-btn {
    padding: 2px 8px;
    border: 1px solid #ccc;
    border-radius: 12px;
    background: #fff;
    cursor: pointer;
    font-size: 0.82em;
    color: #555;
    transition: background 0.1s, border-color 0.1s;

    &:hover {
      background: #f5f5f5;
    }

    &.is-active {
      background: #1976d2;
      border-color: #1976d2;
      color: #fff;
    }
  }

  .e-shift-list {
    flex: 1;
    overflow-y: auto;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .e-day-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .e-day-label {
    font-size: 0.78em;
    font-weight: bold;
    color: #888;
    padding: 2px 4px;
    border-bottom: 1px solid #eee;
    margin-bottom: 2px;
  }

  .e-empty {
    text-align: center;
    color: #aaa;
    padding: 24px;
    font-size: 0.9em;
  }
`;

type StyledShiftCardProps = React.HTMLAttributes<HTMLDivElement> & {
  $bg: string;
  $border: string;
  $text: string;
  $isActive: boolean;
};
const StyledShiftCard = styled.div<StyledShiftCardProps>`
  position: relative;
  padding: 6px 8px;
  border: 2px solid ${(p) => p.$isActive ? p.$border : 'transparent'};
  border-radius: 6px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$text};
  cursor: pointer;
  transition: box-shadow 0.12s, border-color 0.12s, transform 0.1s;
  outline: ${(p) => p.$isActive ? `2px solid ${p.$border}` : 'none'};
  outline-offset: 1px;

  &:hover {
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  .e-card-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 4px;
  }

  .e-task-name {
    font-weight: 600;
    font-size: 0.92em;
  }

  .e-time-range {
    font-size: 0.78em;
    opacity: 0.75;
    white-space: nowrap;
  }

  .e-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 3px;
  }

  .e-dept {
    font-size: 0.72em;
    opacity: 0.7;
  }

  .e-count {
    font-size: 0.78em;
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(255,255,255,0.6);
    border: 1px solid rgba(0,0,0,0.08);

    &.is-filled {
      background: #e8f5e9;
      color: #2e7d32;
      border-color: #a5d6a7;
    }

    &.is-shortage {
      background: #ffebee;
      color: #c62828;
      border-color: #ef9a9a;
      font-weight: bold;
    }
  }

  .e-active-indicator {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${(p) => p.$border};
  }
`;
