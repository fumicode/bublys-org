'use client';

import { FC } from "react";
import styled from "styled-components";
import {
  Staff,
  MonthlyStaffSchedule,
  WorkShift,
  WorkingDay,
  ScheduleAvailability,
  type ShiftCell,
} from "../domain/index.js";
import { SHIFT_BG, SHIFT_FG } from "./schedule-grid/constants.js";

type ScheduleDayViewProps = {
  /** 表示する稼働日 */
  day: WorkingDay;
  /** その日の割当を引く勤務表 */
  schedule: MonthlyStaffSchedule;
  staffList: Staff[];
  /** この勤務表で使える勤務帯（早番・中番・遅番）。横方向に並べる */
  workShifts: WorkShift[];
  /** 可能勤務帯。あれば入れない勤務帯セルを無効化する */
  availability?: ScheduleAvailability;
  /** セルの勤務割当を変更する */
  onChangeCell: (staffId: string, to: ShiftCell) => void;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 稼働日 1 日ぶんの詳細ビュー。
 * 縦にスタッフ、横に勤務帯（早番・中番・遅番）＋休みを並べた表。各スタッフのその日の割当に
 * ◯ を立て、クリックでその勤務帯へ割当（再クリックで未定へ）。可能勤務帯外のセルは無効。
 * 表の下部に、勤務帯ごとの「現在/必要」を出して必要人数が満たされているかを示す。
 */
export const ScheduleDayView: FC<ScheduleDayViewProps> = ({
  day,
  schedule,
  staffList,
  workShifts,
  availability,
  onChangeCell,
}) => {
  const wd = day.weekday;
  const countByShift = schedule.countWorkingByShift(day);
  const dayOffCount = schedule.countDayOffOn(day);

  const toggle = (staffId: string, selected: boolean, to: ShiftCell) =>
    onChangeCell(staffId, selected ? { kind: "undecided" } : to);

  return (
    <StyledTable>
      <thead>
        <tr>
          <th className="e-corner">
            スタッフ
            <span className="e-day">
              {day.label}（{WEEKDAYS[wd]}）
            </span>
          </th>
          {workShifts.map((w) => (
            <th
              key={w.id}
              className="e-shift"
              style={{ background: SHIFT_BG[w.id] ?? "#fafafa", color: SHIFT_FG[w.id] ?? "#455a64" }}
            >
              {w.name}
              <span className="e-time">{w.startTimeLabel}</span>
            </th>
          ))}
          <th className="e-shift e-off-col">休</th>
        </tr>
      </thead>

      <tbody>
        {staffList.map((staff) => {
          const status = schedule.statusOf(staff.id, day);
          const isOff = status.kind === "day-off";
          return (
            <tr key={staff.id}>
              <td className="e-staff">
                <span className="e-staff-name">{staff.name}</span>
                {staff.isEarlyShiftLeader && (
                  <span className="e-leader-badge is-early" title="早番責任者（早責）">
                    早責
                  </span>
                )}
                {staff.isNightShiftLeader && (
                  <span className="e-leader-badge is-night" title="夜番責任者（夜責）">
                    夜責
                  </span>
                )}
              </td>

              {workShifts.map((w) => {
                const selected = status.kind === "work" && status.shiftId === w.id;
                const allowed = !availability || availability.isAllowed(staff.id, w.id);
                // 入れない勤務帯は無効（ただし既に入っている場合は外せるよう操作可）
                const disabled = !allowed && !selected;
                return (
                  <td
                    key={w.id}
                    className={`e-cell${selected ? " is-on" : ""}${disabled ? " is-disabled" : ""}`}
                    style={selected ? { background: SHIFT_BG[w.id], color: SHIFT_FG[w.id] } : undefined}
                    role={disabled ? undefined : "button"}
                    title={
                      disabled
                        ? `${staff.name} は ${w.name} に入れません`
                        : `${staff.name} を ${w.name} に${selected ? "から外す" : "割り当てる"}`
                    }
                    onClick={
                      disabled
                        ? undefined
                        : () => toggle(staff.id, selected, { kind: "work", shiftId: w.id })
                    }
                  >
                    {selected ? "◯" : ""}
                  </td>
                );
              })}

              <td
                className={`e-cell e-off-col${isOff ? " is-off" : ""}`}
                role="button"
                title={`${staff.name} を${isOff ? "休みから戻す" : "休みにする"}`}
                onClick={() => toggle(staff.id, isOff, { kind: "day-off" })}
              >
                {isOff ? "休" : ""}
              </td>
            </tr>
          );
        })}
      </tbody>

      {/* 必要人数の充足（現在/必要）。達成=緑 / 不足=赤 */}
      <tfoot>
        <tr>
          <td className="e-foot-label">必要人数</td>
          {workShifts.map((w) => {
            const n = countByShift.get(w.id) ?? 0;
            const req = schedule.requiredFor(day, w.name);
            const met = n >= req;
            return (
              <td
                key={w.id}
                className={`e-foot${req > 0 ? (met ? " is-met" : " is-under") : ""}`}
                title={`${w.name}: ${n}/${req}名（${met ? "達成" : "不足"}）`}
              >
                <span className="e-cur">{n}</span>
                <span className="e-den">/{req}</span>
              </td>
            );
          })}
          <td className="e-foot e-off-col" title="休みの人数">
            {dayOffCount}
          </td>
        </tr>
      </tfoot>
    </StyledTable>
  );
};

const StyledTable = styled.table`
  border-collapse: collapse;
  font-size: 0.85em;

  th,
  td {
    border: 1px solid #eee;
    padding: 4px 8px;
    text-align: center;
    box-sizing: border-box;
  }

  .e-corner {
    background: #fafafa;
    font-weight: bold;
    color: #555;
    text-align: left;
    white-space: nowrap;

    .e-day {
      display: block;
      font-size: 0.8em;
      color: #888;
      font-weight: normal;
    }
  }

  .e-shift {
    font-weight: bold;
    min-width: 56px;

    .e-time {
      display: block;
      font-size: 0.78em;
      opacity: 0.8;
      font-weight: normal;
    }
  }
  .e-off-col {
    min-width: 40px;
  }
  .e-shift.e-off-col {
    background: #fafafa;
    color: #9e9e9e;
  }

  .e-staff {
    text-align: left;
    white-space: nowrap;

    .e-staff-name {
      font-weight: bold;
    }
    /* 責任者バッジ（早責=早番責任者 / 夜責=夜番責任者）。早番＝青系・夜番＝紫系で勤務帯色に揃える */
    .e-leader-badge {
      margin-left: 4px;
      font-size: 0.72em;
      font-weight: bold;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 4px;
      white-space: nowrap;

      &.is-early {
        background: #e3f2fd;
        color: #1565c0;
        border: 1px solid #90caf9;
      }
      &.is-night {
        background: #ede7f6;
        color: #5e35b1;
        border: 1px solid #b39ddb;
      }
    }
  }

  .e-cell {
    cursor: pointer;
    font-weight: bold;
    min-width: 56px;
    transition: box-shadow 0.1s;

    &:hover {
      box-shadow: inset 0 0 0 2px #90caf9;
    }
    &.is-off {
      background: #f5f5f5;
      color: #9e9e9e;
    }
    &.is-disabled {
      cursor: default;
      background: repeating-linear-gradient(
        45deg,
        #fafafa,
        #fafafa 4px,
        #f0f0f0 4px,
        #f0f0f0 8px
      );
    }
    &.is-disabled:hover {
      box-shadow: none;
    }
  }

  /* 必要人数フッタ */
  .e-foot-label {
    text-align: right;
    font-weight: bold;
    color: #607d8b;
    background: #fafafa;
    white-space: nowrap;
  }
  .e-foot {
    font-weight: bold;
    font-variant-numeric: tabular-nums;
    background: #fbfbfb;

    .e-cur {
      font-size: 1em;
    }
    .e-den {
      font-size: 0.75em;
      opacity: 0.7;
    }
    &.is-met {
      color: #2e7d32;
      background: #e8f5e9;
    }
    &.is-under {
      color: #c62828;
      background: #ffebee;
    }
  }
  .e-foot.e-off-col {
    color: #616161;
  }
`;
