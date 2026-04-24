'use client';

import { FC, useMemo } from "react";
import styled from "styled-components";
import { Member, Shift, TimeSchedule, type DayType } from "../domain/index.js";
import PersonIcon from "@mui/icons-material/Person";
import { ObjectView } from "@bublys-org/bubbles-ui";
import { DAY_TYPE_ORDER } from "../data/sampleData.js";

// ========== 型定義 ==========

type MemberAvailabilityViewProps = {
  member: Member;
  shifts: readonly Shift[];
  timeSchedules: readonly TimeSchedule[];
};

/** 1ブロックの状態 */
type BlockStatus =
  | { kind: 'unavailable' }                                        // 参加不可（対応シフトがない／範囲外）
  | { kind: 'free' }                                               // 参加可能だが未配置（=空き）
  | { kind: 'assigned'; taskName: string; shiftId: string };       // 配置中

type DayTypeLane = {
  dayType: DayType;
  timeSchedule: TimeSchedule;
  blocks: BlockStatus[];                // 15分ブロック配列（startMinute起点）
  hourLabels: { blockIndex: number; label: string }[];
};

// ========== 計算ロジック ==========

function computeLanes(
  member: Member,
  shifts: readonly Shift[],
  timeSchedules: readonly TimeSchedule[],
): DayTypeLane[] {
  const lanes: DayTypeLane[] = [];

  for (const dayType of DAY_TYPE_ORDER) {
    const ts = timeSchedules.find((t) => t.dayType === dayType);
    if (!ts) continue;

    const totalBlocks = ts.totalBlocks;
    const blocks: BlockStatus[] = new Array(totalBlocks)
      .fill(null)
      .map(() => ({ kind: 'unavailable' as const }));

    // Step 1: DayType 全ブロックを走査し、member.isAvailableAt で参加可能ブロックを "free" に
    for (let b = 0; b < totalBlocks; b++) {
      const minute = ts.startMinute + b * 15;
      if (member.isAvailableAt(dayType, minute)) {
        blocks[b] = { kind: 'free' };
      }
    }

    // Step 2: 同 DayType の各 shift で実配置されているブロックを "assigned" に上書き
    const dayShifts = shifts.filter((s) => s.dayType === dayType);
    for (const shift of dayShifts) {
      const range = shift.validBlockRange({ startMinute: ts.startMinute });
      for (let b = range.start; b < range.end; b++) {
        if (b < 0 || b >= totalBlocks) continue;
        const assignedUsers = shift.blockList.getUsersAt(b);
        if (assignedUsers.includes(member.id)) {
          blocks[b] = {
            kind: 'assigned',
            taskName: shift.taskName ?? shift.taskId,
            shiftId: shift.id,
          };
        }
      }
    }

    const hourLabels: { blockIndex: number; label: string }[] = [];
    for (let b = 0; b <= totalBlocks; b++) {
      const minute = ts.startMinute + b * 15;
      if (minute % 60 === 0) {
        const h = Math.floor(minute / 60);
        hourLabels.push({ blockIndex: b, label: `${String(h).padStart(2, '0')}:00` });
      }
    }

    lanes.push({ dayType, timeSchedule: ts, blocks, hourLabels });
  }

  return lanes;
}

// ========== コンポーネント ==========

export const MemberAvailabilityView: FC<MemberAvailabilityViewProps> = ({
  member,
  shifts,
  timeSchedules,
}) => {
  const lanes = useMemo(
    () => computeLanes(member, shifts, timeSchedules),
    [member, shifts, timeSchedules],
  );

  const availableMinutes = lanes.reduce(
    (sum, l) => sum + l.blocks.filter((b) => b.kind !== 'unavailable').length * 15,
    0,
  );
  const availableHoursStr = (availableMinutes / 60).toFixed(1);

  const assignedBlockCount = lanes.reduce(
    (sum, l) => sum + l.blocks.filter((b) => b.kind === 'assigned').length,
    0,
  );
  const freeBlockCount = lanes.reduce(
    (sum, l) => sum + l.blocks.filter((b) => b.kind === 'free').length,
    0,
  );

  return (
    <StyledContainer>
      <header className="mv-header">
        <ObjectView
          type="Member"
          url={`shift-puzzle/members/${member.id}`}
          label={member.name}
          draggable
        >
          <h3 className="mv-name">
            <PersonIcon fontSize="small" />
            {member.name}
            {member.isNewMember && <span className="mv-badge mv-badge--new">新入生</span>}
          </h3>
        </ObjectView>
        <span className="mv-dept">{member.department}</span>
      </header>

      <div className="mv-stats">
        <div className="mv-stat">
          <span className="mv-stat-label">参加可能時間</span>
          <span className="mv-stat-value">{availableHoursStr} h</span>
        </div>
        <div className="mv-stat">
          <span className="mv-stat-label">配置中(15分)</span>
          <span className="mv-stat-value">{assignedBlockCount}</span>
        </div>
        <div className="mv-stat">
          <span className="mv-stat-label">空き(15分)</span>
          <span className="mv-stat-value">{freeBlockCount}</span>
        </div>
      </div>

      <div className="mv-legend">
        <LegendItem color="#cfd8dc" label="不可" hatched />
        <LegendItem color="#c5e1a5" label="空き" />
        <LegendItem color="#90caf9" label="配置中" />
      </div>

      <div className="mv-lanes">
        {lanes.map((lane) => (
          <LaneView key={lane.dayType} lane={lane} />
        ))}
      </div>
    </StyledContainer>
  );
};

// ========== 凡例 ==========

const LegendItem: FC<{ color: string; label: string; hatched?: boolean }> = ({
  color,
  label,
  hatched,
}) => (
  <span className="mv-legend-item">
    <span
      className={`mv-legend-swatch ${hatched ? 'is-hatched' : ''}`}
      style={{ background: color }}
    />
    {label}
  </span>
);

// ========== レーン（dayType毎のタイムライン） ==========

const CELL_WIDTH = 12;

const LaneView: FC<{ lane: DayTypeLane }> = ({ lane }) => {
  const { dayType, timeSchedule, blocks, hourLabels } = lane;
  const width = blocks.length * CELL_WIDTH;

  const runs = useMemo(() => buildRuns(blocks), [blocks]);

  return (
    <div className="lane">
      <div className="lane-label">
        <div className="lane-label-main">{dayType}</div>
        <div className="lane-label-sub">
          {timeSchedule.startTime}–{timeSchedule.endTime}
        </div>
      </div>
      <div className="lane-timeline" style={{ width }}>
        <div className="lane-cells">
          {blocks.map((b, i) => (
            <div
              key={i}
              className={`cell cell--${b.kind}`}
              style={{ width: CELL_WIDTH }}
              title={cellTitle(b, timeSchedule.startMinute + i * 15)}
            />
          ))}
        </div>

        <div className="lane-runs">
          {runs.map((r, i) => {
            if (r.status.kind !== 'assigned' && r.status.kind !== 'free') return null;
            const left = r.startBlock * CELL_WIDTH;
            const w = (r.endBlock - r.startBlock) * CELL_WIDTH;
            if (w < 28) return null;
            return (
              <div
                key={i}
                className={`run-label run-label--${r.status.kind}`}
                style={{ left, width: w }}
              >
                {r.status.kind === 'assigned' ? r.status.taskName : '空き'}
              </div>
            );
          })}
        </div>

        <div className="lane-ticks">
          {hourLabels.map((h) => (
            <div
              key={h.blockIndex}
              className="tick"
              style={{ left: h.blockIndex * CELL_WIDTH }}
            >
              <span className="tick-label">{h.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

type Run = {
  startBlock: number;
  endBlock: number;
  status: BlockStatus;
};

function buildRuns(blocks: BlockStatus[]): Run[] {
  if (blocks.length === 0) return [];
  const runs: Run[] = [];
  let start = 0;
  for (let i = 1; i <= blocks.length; i++) {
    const prev = blocks[i - 1];
    const cur = i < blocks.length ? blocks[i] : null;
    if (!cur || !sameStatus(prev, cur)) {
      runs.push({ startBlock: start, endBlock: i, status: prev });
      start = i;
    }
  }
  return runs;
}

function sameStatus(a: BlockStatus, b: BlockStatus): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'assigned' && b.kind === 'assigned') return a.shiftId === b.shiftId;
  return true;
}

function cellTitle(b: BlockStatus, minute: number): string {
  const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
  switch (b.kind) {
    case 'unavailable':
      return `${time} 参加不可`;
    case 'free':
      return `${time} 空き`;
    case 'assigned':
      return `${time} ${b.taskName}`;
  }
}

// ========== スタイル ==========

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;

  .mv-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  .mv-name {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 1.1em;
    color: #263238;
    cursor: grab;
  }
  .mv-badge {
    padding: 1px 6px;
    border-radius: 10px;
    font-size: 0.7em;
    font-weight: 600;
    &--new {
      background: #ffe082;
      color: #6d4c00;
    }
  }
  .mv-dept {
    color: #607d8b;
    font-size: 0.85em;
    padding: 1px 8px;
    background: #eceff1;
    border-radius: 10px;
  }

  .mv-stats {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    padding: 8px 12px;
    background: #f5f7fa;
    border-radius: 6px;
  }
  .mv-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .mv-stat-label {
    font-size: 0.72em;
    color: #78909c;
  }
  .mv-stat-value {
    font-size: 0.95em;
    font-weight: 600;
    color: #263238;
  }

  .mv-legend {
    display: flex;
    gap: 16px;
    font-size: 0.78em;
    color: #546e7a;
  }
  .mv-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .mv-legend-swatch {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 2px;
    border: 1px solid rgba(0,0,0,0.08);
    &.is-hatched {
      background-image: repeating-linear-gradient(
        45deg,
        rgba(0,0,0,0.15) 0,
        rgba(0,0,0,0.15) 2px,
        transparent 2px,
        transparent 4px
      );
    }
  }

  .mv-lanes {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .lane {
    display: flex;
    gap: 10px;
    align-items: stretch;
  }
  .lane-label {
    flex: 0 0 96px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 4px 8px;
    background: #fafafa;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }
  .lane-label-main {
    font-weight: 600;
    font-size: 0.88em;
    color: #37474f;
  }
  .lane-label-sub {
    font-size: 0.72em;
    color: #78909c;
  }

  .lane-timeline {
    position: relative;
    height: 48px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    background: #fff;
  }
  .lane-cells {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 18px;
    display: flex;
  }
  .cell {
    height: 100%;
    border-right: 1px solid rgba(255,255,255,0.4);
    box-sizing: border-box;
    &--unavailable {
      background: #cfd8dc;
      background-image: repeating-linear-gradient(
        45deg,
        rgba(0,0,0,0.08) 0,
        rgba(0,0,0,0.08) 2px,
        transparent 2px,
        transparent 5px
      );
    }
    &--free {
      background: #c5e1a5;
    }
    &--assigned {
      background: #90caf9;
    }
  }
  .lane-runs {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 18px;
    pointer-events: none;
  }
  .run-label {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    padding: 0 4px;
    font-size: 0.72em;
    color: #1a237e;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    &--free {
      color: #33691e;
      font-style: italic;
    }
  }
  .lane-ticks {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 18px;
    border-top: 1px dashed #e0e0e0;
  }
  .tick {
    position: absolute;
    top: 0;
    bottom: 0;
    border-left: 1px solid #e0e0e0;
  }
  .tick-label {
    position: absolute;
    top: 1px;
    left: 2px;
    font-size: 0.65em;
    color: #90a4ae;
    font-variant-numeric: tabular-nums;
  }
`;
