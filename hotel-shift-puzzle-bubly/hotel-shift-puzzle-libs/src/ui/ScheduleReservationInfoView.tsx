'use client';

import { FC } from "react";
import styled from "styled-components";
import { DailyReservationInfo, type WorkingDay } from "../domain/index.js";

type ScheduleReservationInfoViewProps = {
  /** 対象の稼働日（1日〜末日） */
  days: WorkingDay[];
  /** その勤務表の予約状況（未作成なら空表示） */
  reservationInfo?: DailyReservationInfo;
  /** 宿泊人数を変更する（空入力は undefined＝未入力に戻す） */
  onChangeGuests: (day: WorkingDay, value: number | undefined) => void;
  /** 部屋数を変更する（空入力は undefined＝未入力に戻す） */
  onChangeRooms: (day: WorkingDay, value: number | undefined) => void;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 入力欄の文字列を「0以上の整数 or undefined」に変換する */
const parse = (raw: string): number | undefined => {
  const t = raw.trim();
  if (t === "") return undefined;
  const n = Number(t);
  if (Number.isNaN(n)) return undefined;
  return Math.max(0, Math.round(n));
};

/**
 * 稼働日ごとの予約状況（宿泊人数・部屋数）を、十分な幅の表で入力するビュー。
 * 勤務表グリッドの狭い日列には表示専用の行だけを置き、実際の入力はこのバブルで行う。
 * 縦に稼働日、横に項目（宿泊人数・部屋数）を並べる。
 */
export const ScheduleReservationInfoView: FC<ScheduleReservationInfoViewProps> = ({
  days,
  reservationInfo,
  onChangeGuests,
  onChangeRooms,
}) => {
  return (
    <StyledTable>
      <thead>
        <tr>
          <th className="e-corner">稼働日</th>
          <th className="e-col">宿泊人数</th>
          <th className="e-col">部屋数</th>
        </tr>
      </thead>
      <tbody>
        {days.map((day) => {
          const wd = day.weekday;
          const guests = reservationInfo?.guestsOn(day);
          const rooms = reservationInfo?.roomsOn(day);
          return (
            <tr key={day.key}>
              <td
                className={`e-day${wd === 0 ? " is-sun" : wd === 6 ? " is-sat" : ""}`}
              >
                <span className="e-day-num">{day.day}</span>
                <span className="e-day-wd">（{WEEKDAYS[wd]}）</span>
              </td>
              <td className="e-input-cell">
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={guests ?? ""}
                  placeholder="—"
                  onChange={(e) => onChangeGuests(day, parse(e.target.value))}
                />
                <span className="e-unit">人</span>
              </td>
              <td className="e-input-cell">
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={rooms ?? ""}
                  placeholder="—"
                  onChange={(e) => onChangeRooms(day, parse(e.target.value))}
                />
                <span className="e-unit">室</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </StyledTable>
  );
};

const StyledTable = styled.table`
  border-collapse: collapse;
  font-size: 0.9em;

  th,
  td {
    border: 1px solid #eee;
    padding: 4px 10px;
    text-align: center;
    box-sizing: border-box;
  }

  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #fff8f0;
    color: #5d4037;
    font-weight: bold;
  }
  .e-corner {
    text-align: left;
  }
  .e-col {
    min-width: 96px;
  }

  .e-day {
    text-align: left;
    white-space: nowrap;
    background: #fafafa;
    font-weight: bold;
    color: #555;

    .e-day-wd {
      font-size: 0.82em;
      color: #999;
      font-weight: normal;
      margin-left: 2px;
    }
    &.is-sun .e-day-num {
      color: #d32f2f;
    }
    &.is-sat .e-day-num {
      color: #1976d2;
    }
  }

  .e-input-cell {
    input {
      width: 56px;
      text-align: right;
      border: 1px solid #e0d6cc;
      border-radius: 4px;
      padding: 3px 6px;
      font-size: 1em;
      font-variant-numeric: tabular-nums;
      outline: none;

      &:hover {
        border-color: #ceb79c;
      }
      &:focus {
        border-color: #ffb74d;
        box-shadow: 0 0 0 2px #ffe0b2;
      }
    }
    .e-unit {
      margin-left: 4px;
      font-size: 0.8em;
      color: #999;
    }
  }
`;
